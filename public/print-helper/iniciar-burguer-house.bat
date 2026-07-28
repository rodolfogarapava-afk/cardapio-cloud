@echo off
setlocal
title Burger House Menu

cd /d "%~dp0"
set "PORTA=3000"
set "WRANGLER_LOG_PATH=.wrangler\wrangler.log"
set "IP_LOCAL="

for /f "usebackq delims=" %%I in (`powershell.exe -NoProfile -Command "$ips=[Net.Dns]::GetHostAddresses([Net.Dns]::GetHostName()); $ip=$ips.Where({$_.AddressFamily -eq [Net.Sockets.AddressFamily]::InterNetwork -and -not $_.ToString().StartsWith('169.254.')})[0]; if($ip){$ip.ToString()}"`) do set "IP_LOCAL=%%I"

if not defined IP_LOCAL set "IP_LOCAL=localhost"
set "ENDERECO=http://%IP_LOCAL%:%PORTA%"

powershell.exe -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:%PORTA%'; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }"
if errorlevel 1 (
    start "Burger House - Servidor" /min cmd.exe /k "cd /d ""%~dp0"" && set WRANGLER_LOG_PATH=.wrangler\wrangler.log && npx.cmd vinext dev --hostname 0.0.0.0 --port %PORTA%"
)

echo.
echo Burger House Menu
echo Endereco neste computador: http://localhost:%PORTA%
echo Endereco para celular/tablet: %ENDERECO%
echo.
echo O dispositivo deve estar conectado ao mesmo Wi-Fi.
echo Aguardando o servidor iniciar...

set /a TENTATIVAS=0
:AGUARDAR
powershell.exe -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:%PORTA%'; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }"
if not errorlevel 1 goto ABRIR

set /a TENTATIVAS+=1
if %TENTATIVAS% geq 30 goto FALHA
timeout /t 1 /nobreak >nul
goto AGUARDAR

:ABRIR
start "" "%ENDERECO%"
exit /b 0

:FALHA
echo Nao foi possivel iniciar o site na porta %PORTA%.
echo Verifique a janela do servidor para ver a mensagem de erro.
pause
exit /b 1
