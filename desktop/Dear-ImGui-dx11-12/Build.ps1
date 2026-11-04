[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
 New-Item -ItemType Directory -Force .cache|Out-Null
 . ./scripts/Toolchain.ps1
 & ./Init.ps1
 $source=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.cache/imgui-source/imgui-1.93.0'))
 & $cmake -S . -B out/clang-cl-ninja-x64 -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_COMPILER=clang-cl -DCMAKE_LINKER_TYPE=MSVC "-DIMGUI_SOURCE=$source"
 if($LASTEXITCODE){throw 'ImGui configure failed.'}
 & $cmake --build out/clang-cl-ninja-x64 --parallel 4
 if($LASTEXITCODE){throw 'ImGui build failed.'}
 & $ctest --test-dir out/clang-cl-ninja-x64 --output-on-failure
 if($LASTEXITCODE){throw 'ImGui domain tests failed.'}
 & $cmake --install out/clang-cl-ninja-x64 --prefix "$PSScriptRoot/out/win-x64"
 if($LASTEXITCODE){throw 'ImGui publish failed.'}
 $root=Join-Path $PSScriptRoot 'out/win-x64'
 $files=@(Get-ChildItem $root -Recurse -File|ForEach-Object{@{path=$_.FullName.Substring($root.Length+1).Replace('\','/');bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
 @{imgui='1.93.0';compiler=(& clang-cl --version|Select-Object -First 1);linker='Microsoft link.exe';crt='static /MT';default='DX12 then DX11';files=$files}|ConvertTo-Json -Depth 5|Set-Content .cache/build-receipt.json -Encoding UTF8
} finally {Pop-Location}
