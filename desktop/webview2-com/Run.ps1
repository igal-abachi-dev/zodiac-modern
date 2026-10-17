[CmdletBinding()]
param([string]$ProfilePath,[string]$AssetsPath)
$ErrorActionPreference='Stop'
$exe=Join-Path $PSScriptRoot 'target/x86_64-pc-windows-msvc/release/neutronstar-rust-host.exe'
if(-not(Test-Path -LiteralPath $exe)){throw 'Run init.cmd / Build.ps1 first.'}
if(-not $ProfilePath){$ProfilePath=Join-Path $PSScriptRoot '.cache/interactive-profile'}
if(-not $AssetsPath){$AssetsPath=Join-Path $PSScriptRoot '../NeutronStar-Svelte/dist'}
$ProfilePath=[IO.Path]::GetFullPath($ProfilePath);$AssetsPath=[IO.Path]::GetFullPath($AssetsPath)
if($ProfilePath.Contains('"') -or $AssetsPath.Contains('"')){throw 'Invalid directory.'}
Start-Process -FilePath $exe -ArgumentList @('--assets',('"'+$AssetsPath+'"'),'--profile',('"'+$ProfilePath+'"')) -WorkingDirectory $PSScriptRoot -WindowStyle Normal
