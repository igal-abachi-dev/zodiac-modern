[CmdletBinding()]
param([string[]]$Candidates=@('Avalonia','Electron','WinUI','Reactor','Flutter','Qt','Slint','ReactNative','Wx','Tauri'))
$ErrorActionPreference='Stop'
$desktop=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$results=@()
foreach($candidate in $Candidates){
    $log=Join-Path $PSScriptRoot ($candidate.ToLowerInvariant()+'-check.log')
    # Separate process: preserve native stderr without PowerShell 5 treating it
    # as a terminating script error. GUI checks run sequentially, never in parallel.
    $ErrorActionPreference='Continue'
    & powershell.exe -NoProfile -File (Join-Path $desktop 'host-test-support/candidate-checks/Run.ps1') -Candidate $candidate *> $log
    $code=$LASTEXITCODE
    $ErrorActionPreference='Stop'
    $results+=@{candidate=$candidate;exitCode=$code;log=$log}
    $results|ConvertTo-Json -Depth 4|Set-Content (Join-Path $PSScriptRoot 'checks.json') -Encoding UTF8
    Write-Output "$candidate check exit=$code"
}
if(@($results|Where-Object {$_.exitCode -ne 0}).Count){exit 1}
