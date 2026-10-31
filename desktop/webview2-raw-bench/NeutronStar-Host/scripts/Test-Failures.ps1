[CmdletBinding()]param([Parameter(Mandatory)][string]$RunnerPath)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$exe=[IO.Path]::GetFullPath($RunnerPath)
$folder=Join-Path $root ('.cache/failures-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $folder | Out-Null
$header=Get-Content (Join-Path $root 'include/neutronstar/host_window.hpp') -Raw
$enum=[regex]::Match($header,'enum class EventKind\s*\{([^}]+)\}').Groups[1].Value.Split(',')
$ids=@{};for($i=0;$i -lt $enum.Length;$i++){$ids[$enum[$i].Trim()]=$i}
$results=@()
function Read-Events([string]$path,[switch]$Final) {
 if(-not(Test-Path -LiteralPath $path)){if($Final){throw 'Missing diagnostic report'};return}
 $stream=[IO.File]::Open($path,[IO.FileMode]::Open,[IO.FileAccess]::Read,([IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete))
 $reader=[IO.StreamReader]::new($stream,[Text.Encoding]::UTF8,$true)
 try{$text=$reader.ReadToEnd()}finally{$reader.Dispose()}
 $end=$text.LastIndexOf("`n")
 if($Final -and $end -ne $text.Length-1){throw 'Incomplete diagnostic record after exit'}
 if($end -lt 0){return}
 $text.Substring(0,$end+1) -split '\r?\n' | Where-Object {$_} | ForEach-Object {$_|ConvertFrom-Json}
}
foreach($kind in @('renderer','browser')) {
 $profile=Join-Path $folder $kind;$report=Join-Path $folder ($kind+'.jsonl')
 $args=@('--assets',('"'+(Join-Path $root 'tests/fixtures/smoke')+'"'),'--profile',('"'+$profile+'"'),'--entry','failure.html','--failure-test','--hidden','--report',('"'+$report+'"'),'--timeout-ms','30000')
 $p=Start-Process -FilePath $exe -ArgumentList $args -PassThru -WindowStyle Hidden
 $null=$p.Handle
 try {
  $end=[DateTime]::UtcNow.AddSeconds(25)
  do{Start-Sleep -Milliseconds 50;$events=@(Read-Events $report);if(@($events|Where-Object action_pending -eq $true).Count){break}}while(-not $p.HasExited -and [DateTime]::UtcNow -lt $end)
  if(-not @($events|Where-Object action_pending -eq $true).Count){throw 'No pending synthetic action before fault'}
  # Ownership comes from this unique profile plus live PID/creation identity.
  $owned=@(Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'"|Where-Object {$_.CommandLine -and $_.CommandLine.IndexOf($profile,[StringComparison]::OrdinalIgnoreCase) -ge 0})
  $victim=$owned|Where-Object {if($kind -eq 'renderer'){$_.CommandLine -match '--type=renderer'}else{$_.CommandLine -notmatch '--type='}}|Select-Object -First 1
  if(-not $victim){throw "No owned $kind process found"}
  $cursor=$victim;$descendant=$false
  for($depth=0;$depth -lt 8;$depth++){
   if($cursor.ParentProcessId -eq $p.Id){$descendant=$true;break}
   $cursor=Get-CimInstance Win32_Process -Filter ("ProcessId="+[int]$cursor.ParentProcessId)
   if(-not $cursor){break}
  }
  if(-not $descendant){throw 'Fault target is not a descendant of this test host'}
  $identity=Get-Process -Id $victim.ProcessId
  if([Math]::Abs(($identity.StartTime.ToUniversalTime()-$victim.CreationDate.ToUniversalTime()).TotalMilliseconds) -gt 1){throw 'Fault target identity mismatch'}
  $identity.Kill();$identity.Dispose()
  if(-not $p.WaitForExit(35000)){throw 'Failed host did not shut down'};$p.Refresh()
  $events=@(Read-Events $report -Final)
  $failure=@($events|Where-Object {$_.event -eq $ids.process_failed})
  if($p.ExitCode -ne 1 -or $failure.Count -ne 1 -or $failure[0].process_kind -lt 0 -or $null -eq $failure[0].process_reason -or $null -eq $failure[0].process_exit_code){throw 'Missing structured process failure or incorrect terminal result'}
  if(-not @($events|Where-Object bridge_closed -eq $true).Count){throw 'Failed bridge accepted a stale completion'}
  if(@($events|Where-Object {$_.event -eq $ids.environment_starting}).Count -ne 1){throw 'Unexpected automatic recreation'}
  $deadline=[DateTime]::UtcNow.AddSeconds(30)
  do{$remaining=@(Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'"|Where-Object {$_.CommandLine -and $_.CommandLine.IndexOf($profile,[StringComparison]::OrdinalIgnoreCase) -ge 0});if(-not $remaining.Count){break};Start-Sleep -Milliseconds 100}while([DateTime]::UtcNow -lt $deadline)
  if($remaining.Count){throw 'Faulted application left owned browser helpers running'}
  $results+=@{case=$kind;status='passed';exitCode=$p.ExitCode;failure=$failure[0];helpersExited=$true;automaticRecovery=$false}
 }finally{if(-not $p.HasExited){$null=$p.CloseMainWindow();$null=$p.WaitForExit(5000)};$p.Dispose()}
}
$results|ConvertTo-Json -Depth 6|Set-Content -Encoding UTF8 (Join-Path $folder 'result.json')
Write-Output "PASS controlled failure paths: $folder"
