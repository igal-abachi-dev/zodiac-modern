[CmdletBinding()]
param([switch]$Offline)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$lock = Get-Content (Join-Path $root 'dependencies.lock.json') -Raw | ConvertFrom-Json
Add-Type -AssemblyName System.IO.Compression.FileSystem
foreach ($package in $lock.packages) {
    $id = $package.id.ToLowerInvariant()
    $name = "$id.$($package.version)"
    $download = Join-Path $root ".cache/downloads/$name.nupkg"
    $destination = Join-Path $root ".packages/$name"
    if (-not (Test-Path -LiteralPath $download)) {
        if ($Offline) { throw "Missing cached package: $name" }
        New-Item -ItemType Directory -Force (Split-Path $download -Parent) | Out-Null
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -UseBasicParsing -Uri "https://api.nuget.org/v3-flatcontainer/$id/$($package.version)/$name.nupkg" -OutFile $download
    }
    if ((Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash.ToLowerInvariant() -ne $package.sha256) {
        throw "Package digest mismatch: $name"
    }
    if (-not (Test-Path -LiteralPath $destination)) {
        [IO.Compression.ZipFile]::ExtractToDirectory($download, $destination)
    }
    # Verify the complete extracted file set against the pinned archive, including extras.
    $archive = [IO.Compression.ZipFile]::OpenRead($download)
    try {
        $expected = @{}
        foreach ($entry in $archive.Entries) {
            if ($entry.FullName.EndsWith('/')) { continue }
            $relative = $entry.FullName.Replace('/', '\')
            $expected[$relative] = $true
            $path = Join-Path $destination $relative
            if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing dependency file: $relative" }
            $stream = $entry.Open()
            $sha = [Security.Cryptography.SHA256]::Create()
            try { $hash = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '') }
            finally { $sha.Dispose(); $stream.Dispose() }
            if ($hash -ne (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash) { throw "Modified dependency file: $relative" }
        }
        foreach ($file in Get-ChildItem -LiteralPath $destination -Recurse -File) {
            $relative = $file.FullName.Substring($destination.Length + 1)
            if (-not $expected.ContainsKey($relative)) { throw "Extra dependency file: $relative" }
        }
    }
    finally { $archive.Dispose() }
    Write-Output "Verified $name"
}
