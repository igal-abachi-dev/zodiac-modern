[CmdletBinding()]param([switch]$Restore,[switch]$SkipBundle)
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
 $node=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../.cache/toolchains/node/node-v24.21.0-win-x64'))
 $env:PATH="$node;$env:PATH"
 if((& node --version) -ne 'v24.21.0'){throw 'Use Node 24.21.0. See README.'}
 $env:NUGET_PACKAGES=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.cache/rnw-nuget'))
 $env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
 $vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
 $vs=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
 $msbuild=Join-Path $vs 'MSBuild/Current/Bin/MSBuild.exe'
 & node node_modules/typescript/bin/tsc --noEmit
 if($LASTEXITCODE){throw 'TypeScript checks failed.'}
 & node --experimental-strip-types --test tests/domain.test.ts
 if($LASTEXITCODE){throw 'RNW model tests failed.'}
 New-Item -ItemType Directory -Force windows/NeutronStar/Bundle|Out-Null
 if(-not $SkipBundle){
  & node node_modules/react-native/cli.js bundle --platform windows --dev false --entry-file index.js --bundle-output windows/NeutronStar/Bundle/index.windows.bundle --assets-dest windows/NeutronStar/Bundle --max-workers 2
  if($LASTEXITCODE){throw 'Production JS bundle failed.'}
 }
 $arguments=@('windows/NeutronStar/NeutronStar.vcxproj','/m:2','/p:Configuration=Release','/p:Platform=x64','/p:WindowsTargetPlatformVersion=10.0.26100.0',"/p:SolutionDir=$PSScriptRoot\windows\","/p:SolutionPath=$PSScriptRoot\windows\NeutronStar.sln",'/p:AppxPackage=false','/p:Bundle=true','/p:WindowsAppSDKSelfContained=true','/p:WindowsPackageType=None',"/p:OutDir=$PSScriptRoot\out\win-x64\",'/verbosity:minimal')
 if($Restore){$arguments+=@('/restore','/p:RestoreLockedMode=false')}else{$arguments+='/p:RestoreLockedMode=true'}
 & $msbuild @arguments
 if($LASTEXITCODE){throw 'RNW native build failed.'}
 Copy-Item windows/NeutronStar/Bundle out/win-x64 -Recurse -Force
} finally {Pop-Location}
