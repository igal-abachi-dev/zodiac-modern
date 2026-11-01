$ErrorActionPreference='Stop'
$vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
$installation=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if(-not $installation){throw 'Install Visual Studio C++ tools, LLVM, CMake/Ninja and Windows SDK.'}
if($env:VSCMD_ARG_TGT_ARCH -ne 'x64'){
 $developer=Join-Path $installation 'Common7/Tools/VsDevCmd.bat'
 $environment=& $env:ComSpec /d /s /c ('call "'+$developer+'" -no_logo -arch=x64 -host_arch=x64 && set')
 if($LASTEXITCODE){throw 'Developer environment setup failed.'}
 foreach($line in $environment){$i=$line.IndexOf('=');if($i -gt 0){$name=$line.Substring(0,$i);if($name -match '^(PATH|INCLUDE|LIB|LIBPATH|VSCMD_.*|VCTools.*|VCINSTALLDIR|VSINSTALLDIR|VisualStudioVersion|WindowsSdk.*|UniversalCRTSdkDir|UCRTVersion|Framework.*|ExtensionSdkDir|DevEnvDir)$'){[Environment]::SetEnvironmentVariable($name,$line.Substring($i+1),'Process')}}}
}
$llvm=Join-Path $installation 'VC/Tools/Llvm/x64/bin'
$cmakeDir=Join-Path $installation 'Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin'
$ninjaDir=Join-Path $installation 'Common7/IDE/CommonExtensions/Microsoft/CMake/Ninja'
$env:PATH="$llvm;$cmakeDir;$ninjaDir;$env:PATH"
$cmake=Join-Path $cmakeDir 'cmake.exe'
$ctest=Join-Path $cmakeDir 'ctest.exe'
