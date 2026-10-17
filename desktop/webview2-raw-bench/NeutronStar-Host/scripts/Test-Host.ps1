[CmdletBinding()]
param(
    [ValidateSet('Release', 'Debug')][string]$Configuration = 'Release',
    [string]$RunnerPath
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$exe = Join-Path $root "out/clang-cl-ninja-x64/$Configuration/neutronstar_host_runner.exe"
if ($RunnerPath) { $exe = [IO.Path]::GetFullPath($RunnerPath) }
if (-not (Test-Path -LiteralPath $exe)) { throw 'Build the runner first.' }
$fixtures = Join-Path $root 'tests/fixtures/smoke'
$runRoot = Join-Path $root ('.cache/test-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runRoot | Out-Null
function Invoke-Case([string]$Name, [string[]]$Extra, [int]$Expected = 0, [string]$Assets = $fixtures) {
    $profile = Join-Path $runRoot $Name
    $report = Join-Path $runRoot "$Name.jsonl"
    $arguments = @('--assets', ('"' + $Assets + '"'), '--profile', ('"' + $profile + '"'), '--hidden',
        '--report', ('"' + $report + '"'), '--timeout-ms', '20000') + $Extra
    $process = Start-Process -FilePath $exe -ArgumentList $arguments -PassThru -WindowStyle Hidden
    if (-not $process.WaitForExit(30000)) { $process.Kill(); throw "$Name exceeded the test deadline." }
    $process.Refresh()
    if ($process.ExitCode -ne $Expected) {
        if (Test-Path -LiteralPath $report) { Get-Content -LiteralPath $report }
        throw "$Name exit $($process.ExitCode), expected $Expected"
    }
    Write-Output "PASS $Name"
}
Invoke-Case 'local-content-and-csp' @('--smoke-test')
Invoke-Case 'hash-routing-and-reload' @('--smoke-test', '--entry', 'routing.html')
Invoke-Case 'typed-action-bridge' @('--bridge-smoke-test', '--entry', 'bridge.html')
Invoke-Case 'custom-titlebar-csp' @('--custom-titlebar', '--smoke-test')
Invoke-Case 'custom-window-commands' @('--window-smoke-test', '--entry', 'window-smoke.html')
Invoke-Case 'memory-low-normal-low' @('--memory-smoke-test')
Invoke-Case 'invalid-memory-target' @('--memory-target', 'invalid') 1
for ($i = 0; $i -lt 5; ++$i) { Invoke-Case "close-before-ready-$i" @('--close-before-ready') }
Invoke-Case 'close-at-environment' @('--close-at-environment')
Invoke-Case 'close-at-controller' @('--close-at-controller')
Invoke-Case 'missing-entry' @('--entry', 'absent.html') 1
$emptyRuntime = Join-Path $runRoot 'empty-runtime'
New-Item -ItemType Directory -Path $emptyRuntime | Out-Null
Invoke-Case 'invalid-fixed-runtime' @('--runtime', ('"' + $emptyRuntime + '"')) 1
$linkedAssets = Join-Path $runRoot 'linked-assets'
New-Item -ItemType Directory -Path $linkedAssets | Out-Null
New-Item -ItemType Junction -Path (Join-Path $linkedAssets 'escape') -Target $fixtures | Out-Null
Invoke-Case 'reparse-entry-refused' @('--entry', 'escape/index.html') 1 $linkedAssets
$insideProfile = Join-Path $fixtures 'forbidden-profile'
Invoke-Case 'profile-inside-assets-refused' @('--profile', ('"' + $insideProfile + '"')) 1
if (Test-Path -LiteralPath $insideProfile) { throw 'Rejected profile was created inside the asset tree.' }
$previousOverride = [Environment]::GetEnvironmentVariable('WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS', 'Process')
try {
    [Environment]::SetEnvironmentVariable('WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS', '--not-used', 'Process')
    Invoke-Case 'runtime-override-refused' @() 1
}
finally { [Environment]::SetEnvironmentVariable('WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS', $previousOverride, 'Process') }
Write-Output "Reports: $runRoot"
# Browser helpers exit asynchronously. Observe only this suite's unique profile paths.
$deadline = [DateTime]::UtcNow.AddSeconds(30)
do {
    $remaining = @(Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'" |
        Where-Object { $_.CommandLine -like "*$runRoot*" })
    if ($remaining.Count -eq 0) { break }
    Start-Sleep -Milliseconds 500
} while ([DateTime]::UtcNow -lt $deadline)
if ($remaining.Count) { throw "$($remaining.Count) suite browser helpers still running after the shutdown deadline." }
Write-Output 'PASS browser-helper shutdown'
