[CmdletBinding()]
param([ValidateSet('install','typecheck','build','build:test','build:workloads','build:workload-tests','build:diagnostics','build:workload-diagnostics','build:diagnostic-tests','test:diagnostics','test:workloads','test','test:browser','build:design')][string]$Task='build')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$localNode=Join-Path $root '../../../.cache/toolchains/node/node-v24.21.0-win-x64'
if(Test-Path -LiteralPath (Join-Path $localNode 'node.exe')){$env:PATH="$localNode;$env:PATH"}
$node=(Get-Command node.exe -ErrorAction Stop).Source
if((& $node --version) -notmatch '^v24\.21\.'){throw 'Use Node 24.21.x; this workspace is pinned separately from the website.'}
$repoPnpm=Join-Path $root '../../../.cache/bootstrap/node_modules/pnpm/bin/pnpm.mjs'
Push-Location $root
try{
    if(Test-Path -LiteralPath $repoPnpm){$program=$node;$prefix=@($repoPnpm)}
    else{$program=(Get-Command pnpm.cmd -ErrorAction Stop).Source;$prefix=@()}
    if((& $program @prefix --version) -ne '12.8.1'){throw 'Install/use pnpm 12.8.1 for this workspace.'}
    # pnpm writes normal script banners to stderr; Windows PowerShell must not
    # turn redirected informational output into a terminating exception.
    $savedPreference=$ErrorActionPreference
    try{
        $ErrorActionPreference='Continue'
        if($Task -eq 'install'){& $program @prefix install --frozen-lockfile --ignore-scripts}
        else{& $program @prefix run $Task}
        $commandExit=$LASTEXITCODE
    }finally{$ErrorActionPreference=$savedPreference}
    if($commandExit){throw "Workspace $Task failed (exit $commandExit)."}
}finally{Pop-Location}
