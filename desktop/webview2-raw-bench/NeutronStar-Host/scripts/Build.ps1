[CmdletBinding()]
param(
    [ValidateSet('Release', 'Debug')][string]$Configuration = 'Release',
    [ValidateSet('clang-cl-ninja-x64', 'msvc-x64', 'clang-cl-vs-x64', 'msvc-ninja-x64')]
    [string]$Preset = 'clang-cl-ninja-x64',
    [switch]$DeveloperEnvironment
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
if (-not (Test-Path -LiteralPath $vswhere)) { throw 'Install Visual Studio C++ build tools and the Windows SDK.' }
$installation = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $installation) { throw 'No Visual Studio C++ toolchain found.' }
if (-not $DeveloperEnvironment) {
    $developer = Join-Path $installation 'Common7/Tools/VsDevCmd.bat'
    # Values interpolated here are restricted by ValidateSet above.
    $command = 'call "' + $developer + '" -no_logo -arch=x64 -host_arch=x64 && powershell.exe -NoProfile -File "' + $PSCommandPath + '" -DeveloperEnvironment -Configuration ' + $Configuration + ' -Preset ' + $Preset
    & $env:ComSpec /d /s /c $command
    if ($LASTEXITCODE) { throw 'Host build/test failed.' }
    exit 0
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
    & $cmake --preset $Preset
    if ($LASTEXITCODE) { throw 'CMake configuration failed.' }
    $buildDirectory = Join-Path $root "out/$Preset"
    & $cmake --build $buildDirectory --config $Configuration --parallel 4
    if ($LASTEXITCODE) { throw 'C++ build failed.' }
    & $ctest --test-dir $buildDirectory -C $Configuration --output-on-failure
    if ($LASTEXITCODE) { throw 'Native tests failed.' }
}
finally { Pop-Location }
