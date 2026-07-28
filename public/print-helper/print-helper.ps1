# Burguer House - Ponte de impressao RAW ESC/POS
# ------------------------------------------------------------------
# Pequeno servidor HTTP local que recebe bytes ESC/POS (em base64) do
# navegador e os envia em modo RAW direto para a impressora termica,
# contornando a renderizacao grafica (EMF) do Windows que trava em
# varias impressoras termicas clone.
#
# Uso: clique duplo em iniciar-impressora.vbs (ou rode este .ps1).
# O app web faz POST em http://localhost:9100/print com { data: <base64> }.

param(
  [int]$Port = 9100,
  [string]$PrinterName = ""   # vazio = auto-detecta a impressora termica
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
    di.pDocName = "Recibo Burguer House";
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

function Resolve-Printer([string]$requested) {
  if ($requested) { return $requested }
  $all = Get-Printer -ErrorAction SilentlyContinue
  # 1) impressora numa porta USB com nome tipico de termica
  $p = $all | Where-Object { $_.Name -match 'POS|58|IM60|thermal|termic' } | Select-Object -First 1
  if ($p) { return $p.Name }
  # 2) impressora ligada a uma porta USB
  $p = $all | Where-Object { $_.PortName -match 'USB' } | Select-Object -First 1
  if ($p) { return $p.Name }
  # 3) impressora padrao do Windows
  $def = Get-CimInstance Win32_Printer -Filter "Default=True" -ErrorAction SilentlyContinue
  if ($def) { return $def.Name }
  return $null
}

$listener = New-Object System.Net.HttpListener
# "+" escuta em todas as interfaces (localhost e o IP da rede Wi-Fi), pra dar
# pra imprimir tambem a partir do celular. Exige reserva previa da URL, feita
# uma unica vez com privilegio de administrador:
#   netsh http add urlacl url=http://+:9100/ user=Everyone
$listener.Prefixes.Add("http://+:$Port/")
$listener.Start()
Write-Host "Ponte de impressao ativa em http://+:$Port/  (localhost e rede)  (Ctrl+C para sair)"
Write-Host "Impressora alvo: $((Resolve-Printer $PrinterName))"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response

  # CORS - permite o app (hospedado em outro dominio) chamar o localhost
  $res.Headers.Add("Access-Control-Allow-Origin", "*")
  $res.Headers.Add("Access-Control-Allow-Methods", "POST, OPTIONS")
  $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

  try {
    if ($req.HttpMethod -eq "OPTIONS") {
      $res.StatusCode = 204
      $res.Close()
      continue
    }

    if ($req.HttpMethod -eq "GET" -and $req.Url.AbsolutePath -eq "/status") {
      $printer = Resolve-Printer $PrinterName
      $body = @{ ok = $true; printer = $printer } | ConvertTo-Json -Compress
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

      $printer = Resolve-Printer $payload.printer
      if (-not $printer) { throw "Nenhuma impressora encontrada" }

      $bytes = [System.Convert]::FromBase64String($payload.data)
      $result = [RawPrinter]::SendBytes($printer, $bytes)

      if ($result -like "OK:*") {
        $body = @{ ok = $true; printer = $printer; bytes = [int]($result.Split(':')[1]) } | ConvertTo-Json -Compress
        $res.StatusCode = 200
      } else {
        $body = @{ ok = $false; printer = $printer; error = $result } | ConvertTo-Json -Compress
        $res.StatusCode = 500
      }
      $buf = [System.Text.Encoding]::UTF8.GetBytes($body)
      $res.ContentType = "application/json"
      $res.OutputStream.Write($buf, 0, $buf.Length)
      $res.Close()
      Write-Host ("[{0}] {1} -> {2}" -f (Get-Date -Format "HH:mm:ss"), $printer, $result)
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
