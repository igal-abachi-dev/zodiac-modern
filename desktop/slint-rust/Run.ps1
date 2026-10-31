[CmdletBinding()]param()
$ErrorActionPreference='Stop'
$exe=Join-Path $PSScriptRoot 'out/win-x64/neutronstar-slint.exe'
if(-not(Test-Path -LiteralPath $exe)){throw 'Run Build.ps1 first.'}
Start-Process -FilePath $exe -WorkingDirectory (Split-Path -Parent $exe) -WindowStyle Normal
