$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.cache/imgui-source'))
New-Item -ItemType Directory -Force $root|Out-Null
$archive=Join-Path $root 'imgui-1.93.0.zip'
if(-not(Test-Path $archive)){Invoke-WebRequest 'https://github.com/ocornut/imgui/archive/refs/tags/v1.93.0.zip' -OutFile $archive}
if((Get-FileHash $archive -Algorithm SHA256).Hash -ne 'E21907FD8DD5EA59AA00538632A02AD0A3EDEDB4DDC533B94702331FBCD6C470'){throw 'Dear ImGui source hash mismatch.'}
if(-not(Test-Path "$root/imgui-1.93.0/imgui.cpp")){& tar -xf $archive -C $root;if($LASTEXITCODE){throw 'Extraction failed.'}}
