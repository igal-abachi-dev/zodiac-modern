@echo off
cd /d "%~dp0"
if exist "%~dp0..\..\.cache\toolchains\node\node-v24.21.0-win-x64\node.exe" set "PATH=%~dp0..\..\.cache\toolchains\node\node-v24.21.0-win-x64;%PATH%"
if exist "%~dp0..\..\.cache\bootstrap\node_modules\.bin\pnpm.cmd" set "PATH=%~dp0..\..\.cache\bootstrap\node_modules\.bin;%PATH%"
call pnpm install --frozen-lockfile --ignore-scripts
if errorlevel 1 exit /b %errorlevel%
call pnpm build
