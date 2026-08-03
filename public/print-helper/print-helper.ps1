# Cardapio Cloud - Agente de impressao RAW ESC/POS
# ------------------------------------------------------------------
# Pequeno servidor HTTP local que recebe bytes ESC/POS (em base64) do
# navegador e os envia em modo RAW direto para a impressora termica,
# contornando a renderizacao grafica (EMF) do Windows que trava em
# varias impressoras termicas clone.
#
# Uso: clique duplo em iniciar-impressora.vbs (ou rode este .ps1).
# O app web faz POST em http://127.0.0.1:9100/print com { data: <base64> }.

param(
  [int]$Port = 9100,
  [string[]]$PrinterName = @() # vazio = auto-detecta ate duas impressoras termicas
)

$ErrorActionPreference = "Stop"

# --- P/Invoke winspool: envio RAW direto ao spooler ---------------------
Add-Type @'
using System;
using System.Runtime.InteropServices;

public class RawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

  public static string SendBytes(string printerName, byte[] bytes) {
    IntPtr h;
    if (!OpenPrinter(printerName, out h, IntPtr.Zero))
      return "ERRO OpenPrinter: " + Marshal.GetLastWin32Error();
    DOCINFOA di = new DOCINFOA();
    di.pDocName = "Pedido Cardapio Cloud";
    di.pDataType = "RAW";
    if (!StartDocPrinter(h, 1, di)) { ClosePrinter(h); return "ERRO StartDoc: " + Marshal.GetLastWin32Error(); }
    if (!StartPagePrinter(h)) { EndDocPrinter(h); ClosePrinter(h); return "ERRO StartPage: " + Marshal.GetLastWin32Error(); }
    int written;
    bool ok = WritePrinter(h, bytes, bytes.Length, out written);
    EndPagePrinter(h); EndDocPrinter(h); ClosePrinter(h);
    if (!ok) return "ERRO WritePrinter: " + Marshal.GetLastWin32Error();
    return "OK:" + written;
  }
}
'@

function Resolve-Printers([object]$requested) {
  $requestedNames = @($requested) | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) }
  if ($requestedNames.Count -gt 0) { return @($requestedNames | Select-Object -Unique -First 2) }

  $virtualPattern = 'PDF|XPS|OneNote|Fax|Microsoft Print|Adobe PDF|CutePDF|doPDF|RustDesk|AnyDesk|Remote Printer'
  $all = @(Get-Printer -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch $virtualPattern -and $_.PortName -notmatch 'PORTPROMPT:|FILE:|NUL:' })

  # 1) modelos termicos conhecidos; 2) demais impressoras USB; 3) padrao.
  $preferred = @($all | Where-Object { $_.Name -match 'OASIS|OIA|KNUP|POS|58|80|IM60|thermal|termic' } | Sort-Object Name)
  $usb = @($all | Where-Object { $_.PortName -match 'USB' } | Sort-Object Name)
  $candidates = @($preferred + $usb)
  if ($candidates.Count -eq 0) {
    $default = Get-CimInstance Win32_Printer -Filter "Default=True" -ErrorAction SilentlyContinue
    $safeDefault = $all | Where-Object { $_.Name -eq $default.Name } | Select-Object -First 1
    if ($safeDefault) { $candidates = @($safeDefault) }
  }

  return @($candidates |
    Group-Object Name |
    ForEach-Object { $_.Group | Select-Object -First 1 } |
    Select-Object -First 2 |
    ForEach-Object { $_.Name })
}

$listener = New-Object System.Net.HttpListener
# Escuta somente neste notebook. O telefone envia o pedido ao Supabase e o
# navegador do notebook repassa a impressao para esta ponte local.
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Host "Agente de impressao ativo em http://127.0.0.1:$Port/  (Ctrl+C para sair)"
$startupPrinters = @(Resolve-Printers $PrinterName)
Write-Host "Impressoras alvo: $($startupPrinters -join ' + ')"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response

  # CORS - permite o app (hospedado em outro dominio) chamar o localhost
  $res.Headers.Add("Access-Control-Allow-Origin", "*")
  $res.Headers.Add("Access-Control-Allow-Methods", "POST, OPTIONS")
  $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
  $res.Headers.Add("Access-Control-Allow-Private-Network", "true")

  try {
    if ($req.HttpMethod -eq "OPTIONS") {
      $res.StatusCode = 204
      $res.Close()
      continue
    }

    if ($req.HttpMethod -eq "GET" -and $req.Url.AbsolutePath -eq "/status") {
      $printers = @(Resolve-Printers $PrinterName)
      $body = @{ ok = $true; printer = ($printers -join " + "); printers = $printers } | ConvertTo-Json -Compress
      $buf = [System.Text.Encoding]::UTF8.GetBytes($body)
      $res.ContentType = "application/json"
      $res.OutputStream.Write($buf, 0, $buf.Length)
      $res.Close()
      continue
    }

    if ($req.HttpMethod -eq "POST" -and $req.Url.AbsolutePath -eq "/print") {
      $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
      $raw = $reader.ReadToEnd()
      $reader.Close()
      $payload = $raw | ConvertFrom-Json

      $requestedPrinters = if ($payload.printers) { @($payload.printers) } elseif ($payload.printer) { @($payload.printer) } else { $PrinterName }
      $printers = @(Resolve-Printers $requestedPrinters)
      if ($printers.Count -eq 0) { throw "Nenhuma impressora encontrada" }

      $bytes = [System.Convert]::FromBase64String($payload.data)
      $results = @()
      foreach ($printer in $printers) {
        $result = [RawPrinter]::SendBytes($printer, $bytes)
        $results += @{ printer = $printer; result = $result; ok = ($result -like "OK:*") }
        Write-Host ("[{0}] {1} -> {2}" -f (Get-Date -Format "HH:mm:ss"), $printer, $result)
        Start-Sleep -Milliseconds 400
      }
      $failures = @($results | Where-Object { -not $_.ok })

      if ($failures.Count -eq 0) {
        $body = @{ ok = $true; printer = ($printers -join " + "); printers = $printers; results = $results } | ConvertTo-Json -Compress -Depth 4
        $res.StatusCode = 200
      } else {
        $failureText = ($failures | ForEach-Object { "$($_.printer): $($_.result)" }) -join " | "
        $body = @{ ok = $false; printer = ($printers -join " + "); printers = $printers; error = $failureText; results = $results } | ConvertTo-Json -Compress -Depth 4
        $res.StatusCode = 500
      }
      $buf = [System.Text.Encoding]::UTF8.GetBytes($body)
      $res.ContentType = "application/json"
      $res.OutputStream.Write($buf, 0, $buf.Length)
      $res.Close()
      continue
    }

    $res.StatusCode = 404
    $res.Close()
  } catch {
    try {
      $body = @{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
      $buf = [System.Text.Encoding]::UTF8.GetBytes($body)
      $res.StatusCode = 500
      $res.ContentType = "application/json"
      $res.OutputStream.Write($buf, 0, $buf.Length)
      $res.Close()
    } catch {}
    Write-Host ("ERRO: {0}" -f $_.Exception.Message)
  }
}
