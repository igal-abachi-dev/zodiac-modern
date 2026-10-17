[CmdletBinding()]
param([string]$GoPath,[switch]$Offline)
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
    if(-not $GoPath){$GoPath=Join-Path $PSScriptRoot '../../.cache/toolchains/go/go/bin/go.exe'}
    if(-not(Test-Path -LiteralPath $GoPath)){$GoPath='go.exe'}
    $env:GOTOOLCHAIN='local'
    $env:GOPATH=Join-Path $PSScriptRoot '../.cache/go-work'
    $env:GOMODCACHE=Join-Path $PSScriptRoot '../.cache/gomod'
    $env:GOCACHE=Join-Path $PSScriptRoot '.cache/go-build'
    if($Offline){$env:GOPROXY='off'}
    & python ../host-test-support/verify_assets.py --stage frontend
    if($LASTEXITCODE -ne 0){throw 'Frontend verification failed.'}
    & $GoPath mod verify
    if($LASTEXITCODE -ne 0){throw 'Go module verification failed.'}
    & $GoPath test -mod=readonly -tags 'desktop,production,wv2runtime.error' ./...
    if($LASTEXITCODE -ne 0){throw 'Asset policy tests failed.'}
    & $GoPath run github.com/wailsapp/wails/v2/cmd/wails@v2.15.0 build -s -skipbindings -webview2 error
    if($LASTEXITCODE -ne 0){throw 'Wails release build failed.'}
    $receipt=@{go=((& $GoPath version)-join '');wails='2.15.0';mode='standard Wails production; no bound application objects';executableSha256=(Get-FileHash build/bin/neutronstar-wails.exe).Hash;goSumSha256=(Get-FileHash go.sum).Hash;frontendManifestSha256=(Get-FileHash frontend.manifest.json).Hash;nativeAcceptance='pending; no benchmark performed'}
    New-Item -ItemType Directory -Force '.cache' | Out-Null
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.cache/build-receipt.json'),($receipt|ConvertTo-Json),(New-Object Text.UTF8Encoding($false)))
} finally {Pop-Location}
