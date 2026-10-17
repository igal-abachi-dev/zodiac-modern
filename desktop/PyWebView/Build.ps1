[CmdletBinding()]
param([switch]$Restore)
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
    $env:UV_PYTHON_INSTALL_DIR=Join-Path $PSScriptRoot '.cache/python'
    $env:UV_CACHE_DIR=Join-Path $PSScriptRoot '.cache/uv'
    if(-not(Test-Path -LiteralPath '.venv/Scripts/python.exe')) {
        & uv python install 3.13.15
        if($LASTEXITCODE -ne 0){throw 'Python installation failed.'}
        & uv venv --python 3.13.15 .venv
        $Restore=$true
    }
    $python=Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
    if($Restore){
        & uv pip sync --python $python --require-hashes requirements.lock
        if($LASTEXITCODE -ne 0){throw 'Pinned dependency restore failed.'}
    }
    & $python ../host-test-support/verify_assets.py --stage frontend
    if($LASTEXITCODE -ne 0){throw 'Frontend verification failed.'}
    & $python -m unittest -v test_policy
    if($LASTEXITCODE -ne 0){throw 'Asset policy tests failed.'}
    & $python -m PyInstaller --noconfirm --onedir --windowed --name neutronstar-pywebview --collect-all webview --add-data 'frontend;frontend' --add-data 'frontend.manifest.json;.' app.py
    if($LASTEXITCODE -ne 0){throw 'PyInstaller build failed.'}
    $receipt=@{python=((& $python --version)-join '');pywebview='6.2.1';packager='PyInstaller 6.22.3 onedir/windowed';executableSha256=(Get-FileHash dist/neutronstar-pywebview/neutronstar-pywebview.exe).Hash;requirementsSha256=(Get-FileHash requirements.lock).Hash;frontendManifestSha256=(Get-FileHash frontend.manifest.json).Hash;nativeAcceptance='pending; no benchmark performed'}
    New-Item -ItemType Directory -Force '.cache' | Out-Null
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.cache/build-receipt.json'),($receipt|ConvertTo-Json),(New-Object Text.UTF8Encoding($false)))
} finally {Pop-Location}
