param(
  [switch]$Install
)

$ErrorActionPreference = "Continue"
$InstallDir = $PSScriptRoot
$LogPath = Join-Path $InstallDir "agent-watchdog.log"
$TaskName = "Cardapio Digital - Agente de Impressao"

function Write-WatchdogLog([string]$Message) {
  try {
    $line = "{0} - {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
    $lines = @(Get-Content -LiteralPath $LogPath -ErrorAction SilentlyContinue)
    if ($lines.Count -gt 250) {
      $lines | Select-Object -Last 200 | Set-Content -LiteralPath $LogPath -Encoding UTF8
    }
  } catch {}
}

if ($Install) {
  try {
    $user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $scriptPath = Join-Path $InstallDir "agent-watchdog.ps1"
    $arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments -WorkingDirectory $InstallDir
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 20 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
    $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Highest
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
    Write-Host "Inicio automatico registrado para $user." -ForegroundColor Green
    exit 0
  } catch {
    Write-Host "Nao foi possivel registrar a tarefa automatica: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
  }
}

# Evita dois supervisores quando a tarefa agendada e o atalho de seguranca
# forem executados juntos no inicio do Windows.
$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, "Global\CardapioDigitalPrintWatchdog", [ref]$createdNew)
if (-not $createdNew) { exit 0 }

function Test-AgentProcess([string]$ScriptName) {
  $escaped = [regex]::Escape((Join-Path $InstallDir $ScriptName))
  return [bool](Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -match '^(powershell|pwsh)\.exe$' -and
      $_.CommandLine -match $escaped
    } |
    Select-Object -First 1)
}

function Start-AgentProcess([string]$ScriptName) {
  $scriptPath = Join-Path $InstallDir $ScriptName
  if (-not (Test-Path -LiteralPath $scriptPath)) {
    Write-WatchdogLog "Arquivo ausente: $ScriptName"
    return
  }
  try {
    Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -WorkingDirectory $InstallDir -ArgumentList @(
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-WindowStyle", "Hidden",
      "-File", "`"$scriptPath`""
    ) | Out-Null
    Write-WatchdogLog "Processo iniciado: $ScriptName"
  } catch {
    Write-WatchdogLog "Falha ao iniciar $ScriptName`: $($_.Exception.Message)"
  }
}

Write-WatchdogLog "Supervisor iniciado. A ativacao e reutilizada automaticamente."
while ($true) {
  foreach ($script in @("print-helper.ps1", "cloud-print-agent.ps1")) {
    if (-not (Test-AgentProcess $script)) {
      Start-AgentProcess $script
      Start-Sleep -Seconds 2
    }
  }
  Start-Sleep -Seconds 8
}

