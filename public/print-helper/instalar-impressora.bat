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
set "INSTALLDIR=%ProgramData%\CardapioCloud\Agent"
set "INSTALLEDVBS=%INSTALLDIR%\iniciar-impressora.vbs"

echo ============================================================
echo   Agente de impressao - Cardapio Cloud
echo ============================================================
echo.

echo Encerrando uma versao anterior do agente, se estiver aberta...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$self=$PID; Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessId -ne $self -and $_.Name -match '^(powershell|pwsh)\.exe$' -and $_.CommandLine -match '(cloud-print-agent|print-helper)\.ps1' } | ForEach-Object { Invoke-CimMethod -InputObject $_ -MethodName Terminate -ErrorAction SilentlyContinue | Out-Null }"
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
if not exist "%PASTA%print-helper.ps1" (
  echo [ERRO] O arquivo print-helper.ps1 nao foi encontrado.
  pause
  exit /b 1
)

echo [1/7] Instalando os arquivos em uma pasta permanente...
if not exist "%INSTALLDIR%" mkdir "%INSTALLDIR%"
copy /Y "%PASTA%cloud-print-agent.ps1" "%INSTALLDIR%\cloud-print-agent.ps1" >nul
if errorlevel 1 goto :copy_error
copy /Y "%PASTA%print-helper.ps1" "%INSTALLDIR%\print-helper.ps1" >nul
if errorlevel 1 goto :copy_error
copy /Y "%VBS%" "%INSTALLEDVBS%" >nul
if errorlevel 1 goto :copy_error
echo      OK - arquivos instalados em %INSTALLDIR%.
echo.

echo [2/7] Vinculando este notebook a loja...
set /p "CODIGO=Digite o codigo mostrado no site: "
powershell -NoProfile -ExecutionPolicy Bypass -File "%INSTALLDIR%\cloud-print-agent.ps1" -ActivateCode "%CODIGO%"
if errorlevel 1 (
  echo.
  echo [ERRO] Nao foi possivel ativar. Gere um novo codigo no site.
  pause
  exit /b 1
)
echo.

echo [3/7] Configurando os pontos de preparo...
powershell -NoProfile -ExecutionPolicy Bypass -File "%INSTALLDIR%\cloud-print-agent.ps1" -ConfigureRouting
if errorlevel 1 (
  echo [ERRO] Nao foi possivel configurar as impressoras.
  pause
  exit /b 1
)
echo.

echo [4/7] Autorizando comunicacao local segura...
netsh http delete urlacl url=http://127.0.0.1:9100/ >nul 2>&1
netsh http add urlacl url=http://127.0.0.1:9100/ user=Everyone >nul
echo      OK.
echo.

echo [5/7] Configurando inicio automatico com o Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=New-Object -ComObject WScript.Shell; $dest=[IO.Path]::Combine($env:APPDATA,'Microsoft\Windows\Start Menu\Programs\Startup','Impressora Cardapio Cloud.lnk'); $l=$s.CreateShortcut($dest); $l.TargetPath='%INSTALLEDVBS%'; $l.WorkingDirectory='%INSTALLDIR%'; $l.Description='Agente de impressao Cardapio Cloud'; $l.Save()"
if errorlevel 1 (
  echo      [AVISO] Nao consegui criar o inicio automatico.
) else (
  echo      OK - o agente iniciara junto com o Windows.
)
echo.

echo [6/7] Iniciando o agente agora...
start "" wscript "%INSTALLEDVBS%"
echo      OK.
echo.

echo [7/7] Conferindo o agente e as impressoras USB...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$r=$null; for($i=1; $i -le 10 -and -not $r; $i++){ try { $r=Invoke-RestMethod -Uri 'http://127.0.0.1:9100/status' -TimeoutSec 2 } catch { if($i -lt 10){ Start-Sleep -Seconds 2 } } }; if(-not $r){ Write-Host '      [ERRO] O agente nao respondeu na porta 9100 apos varias tentativas.' -ForegroundColor Red; exit 1 }; $p=@($r.printers); if($p.Count -ge 2){ Write-Host ('      OK - 2 impressoras detectadas: ' + ($p -join ' + ')) -ForegroundColor Green } elseif($p.Count -eq 1){ Write-Host ('      [AVISO] Apenas 1 impressora detectada: ' + $p[0]) -ForegroundColor Yellow } else { Write-Host '      Agente ativo, mas nenhuma impressora fisica foi detectada.' -ForegroundColor Yellow }; exit 0"
if errorlevel 1 (
  echo.
  echo ============================================================
  echo   INSTALACAO INCOMPLETA
  echo   O agente nao iniciou. Feche outros programas de impressao
  echo   e execute este instalador novamente como administrador.
  echo ============================================================
  echo.
  pause
  exit /b 1
)
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
exit /b 0

:copy_error
echo.
echo [ERRO] Nao foi possivel instalar os arquivos em %INSTALLDIR%.
echo Execute este instalador novamente como administrador.
echo.
pause
exit /b 1
