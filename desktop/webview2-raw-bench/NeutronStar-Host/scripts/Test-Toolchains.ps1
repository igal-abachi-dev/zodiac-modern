[CmdletBinding()]
param(
    [switch]$DeveloperEnvironment,
    [string[]]$Presets = @('msvc-x64', 'clang-cl-vs-x64', 'msvc-ninja-x64', 'clang-cl-ninja-x64'),
    [ValidateSet('Release', 'Debug')][string[]]$Configurations = @('Release', 'Debug')
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$allowedPresets = @('msvc-x64', 'clang-cl-vs-x64', 'msvc-ninja-x64', 'clang-cl-ninja-x64')
foreach ($preset in $Presets) { if ($preset -notin $allowedPresets) { throw "Unknown matrix preset: $preset" } }
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
$installation = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $installation) { throw 'Visual Studio x64 C++ tools are required.' }
if (-not $DeveloperEnvironment) {
    if ($Presets.Count -ne 4 -or $Configurations.Count -ne 2) { throw 'For a partial run, invoke from an x64 Developer PowerShell with -DeveloperEnvironment.' }
    $developer = Join-Path $installation 'Common7/Tools/VsDevCmd.bat'
    # One cmd process imports the official toolchain environment then starts this script.
    # No execution-policy override, installs, cleanup, or source-tree deletion.
    $command = 'call "' + $developer + '" -no_logo -arch=x64 -host_arch=x64 && powershell.exe -NoProfile -File "' + $PSCommandPath + '" -DeveloperEnvironment'
    & $env:ComSpec /d /s /c $command
    if ($LASTEXITCODE) { throw 'Toolchain matrix failed; see its per-run report.' }
    exit 0
}
if ($env:VSCMD_ARG_TGT_ARCH -ne 'x64') { throw 'Run with the x64 Visual Studio Developer environment.' }
$cmakeDir = Join-Path $installation 'Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin'
$ninjaDir = Join-Path $installation 'Common7/IDE/CommonExtensions/Microsoft/CMake/Ninja'
$llvmDir = Join-Path $installation 'VC/Tools/Llvm/x64/bin'
$env:PATH = "$llvmDir;$ninjaDir;$cmakeDir;$env:PATH"
$cmake = Join-Path $cmakeDir 'cmake.exe'
$ctest = Join-Path $cmakeDir 'ctest.exe'
foreach ($tool in @($cmake, $ctest, (Join-Path $ninjaDir 'ninja.exe'), (Join-Path $llvmDir 'clang-cl.exe'))) {
    if (-not (Test-Path -LiteralPath $tool -PathType Leaf)) { throw "Missing matrix tool: $tool" }
}
$example = Join-Path $root '../NeutronStar-Example'
if (-not (Test-Path -LiteralPath (Join-Path $example 'dist-test/index.html'))) { throw 'Build NeutronStar-Example test assets first: npm run build:test.' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$runId = $stamp + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
$runRoot = Join-Path $root ('.cache/toolchains-' + $runId)
# Keep CMake's nested compiler-probe/object paths below Windows tool limits.
$buildRoot = Join-Path $root ('out/tc-' + [Guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $runRoot | Out-Null
$results = [Collections.Generic.List[object]]::new()
function Invoke-NativeLogged([string]$Program, [string[]]$CommandArguments, [string]$LogPath) {
    $watch = [Diagnostics.Stopwatch]::StartNew()
    $savedPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $Program @CommandArguments *> $LogPath
        $nativeCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $savedPreference; $watch.Stop() }
    if ($nativeCode) { throw "Native command exit $nativeCode; log: $LogPath" }
    return [Math]::Round($watch.Elapsed.TotalSeconds, 3)
}
function Save-Results {
    $results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $runRoot 'results.json') -Encoding UTF8
}
Push-Location $root
try {
    & (Join-Path $PSScriptRoot 'Restore-Dependencies.ps1') -Offline *> (Join-Path $runRoot 'dependency-integrity.log')
    $sourceFiles = @(Get-Item -LiteralPath (Join-Path $root 'CMakeLists.txt'), (Join-Path $root 'CMakePresets.json'), (Join-Path $root 'dependencies.lock.json'))
    foreach ($sourceDirectory in @('src', 'include', 'examples', 'tests', 'scripts')) {
        $sourceFiles += @(Get-ChildItem -LiteralPath (Join-Path $root $sourceDirectory) -Recurse -File)
    }
    $sourceFiles | Sort-Object FullName | ForEach-Object {
        [ordered]@{ path=$_.FullName.Substring($root.Length + 1); sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
    } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runRoot 'source-hashes.json') -Encoding UTF8
    @{
        started = [DateTime]::UtcNow.ToString('o'); installation = $installation
        cmake = (& $cmake --version | Select-Object -First 1)
        ninja = (& (Join-Path $ninjaDir 'ninja.exe') --version)
        clang = (& (Join-Path $llvmDir 'clang-cl.exe') --version | Select-Object -First 1)
        sdk = $env:WindowsSDKVersion; crt = 'static MT/MTd'; standard = 'C++20'
        note = 'Single-pass fresh-config and no-op wall times; not a repeated speed benchmark.'
    } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runRoot 'tools.json') -Encoding UTF8
    Write-Output "Matrix reports: $runRoot"
    foreach ($preset in $Presets) {
        $buildDir = Join-Path $buildRoot $preset
        $configureLog = Join-Path $runRoot "$preset-configure.log"
        try {
            $configureSeconds = Invoke-NativeLogged $cmake @('--preset', $preset, '-B', $buildDir, '-DCMAKE_LINKER_TYPE=MSVC') $configureLog
        } catch {
            $results.Add([ordered]@{ preset=$preset; status='configure_failed'; error=$_.Exception.Message }); Save-Results
            Write-Output "FAIL $preset configure: $($_.Exception.Message)"
            continue
        }
        foreach ($configuration in $Configurations) {
            $label = "$preset-$configuration"
            $record = [ordered]@{ preset=$preset; configuration=$configuration; configure_seconds=$configureSeconds; status='started'; build_directory=$buildDir }
            try {
                $record.build_seconds = Invoke-NativeLogged $cmake @('--build', $buildDir, '--config', $configuration, '--parallel', '4') (Join-Path $runRoot "$label-build.log")
                $record.noop_seconds = Invoke-NativeLogged $cmake @('--build', $buildDir, '--config', $configuration, '--parallel', '4') (Join-Path $runRoot "$label-noop.log")
                $null = Invoke-NativeLogged $ctest @('--test-dir', $buildDir, '-C', $configuration, '--output-on-failure') (Join-Path $runRoot "$label-ctest.log")
                $runner = Join-Path $buildDir "$configuration/neutronstar_host_runner.exe"
                $record.exe_bytes = (Get-Item -LiteralPath $runner).Length
                $record.exe_sha256 = (Get-FileHash -LiteralPath $runner -Algorithm SHA256).Hash
                $record.lib_bytes = (Get-Item -LiteralPath (Join-Path $buildDir "$configuration/neutronstar_host.lib")).Length
                & (Join-Path $PSScriptRoot 'Test-Host.ps1') -Configuration $configuration -RunnerPath $runner *> (Join-Path $runRoot "$label-webview.log")
                & (Join-Path $example 'Test.ps1') -Configuration $configuration -RunnerPath $runner *> (Join-Path $runRoot "$label-example.log")
                $record.status = 'passed'
                Write-Output "PASS $label (build $($record.build_seconds)s, no-op $($record.noop_seconds)s, $($record.exe_bytes) bytes)"
            } catch {
                $record.status = 'failed'; $record.error = $_.Exception.Message
                Write-Output "FAIL ${label}: $($record.error)"
            }
            $results.Add($record); Save-Results
        }
    }
} finally { Pop-Location }
Write-Output "Matrix reports: $runRoot"
if (@($results | Where-Object { $_.status -ne 'passed' }).Count) { exit 1 }
