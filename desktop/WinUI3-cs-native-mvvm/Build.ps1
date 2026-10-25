[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try{
 & dotnet restore NeutronStar.WinUINative.csproj --locked-mode --configfile NuGet.Config;if($LASTEXITCODE){throw 'App restore failed.'}
 & dotnet restore Tests/ModelTests.csproj --locked-mode --configfile NuGet.Config;if($LASTEXITCODE){throw 'Model restore failed.'}
 & dotnet run --project Tests/ModelTests.csproj -c Release --no-restore;if($LASTEXITCODE){throw 'Model checks failed.'}
 $publish=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'out/win-x64'))
 if([IO.Path]::GetDirectoryName($publish) -ne [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'out'))){throw 'Invalid generated output.'}
 if(Test-Path -LiteralPath $publish){Remove-Item -LiteralPath $publish -Recurse -Force}
 & dotnet publish NeutronStar.WinUINative.csproj -c Release --no-restore -p:Platform=x64 -o $publish;if($LASTEXITCODE){throw 'WinUI publication failed.'}
 foreach($name in @('App.xbf','MainWindow.xbf','NeutronStar-WinUI-Mvvm.pri')){if(-not(Test-Path -LiteralPath (Join-Path $publish $name))){throw 'Generated XAML resource missing.'}}
 & (Join-Path $PSScriptRoot 'scripts/Write-Notices.ps1')
 New-Item -ItemType Directory -Path .cache -Force|Out-Null
 $files=@(Get-ChildItem -LiteralPath $publish -File -Recurse|Sort-Object FullName|ForEach-Object{@{path=$_.FullName.Substring($publish.Length+1).Replace('\','/');bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName).Hash}})
 $receipt=@{schema=1;windowsAppSdk='2.5.1';mvvm='8.4.2';sdk='10.0.402';mode='Release unpackaged self-contained .NET and Windows App SDK; untrimmed JIT';assemblySha256=(Get-FileHash out/win-x64/NeutronStar-WinUI-Mvvm.dll).Hash;lockSha256=(Get-FileHash packages.lock.json).Hash;files=$files;comparison='Not run'}
 [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.cache/build-receipt.json'),($receipt|ConvertTo-Json -Depth 6))
}finally{Pop-Location}
