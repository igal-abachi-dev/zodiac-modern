[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$RunnerPath, [ValidateRange(1,100)][int]$Repeats=10)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$exe=[IO.Path]::GetFullPath($RunnerPath)
$folder=Join-Path $root ('.cache/lifecycle-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $folder | Out-Null
$modes=@('close-before-ready','close-at-environment','close-pending-controller','close-at-controller','quit-before-ready','destroy-before-ready')
$header=Get-Content -LiteralPath (Join-Path $root 'include/neutronstar/host_window.hpp') -Raw
$enum=[regex]::Match($header,'enum class EventKind\s*\{([^}]+)\}').Groups[1].Value.Split(',')
$eventIds=@{};for($e=0;$e -lt $enum.Length;$e++){$eventIds[$enum[$e].Trim()]=$e}
$rows=@()
foreach($i in 0..($Repeats-1)) {
    foreach($mode in $modes) {
        $tag="$i-$mode"; $profile=Join-Path $folder $tag; $report=Join-Path $folder "$tag.jsonl"
        $arguments=@('--assets',('"'+(Join-Path $root 'tests/fixtures/smoke')+'"'),'--profile',('"'+$profile+'"'),'--hidden','--report',('"'+$report+'"'),'--timeout-ms','20000',"--$mode")
        $p=Start-Process -FilePath $exe -ArgumentList $arguments -PassThru -WindowStyle Hidden
        $null=$p.Handle
        if(-not $p.WaitForExit(45000)){throw "Lifecycle deadline: $tag (not a pass)"}
        $p.Refresh()
        $events=@(Get-Content -LiteralPath $report | ForEach-Object { $_ | ConvertFrom-Json })
        if($p.ExitCode -ne 0){throw "$tag exited $($p.ExitCode)"}
        if(@($events | Where-Object { $_.event -eq $eventIds['shutdown_timeout'] }).Count){throw "$tag initialization drain timed out"}
        if($mode -eq 'close-pending-controller' -and -not @($events | Where-Object { $_.event -eq $eventIds['controller_requested'] }).Count){throw 'Pending-controller case never reached request completion'}
        $rows+=@{case=$tag;exitCode=$p.ExitCode;report=$report}
    }
    Write-Output "PASS lifecycle round $i ($($modes.Count) modes)"
}
$deadline=[DateTime]::UtcNow.AddSeconds(30)
do {
    $remaining=@(Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'" | Where-Object { $_.CommandLine -like "*$folder*" })
    if(-not $remaining.Count){break};Start-Sleep -Milliseconds 250
}while([DateTime]::UtcNow -lt $deadline)
@{cases=$rows;remainingHelpers=@($remaining | Select-Object ProcessId,ParentProcessId,CommandLine);runnerSha256=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash;repeats=$Repeats} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $folder 'results.json') -Encoding UTF8
if($remaining.Count){throw "$($remaining.Count) task-owned helpers remain; failure retained in $folder"}
Write-Output "PASS $($rows.Count) lifecycle cases and helper exit: $folder"
