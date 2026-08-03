param(
  [string]$ActivateCode = "",
  [switch]$ConfigureRouting
)

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

function Resolve-ThermalPrinters {
  $virtualPattern = 'PDF|XPS|OneNote|Fax|Microsoft Print|Adobe PDF|CutePDF|doPDF|RustDesk|AnyDesk|Remote Printer'
  $all = @(Get-Printer -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch $virtualPattern -and $_.PortName -notmatch 'PORTPROMPT:|FILE:|NUL:' }
  )

  # Teste inicial com duas impressoras: prioriza modelos termicos conhecidos e
  # completa a lista com outras impressoras USB. O nome e usado como chave para
  # impedir que a mesma impressora seja incluida duas vezes.
  $preferred = @($all | Where-Object { $_.Name -match 'OASIS|OIA|KNUP|POS|58|80|IM60|thermal|termic' } | Sort-Object Name)
  $usb = @($all | Where-Object { $_.PortName -match 'USB' } | Sort-Object Name)
  $selected = @($preferred + $usb) |
    Group-Object Name |
    ForEach-Object { $_.Group | Select-Object -First 1 } |
    Select-Object -First 2

  return @($selected | ForEach-Object { $_.Name })
}

function Get-PrinterRouting([string[]]$Printers, [object]$AgentConfig) {
  if ($Printers.Count -lt 2) {
    return @{ skewers = $Printers[0]; sides = $Printers[0] }
  }
  $skewer = [string]$AgentConfig.skewerPrinter
  $side = [string]$AgentConfig.sidePrinter
  if ($Printers -notcontains $skewer) { $skewer = $Printers[0] }
  if ($Printers -notcontains $side -or $side -eq $skewer) {
    $side = @($Printers | Where-Object { $_ -ne $skewer })[0]
  }
  return @{ skewers = $skewer; sides = $side }
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

if ($ConfigureRouting) {
  if (-not (Test-Path $ConfigPath)) {
    Write-Host "Ative o agente antes de configurar as impressoras." -ForegroundColor Red
    exit 2
  }
  $routingConfig = Get-Content $ConfigPath -Raw | ConvertFrom-Json
  $availablePrinters = @(Resolve-ThermalPrinters)
  if ($availablePrinters.Count -ge 2) {
    Write-Host ""
    Write-Host "Escolha a impressora dos ESPETINHOS:" -ForegroundColor Yellow
    Write-Host "  [1] $($availablePrinters[0])"
    Write-Host "  [2] $($availablePrinters[1])"
    do { $choice = Read-Host "Digite 1 ou 2" } while ($choice -notin @("1", "2"))
    $skewerIndex = [int]$choice - 1
    $sideIndex = if ($skewerIndex -eq 0) { 1 } else { 0 }
    $routingConfig | Add-Member -NotePropertyName skewerPrinter -NotePropertyValue $availablePrinters[$skewerIndex] -Force
    $routingConfig | Add-Member -NotePropertyName sidePrinter -NotePropertyValue $availablePrinters[$sideIndex] -Force
    $routingConfig | ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding UTF8
    Write-Host "Espetinhos: $($availablePrinters[$skewerIndex])" -ForegroundColor Green
    Write-Host "Acompanhamentos e demais categorias: $($availablePrinters[$sideIndex])" -ForegroundColor Green
  } elseif ($availablePrinters.Count -eq 1) {
    $routingConfig | Add-Member -NotePropertyName skewerPrinter -NotePropertyValue $availablePrinters[0] -Force
    $routingConfig | Add-Member -NotePropertyName sidePrinter -NotePropertyValue $availablePrinters[0] -Force
    $routingConfig | ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding UTF8
    Write-Host "Uma impressora detectada. Ela recebera todos os itens: $($availablePrinters[0])" -ForegroundColor Yellow
  } else {
    Write-Host "Nenhuma impressora fisica detectada agora. O agente usara automaticamente as impressoras disponiveis." -ForegroundColor Yellow
  }
  exit 0
}

if (-not (Test-Path $ConfigPath)) { exit 2 }
$Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$Token = $Config.agentToken
$LastHeartbeat = [DateTime]::MinValue
$InterJobDelaySeconds = 5

while ($true) {
  try {
    $printers = @(Resolve-ThermalPrinters)
    if ($printers.Count -eq 0) { throw "Nenhuma impressora USB encontrada" }
    $printerLabel = $printers -join " + "

    if (((Get-Date) - $LastHeartbeat).TotalSeconds -ge 15) {
      Invoke-AgentRpc "printer_agent_heartbeat" @{ p_token=$Token; p_printer_name=$printerLabel } | Out-Null
      $LastHeartbeat = Get-Date
    }

    # Trabalha uma comanda por vez para nunca deixar várias como "imprimindo".
    $jobs = @(Invoke-AgentRpc "claim_print_jobs" @{ p_token=$Token; p_limit=1 })
    foreach ($job in $jobs) {
      if (-not $job.job_id) { continue }
      try {
        $targets = @()
        if ($printers.Count -ge 2 -and $job.payload.routes) {
          $routing = Get-PrinterRouting $printers $Config
          if ($job.payload.routes.skewers.data) {
            $targets += [pscustomobject]@{ printer=$routing.skewers; data=[string]$job.payload.routes.skewers.data; route="Espetinhos" }
          }
          if ($job.payload.routes.sides.data) {
            $targets += [pscustomobject]@{ printer=$routing.sides; data=[string]$job.payload.routes.sides.data; route="Acompanhamentos/outros" }
          }
        }
        if ($targets.Count -eq 0) {
          foreach ($printer in $printers) {
            $targets += [pscustomobject]@{ printer=$printer; data=[string]$job.payload.data; route="Pedido completo" }
          }
        }
        $failures = @()
        foreach ($target in $targets) {
          $bytes = [Convert]::FromBase64String($target.data)
          $result = [CloudRawPrinter]::Send($target.printer, $bytes)
          Write-Host ("[{0}] {1} [{2}] -> {3}" -f (Get-Date -Format "HH:mm:ss"), $target.printer, $target.route, $result)
          if ($result -ne "OK") { $failures += "$($target.printer) [$($target.route)]`: $result" }
          Start-Sleep -Milliseconds 400
        }
        if ($failures.Count -gt 0) { throw ($failures -join " | ") }
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
