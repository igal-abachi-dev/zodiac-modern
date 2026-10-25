[CmdletBinding()]param()
$ErrorActionPreference='Stop'
$exe=Join-Path $PSScriptRoot 'out/win-x64/NeutronStar-Avalonia.exe'
if(-not(Test-Path $exe)){throw 'Run Build.ps1 first.'}
Start-Process -FilePath $exe -WindowStyle Normal
