[CmdletBinding()]
param(
    [ValidateSet('dist','dist-test','dist-workload','dist-workload-test','dist-diagnostic')]
    [string]$Lane='dist',
    [string]$RunnerPath,
    [string]$ProfilePath
)
$ErrorActionPreference='Stop'
if(-not $RunnerPath){$RunnerPath=Join-Path $PSScriptRoot '../webview2-raw-bench/NeutronStar-Host/out/clang-cl-ninja-x64/Release/neutronstar_host_runner.exe'}
if(-not $ProfilePath){$ProfilePath=Join-Path $PSScriptRoot '.cache/interactive-profile'}
$assets=Join-Path $PSScriptRoot $Lane
if(-not(Test-Path -LiteralPath $RunnerPath)){throw 'Build the clang-cl/Ninja Release NeutronStar host first, or supply -RunnerPath.'}
if(-not(Test-Path -LiteralPath (Join-Path $assets 'index.html'))){throw 'Build this project first with pnpm build (or the selected test lane).'}
# This is the interactive app window, explicitly requested by running this script.
Start-Process -FilePath $RunnerPath -ArgumentList @('--assets',('"'+$assets+'"'),'--profile',('"'+$ProfilePath+'"')) -WindowStyle Normal
