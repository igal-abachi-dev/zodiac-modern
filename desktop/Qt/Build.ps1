[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try{
 . ./scripts/Toolchain.ps1
 $env:PATH="$(Join-Path $qtRoot 'bin');$env:PATH"
 & $cmake --preset clang-cl-ninja-x64 "-DCMAKE_PREFIX_PATH=$qtRoot" "-DCMAKE_LINKER=$((Get-Command link.exe).Source)"
 if($LASTEXITCODE){throw 'Qt CMake configuration failed.'}
 & $cmake --build out/clang-cl-ninja-x64 --config Release --parallel 4
 if($LASTEXITCODE){throw 'Qt C++/QML build failed.'}
 & $ctest --test-dir out/clang-cl-ninja-x64 -C Release --output-on-failure
 if($LASTEXITCODE){throw 'Qt model checks failed.'}
 $output=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'out/win-x64'))
 if([IO.Path]::GetDirectoryName($output) -ne [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'out'))){throw 'Invalid publish path.'}
 if(Test-Path -LiteralPath $output){Remove-Item -LiteralPath $output -Recurse -Force}
 & $cmake --install out/clang-cl-ninja-x64 --config Release --prefix $output
 if($LASTEXITCODE){throw 'Qt install failed.'}
 & (Join-Path $qtRoot 'bin/windeployqt.exe') --release --no-translations --no-compiler-runtime --qmldir ui (Join-Path $output 'neutronstar_qt.exe')
 if($LASTEXITCODE){throw 'Qt deployment failed.'}
 # App-local Microsoft runtime: do not depend on a developer/system PATH install.
 $redistRoot=Get-ChildItem -LiteralPath (Join-Path $installation 'VC/Redist/MSVC') -Directory |
     Where-Object {$_.Name -match '^14\.\d+\.\d+$'} | Sort-Object {[version]$_.Name} -Descending | Select-Object -First 1
 $crt=Get-ChildItem -Path (Join-Path $redistRoot.FullName 'x64/Microsoft.VC*.CRT') -Directory | Select-Object -First 1
 if(-not $crt -or -not(Test-Path -LiteralPath (Join-Path $crt.FullName 'vcruntime140.dll'))){throw 'Microsoft app-local redistributable CRT is missing.'}
 Copy-Item -Path (Join-Path $crt.FullName '*.dll') -Destination $output
 @('[Paths]','Prefix=.','Plugins=.','QmlImports=qml') | Set-Content -Encoding ASCII (Join-Path $output 'qt.conf')
 New-Item -ItemType Directory -Path (Join-Path $output 'Notices') -Force | Out-Null
 Copy-Item -LiteralPath (Join-Path $installation 'Licenses/1033/Redist.txt') -Destination (Join-Path $output 'Notices/Microsoft-Redist.txt')
 & python scripts/Write-Notices.py $qtRoot $PSScriptRoot $output
 if($LASTEXITCODE){throw 'Qt notices generation failed.'}
 New-Item -ItemType Directory -Path .cache -Force|Out-Null
 $files=@(Get-ChildItem -LiteralPath $output -Recurse -File|Sort-Object FullName|ForEach-Object{@{path=$_.FullName.Substring($output.Length+1).Replace('\','/');bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName).Hash}})
 @{schema=1;qt='6.12.0';compiler=(& clang-cl --version|Select-Object -First 1);renderer='Qt Quick RHI Direct3D11';crt='dynamic /MD';files=$files;comparison='Not run'}|ConvertTo-Json -Depth 6|Set-Content -Encoding UTF8 .cache/build-receipt.json
}finally{Pop-Location}
