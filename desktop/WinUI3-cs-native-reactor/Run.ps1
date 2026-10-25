[CmdletBinding()]param()
$ErrorActionPreference='Stop'
$exe=Join-Path $PSScriptRoot 'out/win-x64/NeutronStar-WinUI-Reactor.exe'
if(-not(Test-Path -LiteralPath $exe)){throw 'Run Build.ps1 first.'}
Start-Process -FilePath $exe -WindowStyle Normal
