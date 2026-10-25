[CmdletBinding()]param()
$ErrorActionPreference='Stop'
try{
 $exe=Join-Path $PSScriptRoot 'build/windows/x64/runner/Release/neutronstar_flutter.exe'
 if(-not(Test-Path -LiteralPath $exe)){throw 'Run Build.ps1 first.'}
 & $exe
 if($LASTEXITCODE){throw "Flutter exited with code $LASTEXITCODE."}
}catch{Write-Error $_;Read-Host 'Press Enter to close';exit 1}
