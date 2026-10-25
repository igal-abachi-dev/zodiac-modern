$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$node=Join-Path $repo '.cache/toolchains/node/node-v24.21.0-win-x64'
$pnpm=Join-Path $repo '.cache/bootstrap/node_modules/.bin'
if(Test-Path (Join-Path $node 'node.exe')){$env:PATH="$node;$env:PATH"}
if(Test-Path (Join-Path $pnpm 'pnpm.cmd')){$env:PATH="$pnpm;$env:PATH"}
if((& node --version) -notmatch '^v24\.21\.') {throw 'Use Node 24.21.x.'}
if((& pnpm --version) -ne '12.8.1'){throw 'Use pnpm 12.8.1.'}
