[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try{
 & cargo fmt --all -- --check;if($LASTEXITCODE){throw 'Rust formatting failed.'}
 & cargo test --release --locked -j 4;if($LASTEXITCODE){throw 'Rust model tests failed.'}
 & cargo clippy --release --locked --all-targets -j 4 -- -D warnings;if($LASTEXITCODE){throw 'Rust Clippy failed.'}
 & cargo build --release --locked -j 4;if($LASTEXITCODE){throw 'Slint Release build failed.'}
 $output=Join-Path $PSScriptRoot 'out/win-x64'
 New-Item -ItemType Directory -Path $output,.cache -Force|Out-Null
 Copy-Item -LiteralPath target/release/neutronstar-slint.exe -Destination $output
 Copy-Item -LiteralPath assets/Notices -Destination $output -Recurse -Force
 & python scripts/Write-Notices.py
 if($LASTEXITCODE){throw 'Slint notices generation failed.'}
 $files=@(Get-ChildItem -LiteralPath $output -Recurse -File|Sort-Object FullName|ForEach-Object{@{path=$_.FullName.Substring($output.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName).Hash;bytes=$_.Length}})
 @{schema=1;slint='1.18.1';rust=(& rustc --version);backend='winit';renderer='skia';files=$files;comparison='Not run'}|ConvertTo-Json -Depth 6|Set-Content -Encoding UTF8 .cache/build-receipt.json
}finally{Pop-Location}
