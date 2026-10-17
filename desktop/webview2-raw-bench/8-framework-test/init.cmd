@echo off
powershell.exe -NoProfile -File "%~dp0scripts\Workspace.ps1" -Task install
if errorlevel 1 goto done
powershell.exe -NoProfile -File "%~dp0scripts\Workspace.ps1" -Task typecheck
if errorlevel 1 goto done
powershell.exe -NoProfile -File "%~dp0scripts\Workspace.ps1" -Task build
:done
pause
