@echo off
cd /d "%~dp0"
call npm ci --ignore-scripts --cache .cache/npm
if errorlevel 1 exit /b 1
call npm run build