[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$stage=Join-Path $PSScriptRoot '.cache/workload-hosts-20261023'
if(-not(Test-Path -LiteralPath $stage)){
    & python (Join-Path $PSScriptRoot 'prepare_workload_hosts.py')
    if($LASTEXITCODE -ne 0){throw 'Workload staging failed'}
}
# Run only while measurement collection is stopped. Never overwrite production outputs.
Push-Location (Join-Path $stage 'Tauri-v2-Test')
try {
    & cargo build --release --locked --offline --manifest-path src-tauri/Cargo.toml
    if($LASTEXITCODE -ne 0){throw 'Isolated Tauri workload build failed'}
} finally {Pop-Location}
$go=Join-Path $root '../.cache/toolchains/go/go/bin/go.exe'
$env:PATH=(Split-Path $go)+';'+$env:PATH
$env:GOTOOLCHAIN='local'
$env:GOPATH=Join-Path $root '.cache/go-work'
$env:GOMODCACHE=Join-Path $root '.cache/gomod'
$env:GOCACHE=Join-Path $root 'Wails/.cache/go-build'
$env:GOPROXY='off'
Push-Location (Join-Path $stage 'Wails')
try {
    & (Join-Path $root 'Wails/.cache/tools/wails.exe') build -s -skipbindings -webview2 error
    if($LASTEXITCODE -ne 0){throw 'Isolated Wails workload build failed'}
} finally {Pop-Location}
Write-Host 'Supplemental host artifacts built; production artifacts remain unchanged.'
