[CmdletBinding()]
param([string]$NodePath)

$ErrorActionPreference = 'Stop'
if (-not $NodePath) {
    $pinnedNode = Join-Path $PSScriptRoot '../../.cache/toolchains/node/node-v24.21.0-win-x64/node.exe'
    if (Test-Path -LiteralPath $pinnedNode) {
        $NodePath = $pinnedNode
    } else {
        $NodePath = (Get-Command node.exe -ErrorAction Stop).Source
    }
}
if ((& $NodePath --version) -notmatch '^v24\.21\.') {
    throw 'Use Node 24.21.x, or supply its executable with -NodePath.'
}
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dist/index.html'))) {
    throw 'Build the frontend first with init.cmd or pnpm build.'
}
foreach ($package in @('fastify', '@fastify/static')) {
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot "scripts/preview/node_modules/$package/package.json"))) {
        throw 'Install preview dependencies with: pnpm --dir scripts/preview install --ignore-workspace --frozen-lockfile --ignore-scripts'
    }
}

Push-Location $PSScriptRoot
try {
    Write-Host 'Open http://127.0.0.1:4188/ in your browser. Keep this window open; Ctrl+C stops the server.'
    & $NodePath (Join-Path $PSScriptRoot 'scripts/serve.mjs')
    if ($LASTEXITCODE -ne 0) { throw "Browser preview exited with code $LASTEXITCODE." }
} finally {
    Pop-Location
}
