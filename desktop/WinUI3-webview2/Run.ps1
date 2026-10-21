[CmdletBinding()]
param([string]$ProfilePath)
$ErrorActionPreference='Stop'
$exe=Join-Path $PSScriptRoot 'out/win-x64/neutronstar-winui-webview2.exe'
if(-not(Test-Path -LiteralPath $exe)){throw 'Run init.cmd or Build.ps1 first.'}
if(-not $ProfilePath){$ProfilePath=Join-Path $PSScriptRoot '.cache/interactive-profile'}
$ProfilePath=[IO.Path]::GetFullPath($ProfilePath)
if($ProfilePath.Contains('"')){throw 'Invalid profile path.'}
if(Get-ChildItem Env: | Where-Object {$_.Name -like 'WEBVIEW2_*'}){throw 'Remove WEBVIEW2_* overrides before running.'}
# Explicit interactive launch requested by the caller (also Explorer right-click).
Start-Process -FilePath $exe -ArgumentList @('--profile',('"'+$ProfilePath+'"')) -WorkingDirectory (Split-Path $exe) -WindowStyle Normal
