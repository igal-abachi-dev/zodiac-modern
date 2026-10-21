@echo off
powershell.exe -NoProfile -File "%~dp0Build.ps1"
if errorlevel 1 pause
exit /b %errorlevel%
