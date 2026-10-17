[CmdletBinding()]
param(
    [ValidateSet('vanilla','svelte','react','vue','solid','lit','preact','alpine','htmx')][string]$App='vanilla',
    [ValidateSet('Release','Debug')][string]$Configuration='Release',
    [string]$RunnerPath,
    [string]$ProfilePath,
    [string]$ReportPath,
    [string]$ReceiptPath
)
$scriptStartedQpc=[Diagnostics.Stopwatch]::GetTimestamp()
$ErrorActionPreference='Stop'
if(-not $RunnerPath){$RunnerPath=Join-Path $PSScriptRoot "../NeutronStar-Host/out/clang-cl-ninja-x64/$Configuration/neutronstar_host_runner.exe"}
$assets=Join-Path $PSScriptRoot "apps/$App/dist"
$profile=Join-Path $PSScriptRoot ".cache/interactive/$App"
if($ProfilePath){$profile=$ProfilePath}
if(-not(Test-Path -LiteralPath $RunnerPath)){throw 'Build NeutronStar-Host first.'}
if(-not(Test-Path -LiteralPath (Join-Path $assets 'index.html'))){throw 'Run pnpm build first.'}
$arguments=@('--assets',('"'+$assets+'"'),'--profile',('"'+$profile+'"'))
if($ReportPath){$arguments+=@('--report',('"'+$ReportPath+'"'))}
$beforeSpawnQpc=[Diagnostics.Stopwatch]::GetTimestamp()
$process=Start-Process -FilePath $RunnerPath -ArgumentList $arguments -WindowStyle Normal -PassThru
$afterSpawnQpc=[Diagnostics.Stopwatch]::GetTimestamp()
if($ReceiptPath){
    $receipt=@{pid=$process.Id;shellPid=$PID;scriptStartedQpc=$scriptStartedQpc;beforeSpawnQpc=$beforeSpawnQpc;afterSpawnQpc=$afterSpawnQpc}
    $temporaryReceipt=$ReceiptPath+'.tmp'
    [IO.File]::WriteAllText($temporaryReceipt,($receipt|ConvertTo-Json -Compress),(New-Object Text.UTF8Encoding($false)))
    [IO.File]::Move($temporaryReceipt,$ReceiptPath)
}
Write-Output "$App launched, PID $($process.Id). No bridge, custom title bar or low-memory override."
