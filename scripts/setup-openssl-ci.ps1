# Test tooling only. Preserve the exact real Windows oracle builds from the manifest.
$ErrorActionPreference = 'Stop'
$taskRepository = Split-Path -Parent $PSScriptRoot
$taskCache = Join-Path $taskRepository '.cache/toolchains'
New-Item -ItemType Directory -Path $taskCache -Force | Out-Null
$taskArchives = @(
    @{ Branch = '3.0'; Name = 'openssl30'; URL = 'https://download.firedaemon.com/FireDaemon-OpenSSL/openssl-3.0.22.zip'; Hash = '323fa7e2062b81fe5f4becd02e885b138f5cd2a262eea7dd30331f12f54d0573'; Executable = 'openssl-3.0/x64/bin/openssl.exe' },
    @{ Branch = '3.5'; Name = 'openssl35'; URL = 'https://download.firedaemon.com/FireDaemon-OpenSSL/openssl-3.5.9.zip'; Hash = '76da391395be029b44794857b9ff380255e02a0960a98314cd3f6a6816d82696'; Executable = 'x64/bin/openssl.exe' }
)
$taskManifest = Get-Content -LiteralPath (Join-Path $taskRepository 'receiver/tests/fixtures/manifest.json') -Raw | ConvertFrom-Json
$taskRunRoot = Join-Path $taskCache ('ci-oracles-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $taskRunRoot | Out-Null
foreach ($taskArchive in $taskArchives) {
    $taskZip = Join-Path $taskCache ($taskArchive.Name + '.zip')
    if (-not (Test-Path -LiteralPath $taskZip)) {
        Invoke-WebRequest -Uri $taskArchive.URL -OutFile $taskZip
    }
    if ((Get-FileHash -LiteralPath $taskZip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskArchive.Hash) {
        throw 'Oracle archive hash mismatch; reopen fixture/tool provenance evidence.'
    }
    $taskDestination = Join-Path $taskRunRoot $taskArchive.Name
    # Fresh extraction from the authenticated archive also covers its DLLs;
    # never trust a reused extraction solely because openssl.exe still matches.
    $taskExecutable = Join-Path $taskDestination $taskArchive.Executable
    Expand-Archive -LiteralPath $taskZip -DestinationPath $taskDestination
    if ((Get-FileHash -LiteralPath $taskExecutable -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskManifest.generators.($taskArchive.Branch).executableSHA256) {
        throw 'Oracle executable hash mismatch.'
    }
    if ($taskArchive.Branch -eq '3.0') { $env:ZODIAC_OPENSSL30 = $taskExecutable }
    else { $env:ZODIAC_OPENSSL35 = $taskExecutable }
}
if ($env:GITHUB_ENV) {
    "ZODIAC_OPENSSL30=$env:ZODIAC_OPENSSL30" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
    "ZODIAC_OPENSSL35=$env:ZODIAC_OPENSSL35" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
}
Write-Output 'Pinned real OpenSSL oracles ready; neither version gate may be skipped.'
