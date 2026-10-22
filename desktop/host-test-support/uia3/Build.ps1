[CmdletBinding()]
param([switch]$Offline)
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
    $env:DOTNET_CLI_HOME=Join-Path $PSScriptRoot '../../.cache/dotnet-home'
    $env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
    $env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE='1'
    if((dotnet --version) -ne '10.0.402'){throw 'Install the pinned .NET SDK 10.0.402.'}
    if(-not $Offline){
        dotnet restore UIA3Probe.csproj --locked-mode --configfile NuGet.Config --packages ../.cache/nuget
        if($LASTEXITCODE -ne 0){throw 'UIA3 locked restore failed.'}
    }
    dotnet build UIA3Probe.csproj --no-restore -c Release -o ../.cache/uia3
    if($LASTEXITCODE -ne 0){throw 'UIA3 build failed.'}
} finally {Pop-Location}
