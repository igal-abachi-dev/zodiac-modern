$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
 $node=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../.cache/toolchains/node/node-v24.21.0-win-x64'))
 if(Test-Path "$node/node.exe"){$env:PATH="$node;$env:PATH"}
 if((& node --version) -ne 'v24.21.0'){throw 'Install/use Node 24.21.0 before Init.'}
 $env:NUGET_PACKAGES=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.cache/rnw-nuget'))
 $env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
 & npm.cmd ci --ignore-scripts --cache ../.cache/npm --no-audit --no-fund
 if($LASTEXITCODE){throw 'Locked npm restore failed.'}
 & dotnet restore tools/Tools.csproj --configfile NuGet.config -p:NuGetAudit=false
 if($LASTEXITCODE){throw 'RNW PowerShell tool restore failed.'}
 & ./Build.ps1 -Restore
} finally {Pop-Location}
