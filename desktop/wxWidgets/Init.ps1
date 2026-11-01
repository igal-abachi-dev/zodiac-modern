$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.cache/wx-source'))
New-Item -ItemType Directory -Force $root|Out-Null
$archive=Join-Path $root 'wxWidgets-3.2.12.zip'
if(-not(Test-Path $archive)){Invoke-WebRequest 'https://github.com/wxWidgets/wxWidgets/releases/download/v3.2.12/wxWidgets-3.2.12.zip' -OutFile $archive}
if((Get-FileHash $archive -Algorithm SHA256).Hash -ne '1F7EC935DDDBBA5CF454795DC255EF1E21C668533F5A5951A6034F2949C80433'){throw 'wx source hash mismatch.'}
if(-not(Test-Path "$root/include/wx/version.h")){& tar -xf $archive -C $root;if($LASTEXITCODE){throw 'wx extraction failed.'}}
