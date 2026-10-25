[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try{& dotnet restore NeutronStar.Avalonia.csproj --locked-mode --configfile NuGet.Config;if($LASTEXITCODE){throw 'Restore failed.'}
 & dotnet restore Tests/Models.Tests.csproj --locked-mode --configfile NuGet.Config;if($LASTEXITCODE){throw 'Test restore failed.'}
 & dotnet run --project Tests/Models.Tests.csproj -c Release --no-restore;if($LASTEXITCODE){throw 'Model tests failed.'}
 $publishRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'out/win-x64'))
 $expectedParent=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'out'))
 if([IO.Path]::GetDirectoryName($publishRoot) -ne $expectedParent -or [IO.Path]::GetFileName($publishRoot) -ne 'win-x64'){throw 'Invalid generated output path.'}
 if(Test-Path -LiteralPath $publishRoot){Remove-Item -LiteralPath $publishRoot -Recurse -Force}
 & dotnet publish NeutronStar.Avalonia.csproj -c Release --no-restore -o $publishRoot;if($LASTEXITCODE){throw 'Publish failed.'}
 & (Join-Path $PSScriptRoot 'scripts/Write-Notices.ps1')
 New-Item -ItemType Directory -Path .cache -Force | Out-Null
 $files=@(Get-ChildItem -LiteralPath $publishRoot -Recurse -File|Sort-Object FullName|ForEach-Object{@{path=$_.FullName.Substring($publishRoot.Length+1).Replace('\','/');bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName).Hash}})
 $receipt=@{schema=1;avalonia='12.1.4';mvvm='8.4.2';mode='self-contained .NET 10 JIT; Skia; standard Fluent controls; unvirtualized list';executableSha256=(Get-FileHash out/win-x64/NeutronStar-Avalonia.exe).Hash;assemblySha256=(Get-FileHash out/win-x64/NeutronStar-Avalonia.dll).Hash;lockSha256=(Get-FileHash packages.lock.json).Hash;files=$files;comparison='Not run'}
 [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.cache/build-receipt.json'),($receipt|ConvertTo-Json -Depth 5))
}finally{Pop-Location}
