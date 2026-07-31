param([string]$ActivateCode = "")

$ErrorActionPreference = "Stop"
$SupabaseUrl = "https://mycahirzxfkejxqpvuco.supabase.co"
$PublishableKey = "sb_publishable_bMydrvlH1_lAE6KFwY93qw_F7W4N-mx"
$DataDir = Join-Path $env:ProgramData "CardapioCloud"
$ConfigPath = Join-Path $DataDir "printer-agent.json"
$Headers = @{ apikey = $PublishableKey; Authorization = "Bearer $PublishableKey" }

Add-Type @'
using System;
using System.Runtime.InteropServices;
public class CloudRawPrinter {
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
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] bytes, int count, out int written);
  public static string Send(string printerName, byte[] bytes) {
    IntPtr h;
    if (!OpenPrinter(printerName, out h, IntPtr.Zero)) return "OpenPrinter: " + Marshal.GetLastWin32Error();
    DOCINFOA di = new DOCINFOA(); di.pDocName = "Pedido Cardapio Cloud"; di.pDataType = "RAW";
    if (!StartDocPrinter(h, 1, di)) { ClosePrinter(h); return "StartDoc: " + Marshal.GetLastWin32Error(); }
    if (!StartPagePrinter(h)) { EndDocPrinter(h); ClosePrinter(h); return "StartPage: " + Marshal.GetLastWin32Error(); }
    int written; bool ok = WritePrinter(h, bytes, bytes.Length, out written);
    EndPagePrinter(h); EndDocPrinter(h); ClosePrinter(h);
    return ok ? "OK" : "WritePrinter: " + Marshal.GetLastWin32Error();
  }
}
'@

function Invoke-AgentRpc([string]$Name, [hashtable]$Body) {
  return Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/rpc/$Name" -Method Post `
    -Headers $Headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Compress) -TimeoutSec 15
}

function Resolve-ThermalPrinter {
  $virtualPattern = 'PDF|XPS|OneNote|Fax|Microsoft Print|Adobe PDF|CutePDF|doPDF'
  $all = Get-Printer -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch $virtualPattern -and $_.PortName -notmatch 'PORTPROMPT:|FILE:|NUL:' }
  $printer = $all | Where-Object { $_.Name -match 'KNUP|POS|58|80|IM60|thermal|termic' } | Select-Object -First 1
  if (-not $printer) { $printer = $all | Where-Object { $_.PortName -match 'USB' } | Select-Object -First 1 }
  if (-not $printer) { return $null }
  return $printer.Name
}

if ($ActivateCode) {
  New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
  $device = "$env:COMPUTERNAME-$env:USERNAME"
  try {
    $activation = @(Invoke-AgentRpc "activate_printer_agent" @{ p_code=$ActivateCode; p_device_name=$device })[0]
    if (-not $activation.agent_token) { throw "Resposta de ativacao invalida" }
    @{ agentToken=$activation.agent_token; agentId=$activation.agent_id; tenantId=$activation.tenant_id; tenantName=$activation.tenant_name } |
      ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding UTF8
    Write-Host "Agente vinculado com sucesso a: $($activation.tenant_name)" -ForegroundColor Green
    exit 0
  } catch {
    Write-Host "Falha na ativacao: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
}

if (-not (Test-Path $ConfigPath)) { exit 2 }
$Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$Token = $Config.agentToken
$LastHeartbeat = [DateTime]::MinValue
$InterJobDelaySeconds = 5

while ($true) {
  try {
    $printer = Resolve-ThermalPrinter
    if (-not $printer) { throw "Nenhuma impressora USB encontrada" }

    if (((Get-Date) - $LastHeartbeat).TotalSeconds -ge 15) {
      Invoke-AgentRpc "printer_agent_heartbeat" @{ p_token=$Token; p_printer_name=$printer } | Out-Null
      $LastHeartbeat = Get-Date
    }

    # Trabalha uma comanda por vez para nunca deixar várias como "imprimindo".
    $jobs = @(Invoke-AgentRpc "claim_print_jobs" @{ p_token=$Token; p_limit=1 })
    foreach ($job in $jobs) {
      if (-not $job.job_id) { continue }
      try {
        $bytes = [Convert]::FromBase64String([string]$job.payload.data)
        $result = [CloudRawPrinter]::Send($printer, $bytes)
        if ($result -ne "OK") { throw $result }
        $confirmed = $false
        for ($attempt = 1; $attempt -le 5 -and -not $confirmed; $attempt++) {
          try {
            $confirmed = [bool](Invoke-AgentRpc "complete_print_job" @{
              p_token=$Token
              p_job_id=$job.job_id
              p_success=$true
              p_error=$null
            })
          } catch {
            if ($attempt -lt 5) { Start-Sleep -Milliseconds 500 }
          }
        }
        if (-not $confirmed) { throw "A impressao saiu, mas o servidor nao confirmou o status" }

        # Impressoras termicas USB pequenas possuem um buffer limitado. Mesmo
        # depois de o Windows aceitar o RAW, o papel ainda pode estar saindo.
        # Aguarde antes de reivindicar a proxima comanda para manter a ordem.
        Start-Sleep -Seconds $InterJobDelaySeconds
      } catch {
        Invoke-AgentRpc "complete_print_job" @{ p_token=$Token; p_job_id=$job.job_id; p_success=$false; p_error=$_.Exception.Message } | Out-Null
      }
    }
  } catch {}
  Start-Sleep -Seconds 2
}
