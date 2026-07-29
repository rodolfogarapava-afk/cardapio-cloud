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

if not exist "%VBS%" (
  echo [ERRO] Extraia todos os arquivos do ZIP antes de instalar.
  echo.
  pause
  exit /b 1
)

echo [1/4] Autorizando comunicacao local segura...
netsh http delete urlacl url=http://127.0.0.1:9100/ >nul 2>&1
netsh http add urlacl url=http://127.0.0.1:9100/ user=Everyone >nul
echo      OK.
echo.

echo [2/4] Configurando inicio automatico com o Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=New-Object -ComObject WScript.Shell; $dest=[IO.Path]::Combine($env:APPDATA,'Microsoft\Windows\Start Menu\Programs\Startup','Impressora Cardapio Cloud.lnk'); $l=$s.CreateShortcut($dest); $l.TargetPath='%VBS%'; $l.WorkingDirectory='%PASTASEMBARRA%'; $l.Description='Agente de impressao Cardapio Cloud'; $l.Save()"
if errorlevel 1 (
  echo      [AVISO] Nao consegui criar o inicio automatico.
) else (
  echo      OK - o agente iniciara junto com o Windows.
)
echo.

echo [3/4] Iniciando o agente agora...
start "" wscript "%VBS%"
echo      OK.
echo.

echo [4/4] Procurando a impressora USB...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 3; try { $r=Invoke-RestMethod -Uri 'http://127.0.0.1:9100/status' -TimeoutSec 5; if($r.printer){ Write-Host ('      OK - Impressora detectada: ' + $r.printer) -ForegroundColor Green } else { Write-Host '      Agente ativo, mas nenhuma impressora foi detectada.' -ForegroundColor Yellow } } catch { Write-Host '      [AVISO] O agente nao respondeu. Instale o driver da Knup e tente novamente.' -ForegroundColor Yellow }"
echo.

echo ============================================================
echo   INSTALACAO CONCLUIDA
echo.
echo   Volte ao site, abra Impressao e clique em:
echo   "Ativar impressao automatica".
echo ============================================================
echo.
pause
endlocal
