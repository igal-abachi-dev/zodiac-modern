# Prefer the repository's pinned tools when available; never install tools silently.
$toolRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$nodeDir=Join-Path $toolRoot '.cache/toolchains/node/node-v24.21.0-win-x64'
$pnpmDir=Join-Path $toolRoot '.cache/bootstrap/node_modules/.bin'
if(Test-Path -LiteralPath (Join-Path $nodeDir 'node.exe')){$env:PATH="$nodeDir;$env:PATH"}
if(Test-Path -LiteralPath (Join-Path $pnpmDir 'pnpm.cmd')){$env:PATH="$pnpmDir;$env:PATH"}
if(-not(Get-Command pnpm -ErrorAction SilentlyContinue)){throw 'Install pnpm 12.8.1, or restore the repository pinned Node/pnpm bootstrap.'}
if((& node --version) -notmatch '^v24\.21\.') {throw 'Use Node 24.21.x for this project.'}
if((& pnpm --version) -ne '12.8.1'){throw 'Use pnpm 12.8.1 for this locked project.'}
