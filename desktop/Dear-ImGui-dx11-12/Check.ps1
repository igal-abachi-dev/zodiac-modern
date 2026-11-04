[CmdletBinding()]param([ValidateSet('auto','dx12','dx11')][string]$Renderer='auto',[switch]$InjectUnavailable,[switch]$StartupOnly,[switch]$Production)
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
 $output=Join-Path $PSScriptRoot ('.cache/check-'+[Guid]::NewGuid().ToString('N'))
 New-Item -ItemType Directory -Force "$output/app"|Out-Null
 if($Production -and $InjectUnavailable){throw 'Fault injection is absent from production.'}
 $name=if($Production){'neutronstar_imgui.exe'}else{'neutronstar_imgui_probe.exe'}
 $source=if($Production){"out/win-x64/$name"}else{"out/clang-cl-ninja-x64/$name"}
 Copy-Item $source "$output/app/$name"
 Copy-Item out/win-x64/assets "$output/app" -Recurse
 Push-Location tests/window-checks
 try {
  & dotnet build -c Release --configfile NuGet.Config -o "$PSScriptRoot/.cache/window-checks-bin"
  if($LASTEXITCODE){throw 'Window checker build failed.'}
 } finally {Pop-Location}
 & dotnet .cache/window-checks-bin/WindowChecks.dll "$output/app/$name" $output $Renderer ([int][bool]$InjectUnavailable) ([int][bool]$StartupOnly) ([int][bool]$Production)
 if($LASTEXITCODE){throw "ImGui check failed; retain $output."}
} finally {Pop-Location}
