@echo off
title Instalar agente de impressao - Cardapio Cloud
setlocal

net session >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

set "PASTA=%~dp0"
set "VBS=%PASTA%iniciar-impressora.vbs"
set "PASTASEMBARRA=%PASTA:~0,-1%"

echo ============================================================
echo   Agente de impressao - Cardapio Cloud
echo ============================================================
echo.

echo Encerrando uma versao anterior do agente, se estiver aberta...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$self=$PID; Get-CimInstance Win32_Process -ErrorAction SilentlyContinue ^| Where-Object { $_.ProcessId -ne $self -and $_.Name -match '^(powershell|pwsh)\.exe$' -and $_.CommandLine -match '(cloud-print-agent|print-helper)\.ps1' } ^| ForEach-Object { Invoke-CimMethod -InputObject $_ -MethodName Terminate -ErrorAction SilentlyContinue ^| Out-Null }"
echo      OK.
echo.

if not exist "%VBS%" (
  echo [ERRO] Extraia todos os arquivos do ZIP antes de instalar.
  echo.
  pause
  exit /b 1
)
if not exist "%PASTA%cloud-print-agent.ps1" (
  echo [ERRO] O arquivo cloud-print-agent.ps1 nao foi encontrado.
  pause
  exit /b 1
)

echo [1/5] Vinculando este notebook a loja...
set /p "CODIGO=Digite o codigo mostrado no site: "
powershell -NoProfile -ExecutionPolicy Bypass -File "%PASTA%cloud-print-agent.ps1" -ActivateCode "%CODIGO%"
if errorlevel 1 (
  echo.
  echo [ERRO] Nao foi possivel ativar. Gere um novo codigo no site.
  pause
  exit /b 1
)
echo.

echo [2/5] Autorizando comunicacao local segura...
netsh http delete urlacl url=http://127.0.0.1:9100/ >nul 2>&1
netsh http add urlacl url=http://127.0.0.1:9100/ user=Everyone >nul
echo      OK.
echo.

echo [3/5] Configurando inicio automatico com o Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=New-Object -ComObject WScript.Shell; $dest=[IO.Path]::Combine($env:APPDATA,'Microsoft\Windows\Start Menu\Programs\Startup','Impressora Cardapio Cloud.lnk'); $l=$s.CreateShortcut($dest); $l.TargetPath='%VBS%'; $l.WorkingDirectory='%PASTASEMBARRA%'; $l.Description='Agente de impressao Cardapio Cloud'; $l.Save()"
if errorlevel 1 (
  echo      [AVISO] Nao consegui criar o inicio automatico.
) else (
  echo      OK - o agente iniciara junto com o Windows.
)
echo.

echo [4/5] Iniciando o agente agora...
start "" wscript "%VBS%"
echo      OK.
echo.

echo [5/5] Procurando ate duas impressoras USB...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 3; try { $r=Invoke-RestMethod -Uri 'http://127.0.0.1:9100/status' -TimeoutSec 5; $p=@($r.printers); if($p.Count -ge 2){ Write-Host ('      OK - 2 impressoras detectadas: ' + ($p -join ' + ')) -ForegroundColor Green } elseif($p.Count -eq 1){ Write-Host ('      [AVISO] Apenas 1 impressora detectada: ' + $p[0]) -ForegroundColor Yellow } else { Write-Host '      Agente ativo, mas nenhuma impressora foi detectada.' -ForegroundColor Yellow } } catch { Write-Host '      [AVISO] O agente nao respondeu. Instale os drivers das impressoras e tente novamente.' -ForegroundColor Yellow }"
echo.

echo ============================================================
echo   INSTALACAO CONCLUIDA
echo.
echo   Volte ao site e abra Impressao.
echo   O status mudara para "Conectado e pronto".
echo ============================================================
echo.
pause
endlocal
