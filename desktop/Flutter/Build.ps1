[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try{
 . ./Toolchain.ps1
 & $flutter pub get --enforce-lockfile;if($LASTEXITCODE){throw 'Locked restore failed.'}
 & (Join-Path $sdk 'bin/dart.bat') format --output=none --set-exit-if-changed lib test;if($LASTEXITCODE){throw 'Dart formatting failed.'}
 & $flutter analyze --no-pub;if($LASTEXITCODE){throw 'Analysis failed.'}
 & $flutter test --no-pub;if($LASTEXITCODE){throw 'Correctness tests failed.'}
 & $flutter build windows --release --no-pub;if($LASTEXITCODE){throw 'Windows build failed.'}
 $output=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'build/windows/x64/runner/Release'))
 Copy-Item -LiteralPath (Join-Path $sdk 'bin/cache/pkg/sky_engine/LICENSE') -Destination (Join-Path $output 'FLUTTER-ENGINE-NOTICES.txt')
 Copy-Item -LiteralPath (Join-Path $sdk 'bin/cache/dart-sdk/LICENSE') -Destination (Join-Path $output 'DART-LICENSE.txt')
 New-Item -ItemType Directory -Path .cache -Force|Out-Null
 $files=@(Get-ChildItem -LiteralPath $output -Recurse -File|Sort-Object FullName|ForEach-Object{@{path=$_.FullName.Substring($output.Length+1).Replace('\','/');bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName).Hash}})
 @{schema=1;flutter=$info;files=$files;comparison='Not run'}|ConvertTo-Json -Depth 8|Set-Content -Encoding UTF8 .cache/build-receipt.json
}finally{Pop-Location}
