[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try{
 & dotnet restore NeutronStar.Reactor.csproj --locked-mode --configfile NuGet.Config;if($LASTEXITCODE){throw 'App restore failed.'}
 & dotnet restore Tests/DomainTests.csproj --locked-mode --configfile NuGet.Config;if($LASTEXITCODE){throw 'Test restore failed.'}
 & dotnet run --project Tests/DomainTests.csproj -c Release --no-restore;if($LASTEXITCODE){throw 'Reducer checks failed.'}
 $output=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'out/win-x64'))
 if([IO.Path]::GetDirectoryName($output) -ne [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'out'))){throw 'Invalid publish path.'}
 if(Test-Path -LiteralPath $output){Remove-Item -LiteralPath $output -Recurse -Force}
 & dotnet publish NeutronStar.Reactor.csproj -c Release --no-restore -p:Platform=x64 -o $output;if($LASTEXITCODE){throw 'Reactor publish failed.'}
 & ./scripts/Write-Notices.ps1
 New-Item -ItemType Directory -Path .cache -Force|Out-Null
 $files=@(Get-ChildItem -LiteralPath $output -Recurse -File|Sort-Object FullName|ForEach-Object{@{path=$_.FullName.Substring($output.Length+1).Replace('\','/');bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName).Hash}})
 @{schema=1;reactor='0.1.0-preview.16';windowsAppSdk='2.5.1';experimental=$true;files=$files;comparison='Not run'}|ConvertTo-Json -Depth 6|Set-Content -Encoding UTF8 .cache/build-receipt.json
}finally{Pop-Location}
