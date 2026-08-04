# Cardapio Digital - Agente de impressao RAW ESC/POS
# ------------------------------------------------------------------
# Pequeno servidor HTTP local que recebe bytes ESC/POS (em base64) do
# navegador e os envia em modo RAW direto para a impressora termica,
# contornando a renderizacao grafica (EMF) do Windows que trava em
# varias impressoras termicas clone.
#
# Uso: clique duplo em iniciar-impressora.vbs (ou rode este .ps1).
# O app web faz POST em http://127.0.0.1:19100/print com { data: <base64> }.

param(
  [int]$Port = 19100,
  [string[]]$PrinterName = @() # vazio = detecta todas as filas fisicas instaladas
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
    di.pDocName = "Pedido Cardapio Digital";
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
  # Nao filtra por marca: qualquer fila fisica instalada no Windows e aceita.
  # Filas PDF/virtuais e portas de gravacao em arquivo nunca aparecem.
  $virtualPattern = 'PDF|XPS|OneNote|Fax|Microsoft Print|Adobe PDF|CutePDF|doPDF|PDFCreator|PrimoPDF|Bullzip|Foxit PDF|Nitro PDF|Wondershare PDF|Remote Printer|Remote Desktop|RustDesk|AnyDesk'
  $all = @(Get-Printer -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -notmatch $virtualPattern -and
      $_.DriverName -notmatch $virtualPattern -and
      $_.PortName -notmatch '^(PORTPROMPT:|FILE:|NUL:|XPSPort:)$'
    })

  # Detecta pela conexao, sem limitar marcas ou modelos. Inclui USB,
  # Bluetooth, adaptadores seriais e filas fisicas cujo driver nao informa
  # claramente o tipo de porta.
  $direct = @($all | Where-Object {
    $_.PortName -match 'USB|DOT4|BTH|BLUETOOTH|COM\d+' -or
    $_.Name -match 'Bluetooth' -or $_.DriverName -match 'Bluetooth'
  } | Sort-Object Name)
  $candidates = @($direct + ($all | Sort-Object Name))
  if ($candidates.Count -eq 0) {
    $default = Get-CimInstance Win32_Printer -Filter "Default=True" -ErrorAction SilentlyContinue
    $safeDefault = $all | Where-Object { $_.Name -eq $default.Name } | Select-Object -First 1
    if ($safeDefault) { $candidates = @($safeDefault) }
  }

  $physicalNames = @($candidates |
    Group-Object Name |
    ForEach-Object { $_.Group | Select-Object -First 1 } |
    ForEach-Object { $_.Name })
  $requestedNames = @($requested) | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) }
  if ($requestedNames.Count -gt 0) {
    # Mesmo quando uma fila e pedida explicitamente, ela precisa fazer parte
    # da lista fisica detectada: PDF e filas virtuais nao podem ser usadas.
    return @($physicalNames | Where-Object { $_ -in $requestedNames })
  }
  return $physicalNames
}

function Get-PrinterRouting([string[]]$Printers) {
  if ($Printers.Count -lt 2) { return @{ skewers=$Printers[0]; sides=$Printers[0] } }
  $skewer = $Printers[0]
  $side = $Printers[1]
  $configPath = Join-Path $env:ProgramData "CardapioCloud\printer-agent.json"
  if (Test-Path $configPath) {
    try {
      $agentConfig = Get-Content $configPath -Raw | ConvertFrom-Json
      if ($Printers -contains [string]$agentConfig.skewerPrinter) { $skewer = [string]$agentConfig.skewerPrinter }
      if ($Printers -contains [string]$agentConfig.sidePrinter -and [string]$agentConfig.sidePrinter -ne $skewer) {
        $side = [string]$agentConfig.sidePrinter
      } else {
        $side = @($Printers | Where-Object { $_ -ne $skewer })[0]
      }
    } catch {}
  }
  return @{ skewers=$skewer; sides=$side }
}

$listener = New-Object System.Net.HttpListener
# Escuta somente neste notebook. O telefone envia o pedido ao Supabase e o
# navegador do notebook repassa a impressao para esta ponte local.
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$startupErrorLog = Join-Path $PSScriptRoot "print-helper-error.log"
try {
  $listener.Start()
  Remove-Item -LiteralPath $startupErrorLog -Force -ErrorAction SilentlyContinue
} catch {
  $startupMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Nao foi possivel abrir a porta $Port`: $($_.Exception.Message)"
  Set-Content -LiteralPath $startupErrorLog -Value $startupMessage -Encoding UTF8
  throw
}
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

      $targets = @()
      $routing = Get-PrinterRouting $printers
      if ([string]$payload.routingMode -eq "single") {
        $singleTarget = if ($printers.Count -ge 2 -and [int]$payload.singlePrinter -eq 2) { $routing.sides } else { $routing.skewers }
        $targets += [pscustomobject]@{ printer=$singleTarget; data=[string]$payload.data; route="Pedido completo" }
      } elseif ($printers.Count -ge 2 -and $payload.routes) {
        $printer1Route = if ($payload.routes.printer1) { $payload.routes.printer1 } else { $payload.routes.skewers }
        $printer2Route = if ($payload.routes.printer2) { $payload.routes.printer2 } else { $payload.routes.sides }
        if ($printer1Route.data) {
          $targets += [pscustomobject]@{ printer=$routing.skewers; data=[string]$printer1Route.data; route="Impressora 1" }
        }
        if ($printer2Route.data) {
          $targets += [pscustomobject]@{ printer=$routing.sides; data=[string]$printer2Route.data; route="Impressora 2" }
        }
      }
      if ($targets.Count -eq 0) {
        $targets += [pscustomobject]@{ printer=$routing.skewers; data=[string]$payload.data; route="Pedido completo" }
      }
      $results = @()
      foreach ($target in $targets) {
        $bytes = [System.Convert]::FromBase64String($target.data)
        $result = [RawPrinter]::SendBytes($target.printer, $bytes)
        $results += @{ printer = $target.printer; route = $target.route; result = $result; ok = ($result -like "OK:*") }
        Write-Host ("[{0}] {1} [{2}] -> {3}" -f (Get-Date -Format "HH:mm:ss"), $target.printer, $target.route, $result)
        Start-Sleep -Milliseconds 400
      }
      $failures = @($results | Where-Object { -not $_.ok })

      if ($failures.Count -eq 0) {
        $body = @{ ok = $true; printer = ($printers -join " + "); printers = $printers; results = $results } | ConvertTo-Json -Compress -Depth 4
        $res.StatusCode = 200
      } else {
        $failureText = ($failures | ForEach-Object { "$($_.printer) [$($_.route)]: $($_.result)" }) -join " | "
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
