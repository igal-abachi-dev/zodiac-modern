[CmdletBinding()]
param([switch]$Offline)
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
    $env:DOTNET_CLI_HOME=Join-Path $PSScriptRoot '.cache/dotnet-home'
    $env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
    $env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE='1'
    if ((dotnet --version) -ne '10.0.402') { throw 'Install the pinned .NET SDK 10.0.402.' }
    $python=Join-Path $PSScriptRoot '../PyWebView/.venv/Scripts/python.exe'
    if (-not(Test-Path -LiteralPath $python)) { $python='python' }
    & $python ../host-test-support/verify_assets.py --stage Frontend
    if($LASTEXITCODE -ne 0){throw 'Frozen frontend verification failed.'}
    if(-not $Offline){
        dotnet restore NeutronStar.WinUIWebView2.csproj --locked-mode --configfile NuGet.Config --packages .cache/nuget
        if($LASTEXITCODE -ne 0){throw 'Locked host restore failed.'}
        dotnet restore tests/PolicyTests.csproj --locked-mode --configfile NuGet.Config --packages .cache/nuget
        if($LASTEXITCODE -ne 0){throw 'Locked test restore failed.'}
    }
    # Offline mode requires the previously restored, locked dependency cache.
    dotnet run --project tests/PolicyTests.csproj --no-restore -c Release -- Frontend
    if($LASTEXITCODE -ne 0){throw 'Policy tests failed.'}
    dotnet publish NeutronStar.WinUIWebView2.csproj --no-restore -c Release -p:Platform=x64 -o out/win-x64
    if($LASTEXITCODE -ne 0){throw 'Publish failed.'}
    $output=Join-Path $PSScriptRoot 'out/win-x64'
    foreach($item in (Get-Content Frontend.manifest.json -Raw | ConvertFrom-Json).files){
        $path=Join-Path $output ('Frontend/'+$item.path)
        if((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.sha256){throw 'Published frontend differs.'}
    }
    foreach($name in @('App.xbf','MainWindow.xbf','neutronstar-winui-webview2.pri')){
        if(-not(Test-Path -LiteralPath (Join-Path $output $name))){throw 'Missing XAML deployment resource.'}
    }
    $files=@(Get-ChildItem -LiteralPath $output -Recurse -File | Sort-Object FullName | ForEach-Object {
        [ordered]@{path=$_.FullName.Substring($output.Length+1).Replace('\','/'); bytes=$_.Length; sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
    })
    [ordered]@{schema=1; sdk='10.0.402'; configuration='Release win-x64 self-contained untrimmed'; frontendManifestSha256=(Get-FileHash Frontend.manifest.json).Hash.ToLowerInvariant(); lockSha256=(Get-FileHash packages.lock.json).Hash.ToLowerInvariant(); files=$files} | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 .cache/build-receipt.json
    Write-Host 'Built out/win-x64. Run Run.ps1. Comparative benchmarks have not been run.'
} finally { Pop-Location }
