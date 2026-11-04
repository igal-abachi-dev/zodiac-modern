$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
 $cases=@(
  @{Renderer='dx12'},
  @{Renderer='dx11'},
  @{Renderer='auto';InjectUnavailable=$true;StartupOnly=$true},
  @{Renderer='auto';StartupOnly=$true},
  @{Renderer='dx12';Production=$true;StartupOnly=$true},
  @{Renderer='dx11';Production=$true;StartupOnly=$true}
 )
 foreach($case in $cases){& ./Check.ps1 @case}
 # Strict DX12 must exit on unavailability instead of silently choosing DX11.
 $output=Join-Path $PSScriptRoot ('.cache/negative-'+[Guid]::NewGuid().ToString('N'))
 New-Item -ItemType Directory -Force $output|Out-Null
 Copy-Item out/clang-cl-ninja-x64/neutronstar_imgui_probe.exe $output
 Copy-Item out/win-x64/assets $output -Recurse
 $process=Start-Process -FilePath "$output/neutronstar_imgui_probe.exe" -ArgumentList @('--renderer','dx12','--inject-dx12-unavailable') -WorkingDirectory $output -WindowStyle Hidden -PassThru
 try {
  if(-not $process.WaitForExit(10000)){$process.Kill();throw 'Strict DX12 negative test hung.'}
  if($process.ExitCode -ne 2){throw "Strict DX12 failure must exit 2, got $($process.ExitCode)."}
  @{scenario='forced DX12 unavailable with strict dx12 selection';expectedExitCode=2;actualExitCode=$process.ExitCode;status='passed';testOnly=$true}|ConvertTo-Json|Set-Content "$output/result.json" -Encoding UTF8
 } finally {$process.Dispose()}
} finally {Pop-Location}
