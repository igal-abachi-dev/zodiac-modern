[CmdletBinding()]param()
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$folder=Join-Path $root ('.cache/clean-machine-'+[Guid]::NewGuid().ToString('N'))
$stage=Join-Path $folder 'readonly'
$results=Join-Path $folder 'results'
New-Item -ItemType Directory -Path $stage,$results | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'out/win-x64') -Destination (Join-Path $stage 'payload') -Recurse
Copy-Item -LiteralPath (Join-Path $root '.cache/build-receipt.json') -Destination (Join-Path $stage 'build-receipt.json')
$verification=@'
$ErrorActionPreference='Stop'
$report='C:\NeutronStar-Results\startup.jsonl'
$result=@{scope='clean Windows Sandbox; no developer tools or network';status='failed'}
try {
 $exe='C:\NeutronStar\payload\neutronstar_qt.exe'
 $receipt=Get-Content -LiteralPath C:\NeutronStar\build-receipt.json -Raw|ConvertFrom-Json
 foreach($file in $receipt.files){if((Get-FileHash -LiteralPath (Join-Path C:\NeutronStar\payload $file.path)).Hash -ne $file.sha256){throw 'Payload hash mismatch'}}
 $result.sha256=(Get-FileHash -LiteralPath $exe).Hash
 $env:PATH="$env:SystemRoot\System32;$env:SystemRoot"
 $p=Start-Process -FilePath $exe -ArgumentList @('--verify-startup','--no-dialogs','--diagnostics',$report) -WorkingDirectory C:\ -PassThru
 if(-not $p.WaitForExit(40000)){throw 'Startup deadline'};$p.Refresh()
 $events=@(Get-Content -LiteralPath $report|ForEach-Object {$_|ConvertFrom-Json})
 $result.exitCode=$p.ExitCode
 $result.events=$events
 if($p.ExitCode -eq 0 -and @($events|Where-Object {$_.event -eq 'ready' -and $_.verifiedHardware}).Count){$result.status='passed'}
}catch {$result.error=$_.Exception.Message}
$result|ConvertTo-Json -Depth 6|Set-Content -Encoding UTF8 C:\NeutronStar-Results\result.json
'@
[IO.File]::WriteAllText((Join-Path $stage 'verify.ps1'),$verification)
$readonly=[Security.SecurityElement]::Escape($stage)
$writable=[Security.SecurityElement]::Escape($results)
$configuration=@"
<Configuration>
 <Networking>Disable</Networking><ClipboardRedirection>Disable</ClipboardRedirection><vGPU>Enable</vGPU>
 <MappedFolders>
  <MappedFolder><HostFolder>$readonly</HostFolder><SandboxFolder>C:\NeutronStar</SandboxFolder><ReadOnly>true</ReadOnly></MappedFolder>
  <MappedFolder><HostFolder>$writable</HostFolder><SandboxFolder>C:\NeutronStar-Results</SandboxFolder><ReadOnly>false</ReadOnly></MappedFolder>
 </MappedFolders>
 <LogonCommand><Command>powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\NeutronStar\verify.ps1</Command></LogonCommand>
</Configuration>
"@
$file=Join-Path $folder 'Qt-CleanMachine.wsb'
[IO.File]::WriteAllText($file,$configuration)
@{status='not-run';sandboxAvailable=(Test-Path "$env:SystemRoot/System32/WindowsSandbox.exe");configuration=$file;payloadSha256=(Get-FileHash -LiteralPath (Join-Path $stage 'payload/neutronstar_qt.exe')).Hash;reason='Generator does not enable/install Windows features or launch a VM'}|ConvertTo-Json|Set-Content -Encoding UTF8 (Join-Path $folder 'preflight.json')
Write-Output "Prepared clean-machine check: $file"
