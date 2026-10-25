$ErrorActionPreference='Stop'
$sdk=if($env:FLUTTER_ROOT){[IO.Path]::GetFullPath($env:FLUTTER_ROOT)}else{[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.cache/flutter-toolchain/flutter'))}
$flutter=Join-Path $sdk 'bin/flutter.bat'
if(-not(Test-Path -LiteralPath $flutter)){throw 'Install official Flutter stable 3.47.8 and set FLUTTER_ROOT, or use desktop/.cache/flutter-toolchain/flutter.'}
$version=& $flutter --version --machine
if($LASTEXITCODE){throw 'Flutter SDK check failed.'}
$info=($version -join [Environment]::NewLine)|ConvertFrom-Json
if($info.frameworkVersion -ne '3.47.8' -or $info.frameworkRevision -ne '737ba8f885dc774b53b442759999a312c9461e4e'){throw 'Expected pinned Flutter 3.47.8 / 737ba8f885dc774b53b442759999a312c9461e4e.'}
