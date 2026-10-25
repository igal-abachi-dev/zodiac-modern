[CmdletBinding()]
param(
    [ValidateSet('Release', 'Debug')][string]$Configuration = 'Release',
    [ValidateSet('clang-cl-ninja-x64', 'msvc-x64', 'clang-cl-vs-x64', 'msvc-ninja-x64')]
    [string]$Preset = 'clang-cl-ninja-x64',
    [ValidatePattern('^[a-zA-Z0-9_-]*$')][string]$BuildTag = '',
    [string]$AssetsDirectory,
    [switch]$FileAssets,
    [switch]$EmbedSmokeFixtures,
    [switch]$DeveloperEnvironment
)
$ErrorActionPreference = 'Stop'
if ($EmbedSmokeFixtures -and ($AssetsDirectory -or $FileAssets)) { throw 'Smoke assets are a separate test build.' }
$root = Split-Path $PSScriptRoot -Parent
$embedPath = ''
if ($EmbedSmokeFixtures) { $embedPath = Join-Path $root 'tests/fixtures/smoke' }
elseif (-not $FileAssets) {
    if (-not $AssetsDirectory) { throw 'Embedded build (default) requires -AssetsDirectory <your production dist>. Use -FileAssets for file-backed tooling.' }
    $embedPath = [IO.Path]::GetFullPath($AssetsDirectory)
    if (-not (Test-Path -LiteralPath (Join-Path $embedPath 'index.html') -PathType Leaf)) { throw 'Asset directory must contain a built index.html.' }
}
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
if (-not (Test-Path -LiteralPath $vswhere)) { throw 'Install Visual Studio C++ build tools and the Windows SDK.' }
$installation = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $installation) { throw 'No Visual Studio C++ toolchain found.' }
if (-not $DeveloperEnvironment -and $env:VSCMD_ARG_TGT_ARCH -ne 'x64') {
    $developer = Join-Path $installation 'Common7/Tools/VsDevCmd.bat'
    # Import SDK variables without interpolating caller asset paths into cmd code.
    # Capture the output privately: never print the process environment.
    $command = 'call "' + $developer + '" -no_logo -arch=x64 -host_arch=x64 && set'
    $sdkEnvironment = & $env:ComSpec /d /s /c $command
    if ($LASTEXITCODE) { throw 'Visual Studio environment setup failed.' }
    foreach ($line in $sdkEnvironment) {
        $separator = $line.IndexOf('=')
        if ($separator -gt 0) {
            $name = $line.Substring(0, $separator)
            if ($name -match '^(PATH|INCLUDE|LIB|LIBPATH|VSCMD_.*|VCTools.*|VCINSTALLDIR|VSINSTALLDIR|VisualStudioVersion|WindowsSdk.*|UniversalCRTSdkDir|UCRTVersion|Framework.*|ExtensionSdkDir|DevEnvDir)$') {
                [Environment]::SetEnvironmentVariable($name, $line.Substring($separator + 1), 'Process')
            }
        }
    }
}
if ($env:VSCMD_ARG_TGT_ARCH -ne 'x64') { throw 'An x64 Visual Studio Developer environment is required.' }
$cmakeDir = Join-Path $installation 'Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin'
$ninjaDir = Join-Path $installation 'Common7/IDE/CommonExtensions/Microsoft/CMake/Ninja'
$llvmDir = Join-Path $installation 'VC/Tools/Llvm/x64/bin'
$env:PATH = "$llvmDir;$ninjaDir;$cmakeDir;$env:PATH"
$cmake = Join-Path $installation 'Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin/cmake.exe'
$ctest = Join-Path $installation 'Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin/ctest.exe'
if (-not (Test-Path -LiteralPath $cmake)) { throw 'Install the C++ CMake tools component.' }
if ($Preset -like '*ninja*' -and -not (Test-Path -LiteralPath (Join-Path $ninjaDir 'ninja.exe'))) { throw 'Install the Visual Studio CMake/Ninja tools component.' }
if ($Preset -like 'clang-cl*' -and -not (Test-Path -LiteralPath (Join-Path $llvmDir 'clang-cl.exe'))) { throw 'Install the Visual Studio LLVM/Clang x64 tools component.' }
Push-Location $root
try {
    & (Join-Path $PSScriptRoot 'Restore-Dependencies.ps1') -Offline
    $buildDirectory = Join-Path $root ("out/$Preset" + $(if ($BuildTag) { "-$BuildTag" } else { '' }))
    & $cmake --preset $Preset -B $buildDirectory "-DNEUTRONSTAR_EMBED_ASSETS=$embedPath"
    if ($LASTEXITCODE) { throw 'CMake configuration failed.' }
    & $cmake --build $buildDirectory --config $Configuration --parallel 4
    if ($LASTEXITCODE) { throw 'C++ build failed.' }
    & $ctest --test-dir $buildDirectory -C $Configuration --output-on-failure
    if ($LASTEXITCODE) { throw 'Native tests failed.' }
}
finally { Pop-Location }
