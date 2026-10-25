[CmdletBinding()]param([string]$ProfilePath)
$ErrorActionPreference='Stop'
$exe=Join-Path $PSScriptRoot 'out/NeutronStar-Electron-win32-x64/NeutronStar-Electron.exe'
if(-not(Test-Path $exe)){throw 'Run Init.ps1 and Build.ps1 first.'}
if(-not $ProfilePath){$ProfilePath=Join-Path $PSScriptRoot '.cache/interactive-profile'}
Start-Process -FilePath $exe -ArgumentList @('--profile',('"'+[IO.Path]::GetFullPath($ProfilePath)+'"')) -WindowStyle Normal
