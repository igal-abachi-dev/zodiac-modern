[CmdletBinding()]
param([switch]$Offline)
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
    & python ../host-test-support/verify_assets.py
    if($LASTEXITCODE -ne 0){throw 'Baseline verification failed.'}
    & cargo fmt -- --check
    if($LASTEXITCODE -ne 0){throw 'Rust formatting failed.'}
    $common=@('--locked');if($Offline){$common+='--offline'}
    & cargo test @common
    if($LASTEXITCODE -ne 0){throw 'Rust policy tests failed.'}
    & cargo build --release @common
    if($LASTEXITCODE -ne 0){throw 'Rust release build failed.'}
    $receipt=@{rustc=((& rustc --version)-join '');bindings='webview2-com 0.39.1 / windows 0.62.2';mode='raw Win32; decorated; InPrivate; normal memory; messaging off';executableSha256=(Get-FileHash target/x86_64-pc-windows-msvc/release/neutronstar-rust-host.exe).Hash;cargoLockSha256=(Get-FileHash Cargo.lock).Hash;frontendManifestSha256=(Get-FileHash ../NeutronStar-Svelte/.cache/frontend-manifest.json).Hash;nativeAcceptance='pending; no benchmark performed'}
    New-Item -ItemType Directory -Force '.cache' | Out-Null
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.cache/build-receipt.json'),($receipt|ConvertTo-Json),(New-Object Text.UTF8Encoding($false)))
} finally {Pop-Location}
