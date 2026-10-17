[CmdletBinding()]
param(
    [ValidateSet('vanilla','svelte','react','vue','solid','lit','preact','alpine','htmx')]
    [string[]]$Apps=@('vanilla','svelte','react','vue','solid','lit','preact','alpine','htmx'),
    [ValidateSet('Release','Debug')][string]$Configuration='Release',
    [string]$RunnerPath,
    [ValidateSet('primary','workload','diagnostic')][string]$Lane='primary',
    [switch]$Visible=$true
)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
if(-not $RunnerPath){$RunnerPath=Join-Path $root "../NeutronStar-Host/out/clang-cl-ninja-x64/$Configuration/neutronstar_host_runner.exe"}
$RunnerPath=[IO.Path]::GetFullPath($RunnerPath)
if(-not(Test-Path -LiteralPath $RunnerPath -PathType Leaf)){throw 'Build the host first.'}
$run=Join-Path $root ('.cache/host-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $run | Out-Null
$results=@()
foreach($app in $Apps){
    $case=Join-Path $run $app
    $assets=Join-Path $case 'assets'
    $profile=Join-Path $case 'profile'
    $report=Join-Path $case 'host.jsonl'
    New-Item -ItemType Directory -Path $assets | Out-Null
    $distName='dist-test'
    if($Lane -eq 'workload'){$distName='dist-workload-test'}
    if($Lane -eq 'diagnostic'){$distName='dist-diagnostic-test'}
    $dist=Join-Path $root "apps/$app/$distName"
    if(-not(Test-Path -LiteralPath (Join-Path $dist 'index.html'))){throw "Build test assets first: $app"}
    Copy-Item -Path (Join-Path $dist '*') -Destination $assets -Recurse
    $record=[ordered]@{app=$app;lane=$Lane;configuration=$Configuration;host_sha256=(Get-FileHash -LiteralPath $RunnerPath).Hash;status='running';report=$report;performance='not measured';hidden_correctness_only=(-not $Visible)}
    $process=$null
    try{
        $arguments=@('--assets',('"'+$assets+'"'),'--profile',('"'+$profile+'"'),'--smoke-test','--report',('"'+$report+'"'),'--timeout-ms','20000')
        $windowStyle='Normal'
        if(-not $Visible){$arguments+='--hidden';$windowStyle='Hidden'}
        $process=Start-Process -FilePath $RunnerPath -ArgumentList $arguments -PassThru -WindowStyle $windowStyle
        if(-not $process.WaitForExit(30000)){$process.Kill();throw 'Host test deadline exceeded; recovery kill is not a successful shutdown.'}
        $process.Refresh()
        if($process.ExitCode -ne 0){throw "Host test exited $($process.ExitCode)"}
        $deadline=[DateTime]::UtcNow.AddSeconds(30)
        do{
            $remaining=@(Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'" | Where-Object {$_.CommandLine -like "*$profile*"})
            if(-not $remaining.Count){break}
            Start-Sleep -Milliseconds 200
        }while([DateTime]::UtcNow -lt $deadline)
        if($remaining.Count){throw 'Profile-associated browser helpers remained after 30 seconds.'}
        $record.status='passed'
        Write-Output "PASS $app ($Configuration/$Lane): UI/state/dialog/progress/CSP and helper shutdown"
    }catch{
        $record.status='failed';$record.error=$_.Exception.Message
        Write-Output "FAIL ${app}: $($record.error)"
    }finally{if($process){$process.Dispose()}}
    $results+=[pscustomobject]$record
    $results | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $run 'results.json') -Encoding UTF8
}
Write-Output "Reports: $run"
if(@($results|Where-Object status -ne 'passed').Count){throw 'One or more frontend correctness cases failed.'}
