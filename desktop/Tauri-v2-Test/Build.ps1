[CmdletBinding()]
param([switch]$Offline)
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
    if(-not(Test-Path -LiteralPath '../NeutronStar-Svelte/.cache/frontend-manifest.json')) {
        throw 'Build NeutronStar-Svelte first: pnpm install --frozen-lockfile --ignore-scripts; pnpm build. This host does not rebuild the frontend.'
    }
    $common=@('--locked','--manifest-path','src-tauri/Cargo.toml')
    if($Offline){$common+='--offline'}
    & cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
    if($LASTEXITCODE -ne 0){throw 'Rust formatting check failed.'}
    & cargo test @common
    if($LASTEXITCODE -ne 0){throw 'Host policy tests failed.'}
    & cargo build --release @common
    if($LASTEXITCODE -ne 0){throw 'Release host build failed.'}
    $exe=Join-Path $PSScriptRoot 'src-tauri/target/x86_64-pc-windows-msvc/release/neutronstar-tauri.exe'
    $manifest=Get-Content -LiteralPath '../NeutronStar-Svelte/.cache/frontend-manifest.json' -Raw | ConvertFrom-Json
    $receipt=[ordered]@{
        schema=1
        rustc=((& rustc --version) -join '')
        cargo=((& cargo --version) -join '')
        target='x86_64-pc-windows-msvc'
        tauri='2.12.4'
        mode='release; matched browser args; normal-memory; InPrivate; no application IPC'
        executableSha256=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash
        cargoLockSha256=(Get-FileHash -LiteralPath 'src-tauri/Cargo.lock' -Algorithm SHA256).Hash
        frontendManifestSha256=(Get-FileHash -LiteralPath '../NeutronStar-Svelte/.cache/frontend-manifest.json' -Algorithm SHA256).Hash
        frontendFiles=$manifest.files
        nativeRuntimeValidation='pending interactive run; no benchmark performed'
    }
    New-Item -ItemType Directory -Path '.cache' -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.cache/build-receipt.json'),($receipt|ConvertTo-Json -Depth 8),(New-Object Text.UTF8Encoding($false)))
    Write-Output "Release host ready: $exe"
    Write-Output 'Run Run.ps1 to open it. No comparative benchmarks have been run.'
} finally { Pop-Location }
