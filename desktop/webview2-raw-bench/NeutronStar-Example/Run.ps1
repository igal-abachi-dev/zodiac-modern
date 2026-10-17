[CmdletBinding()]
param(
    [ValidateSet('Release', 'Debug')][string]$Configuration = 'Release',
    [string]$ProfileDirectory,
    [string]$RunnerPath
)
$ErrorActionPreference = 'Stop'
$exe = Join-Path $PSScriptRoot "../NeutronStar-Host/out/clang-cl-ninja-x64/$Configuration/neutronstar_host_runner.exe"
if ($RunnerPath) { $exe = [IO.Path]::GetFullPath($RunnerPath) }
if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { throw 'Build NeutronStar-Host first; see README.md.' }
if (-not $ProfileDirectory) { $ProfileDirectory = Join-Path $PSScriptRoot '.cache/interactive-profile' }
$ProfileDirectory = [IO.Path]::GetFullPath($ProfileDirectory)
$assets = Join-Path $PSScriptRoot 'dist'
if (-not (Test-Path -LiteralPath (Join-Path $assets 'index.html'))) { throw 'Run npm ci and npm run build first.' }
if ($assets.Contains('"') -or $ProfileDirectory.Contains('"')) { throw 'Quote characters are not supported in these argument paths.' }
$arguments = @('--assets', ('"' + $assets + '"'), '--profile', ('"' + $ProfileDirectory + '"'), '--test-greet')
# This is the user's interactive app, not a background helper. Hidden startup
# overrides Win32's first ShowWindow call and would hide the example itself.
$process = Start-Process -FilePath $exe -ArgumentList $arguments -WindowStyle Normal -PassThru
Write-Output "NeutronStar Example launched (PID $($process.Id)). Close its window to exit."
