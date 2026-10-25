[CmdletBinding()]param()
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'scripts/toolchain.ps1')
Push-Location $PSScriptRoot
try{& pnpm desktop:package;if($LASTEXITCODE){throw 'Electron build failed.'}}finally{Pop-Location}
