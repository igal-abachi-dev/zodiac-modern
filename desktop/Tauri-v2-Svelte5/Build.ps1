[CmdletBinding()]
param([switch]$Offline)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'scripts/toolchain.ps1')
$oldOffline=$env:CARGO_NET_OFFLINE
Push-Location $PSScriptRoot
try {
    if($Offline){$env:CARGO_NET_OFFLINE='true'}
    & pnpm test
    if($LASTEXITCODE){throw 'Frontend tests failed.'}
    & cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
    if($LASTEXITCODE){throw 'Rust formatting failed.'}
    & pnpm desktop:build
    if($LASTEXITCODE){throw 'Tauri production build failed.'}
    & cargo test --release --features custom-protocol --locked --manifest-path src-tauri/Cargo.toml
    if($LASTEXITCODE){throw 'Native policy tests failed.'}
    $exe=Join-Path $PSScriptRoot 'src-tauri/target/x86_64-pc-windows-msvc/release/neutronstar-tauri-svelte5.exe'
    New-Item -ItemType Directory -Path '.cache' -Force | Out-Null
    $receipt=[ordered]@{
        schema=1;tauri='2.12.4';tauriCli='2.12.3';svelte='5.57.2';mode='Release; local frontend sources; embedded dist; no application IPC'
        executableSha256=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash
        cargoLockSha256=(Get-FileHash src-tauri/Cargo.lock -Algorithm SHA256).Hash
        frontendManifestSha256=(Get-FileHash .cache/frontend-manifest.json -Algorithm SHA256).Hash
        comparison='Not run; separate short comparison planned'
    }
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.cache/build-receipt.json'),($receipt|ConvertTo-Json),(New-Object Text.UTF8Encoding($false)))
    Write-Output 'Built self-contained app sources into src-tauri/target/x86_64-pc-windows-msvc/release/neutronstar-tauri-svelte5.exe'
} finally {
    $env:CARGO_NET_OFFLINE=$oldOffline
    Pop-Location
}
