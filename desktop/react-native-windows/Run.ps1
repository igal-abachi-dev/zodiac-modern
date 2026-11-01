$ErrorActionPreference='Stop'
$runner=Join-Path $PSScriptRoot 'out/win-x64/NeutronStar.exe'
if(-not(Test-Path $runner)){throw 'Build first with Build.ps1.'}
Start-Process -FilePath $runner -WorkingDirectory (Split-Path $runner) -WindowStyle Normal
