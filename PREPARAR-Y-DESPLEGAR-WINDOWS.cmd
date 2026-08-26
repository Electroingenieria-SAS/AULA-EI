@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0PREPARAR-Y-DESPLEGAR-WINDOWS.ps1"
endlocal
