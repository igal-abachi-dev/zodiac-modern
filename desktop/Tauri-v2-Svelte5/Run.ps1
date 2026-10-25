[CmdletBinding()]
param([string]$ProfilePath)
$ErrorActionPreference='Stop'
$exe=Join-Path $PSScriptRoot 'src-tauri/target/x86_64-pc-windows-msvc/release/neutronstar-tauri-svelte5.exe'
if(-not(Test-Path -LiteralPath $exe)){throw 'Run Build.ps1 first.'}
if(-not $ProfilePath){$ProfilePath=Join-Path $PSScriptRoot '.cache/interactive-profile'}
Start-Process -FilePath $exe -ArgumentList @('--profile',('"'+[IO.Path]::GetFullPath($ProfilePath)+'"')) -WindowStyle Normal
