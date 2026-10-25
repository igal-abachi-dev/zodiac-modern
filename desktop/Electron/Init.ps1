[CmdletBinding()]param()
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'scripts/toolchain.ps1')
Push-Location $PSScriptRoot
try{& pnpm install --frozen-lockfile --ignore-scripts;if($LASTEXITCODE){throw 'Dependency installation failed.'}
 & node node_modules/electron/install.js;if($LASTEXITCODE){throw 'Official Electron binary installation failed.'}
}finally{Pop-Location}
