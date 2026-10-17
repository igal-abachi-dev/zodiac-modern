[CmdletBinding()]
param([string]$ProfilePath)
$ErrorActionPreference='Stop'
$exe=Join-Path $PSScriptRoot 'src-tauri/target/x86_64-pc-windows-msvc/release/neutronstar-tauri.exe'
if(-not(Test-Path -LiteralPath $exe)){throw 'Run Build.ps1 or init.cmd first.'}
if(-not $ProfilePath){$ProfilePath=Join-Path $PSScriptRoot '.cache/interactive-profile'}
$ProfilePath=[IO.Path]::GetFullPath($ProfilePath)
if($ProfilePath.Contains('"')){throw 'Invalid profile path.'}
if(Get-ChildItem Env: | Where-Object {$_.Name -like 'WEBVIEW2_*'}){throw 'Remove WEBVIEW2_* overrides before running the matched host.'}
# This script explicitly opens the interactive app requested by its caller.
Start-Process -FilePath $exe -ArgumentList @('--profile',('"'+$ProfilePath+'"')) -WorkingDirectory $PSScriptRoot -WindowStyle Normal
