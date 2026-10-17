[CmdletBinding()]
param(
    [ValidateSet('Release', 'Debug')][string]$Configuration = 'Release',
    [string]$RunnerPath
)
$ErrorActionPreference = 'Stop'
$exe = Join-Path $PSScriptRoot "../NeutronStar-Host/out/clang-cl-ninja-x64/$Configuration/neutronstar_host_runner.exe"
if ($RunnerPath) { $exe = [IO.Path]::GetFullPath($RunnerPath) }
if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { throw 'Build NeutronStar-Host first.' }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dist-test/index.html'))) { throw 'Run npm run build:test first.' }
$runRoot = Join-Path $PSScriptRoot ('.cache/test-' + [Guid]::NewGuid().ToString('N'))
$assets = Join-Path $runRoot 'assets'
$profile = Join-Path $runRoot 'profile'
$report = Join-Path $runRoot 'report.jsonl'
New-Item -ItemType Directory -Path $assets | Out-Null
# Vite compiles the test module into this separate production-mode build.
Copy-Item -Path (Join-Path $PSScriptRoot 'dist-test/*') -Destination $assets -Recurse
$arguments = @('--assets', ('"' + $assets + '"'), '--profile', ('"' + $profile + '"'), '--hidden', '--test-greet-smoke-test', '--report', ('"' + $report + '"'))
$process = Start-Process -FilePath $exe -ArgumentList $arguments -PassThru -WindowStyle Hidden
if (-not $process.WaitForExit(30000)) { $process.Kill(); throw "Example test deadline exceeded. Reports: $runRoot" }
$process.Refresh()
Write-Output "Reports: $runRoot"
if (Test-Path -LiteralPath $report) { Get-Content -LiteralPath $report -Tail 1 }
if ($process.ExitCode -ne 0) { throw "Example test exit $($process.ExitCode)" }
$deadline = [DateTime]::UtcNow.AddSeconds(30)
do {
    $remaining = @(Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'" | Where-Object { $_.CommandLine -like "*$profile*" })
    if (-not $remaining.Count) { break }
    Start-Sleep -Milliseconds 500
} while ([DateTime]::UtcNow -lt $deadline)
if ($remaining.Count) { throw 'Example browser helpers exceeded the shutdown deadline.' }
Write-Output "PASS $Configuration Vite/TypeScript native greeting, DOM/CSP/assets/navigation and browser-helper shutdown"
