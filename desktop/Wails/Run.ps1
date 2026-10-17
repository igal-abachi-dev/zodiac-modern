[CmdletBinding()]
param([string]$ProfilePath)
$ErrorActionPreference='Stop'
if(Get-ChildItem Env: | Where-Object {$_.Name -like 'WEBVIEW2_*'}){throw 'Remove inherited WEBVIEW2_* overrides before this controlled run.'}
$exe=Join-Path $PSScriptRoot 'build/bin/neutronstar-wails.exe'
if(-not(Test-Path -LiteralPath $exe)){throw 'Run init.cmd / Build.ps1 first.'}
if(-not $ProfilePath){$ProfilePath=Join-Path $PSScriptRoot '.cache/interactive-profile'}
$ProfilePath=[IO.Path]::GetFullPath($ProfilePath)
if($ProfilePath.Contains('"')){throw 'Invalid profile path.'}
Start-Process -FilePath $exe -ArgumentList @('--profile',('"'+$ProfilePath+'"')) -WorkingDirectory $PSScriptRoot -WindowStyle Normal
