[CmdletBinding()]param()
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$desktop=Split-Path $root -Parent
$checker=Join-Path $desktop 'host-test-support/candidate-checks/Run.ps1'
& $checker -Candidate Qt
if($LASTEXITCODE){throw 'Normal Qt accessibility/correctness smoke failed'}
$stage=Join-Path $root ('.cache/contrast-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
Get-ChildItem -LiteralPath (Join-Path $root 'out/win-x64') -Force | Copy-Item -Destination $stage -Recurse
$probe=Join-Path $root 'out/clang-cl-ninja-x64/Release/neutronstar_qt_probe.exe'
Copy-Item -LiteralPath $probe -Destination $stage
& $checker -Candidate Qt -RunnerPath (Join-Path $stage 'neutronstar_qt_probe.exe') -HighContrastProbe
if($LASTEXITCODE){throw 'Synthetic contrast-palette accessibility/correctness smoke failed'}
Write-Output 'PASS normal and synthetic contrast-palette smoke. Physical AT, OS contrast integration and IME composition are not certified by these checks.'
