$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'scripts/toolchain.ps1')
Push-Location $PSScriptRoot
try { & pnpm desktop:dev; if($LASTEXITCODE){throw 'Tauri development process failed.'} }
finally { Pop-Location }
