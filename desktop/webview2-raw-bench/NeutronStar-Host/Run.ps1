[CmdletBinding()]
param([switch]$FileAssets,[string]$RunnerPath,[string]$ProfilePath,[string]$AssetsDirectory,
    [ValidatePattern('^[a-zA-Z0-9_-]*$')][string]$BuildTag='',
    [ValidatePattern('^[A-Fa-f0-9]{6}$')][string]$BackgroundRgb='FFFFFF',
    [ValidateSet('light','dark','system')][string]$ColorScheme='light')
$ErrorActionPreference='Stop'
$name=if($FileAssets){'neutronstar_host_runner.exe'}else{'neutronstar_embedded_runner.exe'}
if(-not $RunnerPath){$suffix=if($BuildTag){"-$BuildTag"}else{''};$RunnerPath=Join-Path $PSScriptRoot "out/clang-cl-ninja-x64$suffix/Release/$name"}
if(-not(Test-Path -LiteralPath $RunnerPath)){throw 'Build with scripts/Build.ps1 first, or pass -RunnerPath for an isolated build.'}
if(-not $ProfilePath){$ProfilePath=Join-Path $PSScriptRoot ('.cache/interactive-profile'+$(if($BuildTag){"-$BuildTag"}else{''}))}
$arguments=@('--profile',('"'+[IO.Path]::GetFullPath($ProfilePath)+'"'),'--background-rgb',$BackgroundRgb,'--color-scheme',$ColorScheme)
if($FileAssets){
    if(-not $AssetsDirectory){throw 'File-backed mode requires -AssetsDirectory <your dist>.'}
    $arguments+=@('--assets',('"'+[IO.Path]::GetFullPath($AssetsDirectory)+'"'))
}
Start-Process -FilePath $RunnerPath -ArgumentList $arguments -WindowStyle Normal
