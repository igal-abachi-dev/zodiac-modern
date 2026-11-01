[CmdletBinding()]param([switch]$Restore)
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
 $arguments=@('windows/NeutronStar/NeutronStar.vcxproj','/m:2','/p:Configuration=Release','/p:Platform=x64','/p:WindowsTargetPlatformVersion=10.0.26100.0',"/p:SolutionDir=$PSScriptRoot\windows\","/p:SolutionPath=$PSScriptRoot\windows\NeutronStar.sln",'/p:AppxPackage=false','/p:Bundle=true','/p:WindowsAppSDKSelfContained=true','/p:WindowsPackageType=None',"/p:OutDir=$PSScriptRoot\out\win-x64\",'/verbosity:minimal')
 $arguments+='/p:RestoreLockedMode=true'
 if($Restore){$arguments+='/restore'}
 & $msbuild @arguments
 if($LASTEXITCODE){throw 'RNW native build failed.'}
 Copy-Item windows/NeutronStar/Bundle out/win-x64 -Recurse -Force
 $redist=Get-ChildItem (Join-Path $vs 'VC/Redist/MSVC') -Directory|Where-Object {$_.Name -match '^14\.\d+\.\d+$'}|Sort-Object {[version]$_.Name} -Descending|Select-Object -First 1
 $crt=Get-ChildItem (Join-Path $redist.FullName 'x64/Microsoft.VC*.CRT') -Directory|Select-Object -First 1
 Copy-Item (Join-Path $crt.FullName '*.dll') out/win-x64 -Force
 New-Item -ItemType Directory -Force out/win-x64/Notices|Out-Null
 Copy-Item assets/notices/* out/win-x64/Notices -Force
 Copy-Item (Join-Path $vs 'Licenses/1033/Redist.txt') out/win-x64/Notices/Microsoft-Redist.txt -Force
 & node tools/notices.cjs
 if($LASTEXITCODE){throw 'Dependency notices failed.'}
 $root=Join-Path $PSScriptRoot 'out/win-x64'
 $files=@(Get-ChildItem $root -Recurse -File|ForEach-Object{@{path=$_.FullName.Substring($root.Length+1).Replace('\','/');bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
 @{rnw='0.85.0';react='19.2.3';reactNative='0.85.3';sdk='10.0.26100.0';nativeCompiler='MSVC v145';renderer='Fabric / Windows Composition';engine='Hermes';font='Windows Segoe UI (local custom fonts unsupported by this release)';files=$files}|ConvertTo-Json -Depth 5|Set-Content .cache-build-receipt.json -Encoding UTF8
} finally {Pop-Location}
