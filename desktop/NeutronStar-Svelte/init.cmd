@echo off
setlocal
cd /d "%~dp0"
call pnpm install --frozen-lockfile --ignore-scripts
if errorlevel 1 exit /b 1
call pnpm build
exit /b %errorlevel%
