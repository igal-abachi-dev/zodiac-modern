@echo off
powershell.exe -NoProfile -File "%~dp0Init.ps1"
exit /b %errorlevel%
