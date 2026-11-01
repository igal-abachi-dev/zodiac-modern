[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
 . ./scripts/Toolchain.ps1
 $source=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.cache/wx-source'))
 if(-not(Test-Path "$source/include/wx/version.h")){throw 'Run Init.cmd first.'}
 & $cmake -S . -B out/clang-cl-ninja-x64 -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=clang-cl -DCMAKE_CXX_COMPILER=clang-cl -DCMAKE_LINKER_TYPE=MSVC "-DWX_SOURCE=$source"
 if($LASTEXITCODE){throw 'wxWidgets configure failed.'}
 & $cmake --build out/clang-cl-ninja-x64 --parallel 4
 if($LASTEXITCODE){throw 'wxWidgets build failed.'}
 & $ctest --test-dir out/clang-cl-ninja-x64 --output-on-failure
 if($LASTEXITCODE){throw 'wxWidgets model tests failed.'}
 & $cmake --install out/clang-cl-ninja-x64 --prefix "$PSScriptRoot/out/win-x64"
 if($LASTEXITCODE){throw 'wxWidgets deployment failed.'}
 New-Item -ItemType Directory -Force out/win-x64/Notices|Out-Null
 Copy-Item "$source/docs/licence.txt","$source/docs/licendoc.txt" out/win-x64/Notices
 Copy-Item assets/Fonts/OFL* out/win-x64/Notices
 $files=@(Get-ChildItem out/win-x64 -Recurse -File|ForEach-Object{@{path=$_.FullName.Substring((Join-Path $PSScriptRoot 'out/win-x64').Length+1);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
 @{wx='3.2.12';compiler=(& clang-cl --version|Select-Object -First 1);linker='Microsoft link.exe';crt='static /MT';renderer='wxMSW native Win32 controls';files=$files}|ConvertTo-Json -Depth 5|Set-Content .cache-build-receipt.json -Encoding UTF8
} finally {Pop-Location}
