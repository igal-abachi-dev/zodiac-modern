param(
    [Parameter(Mandatory = $true)][string]$Stage,
    [Parameter(Mandatory = $true)][string]$Destination
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stagePath = (Resolve-Path -LiteralPath $Stage).Path
if ((Get-Item -LiteralPath $stagePath).Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw 'Archive root must not be a reparse point.'
}
$manifestPath = Join-Path $stagePath 'manifest.json'
if ((Get-Item -LiteralPath $manifestPath).Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw 'Manifest must not be a reparse point.'
}
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.schema -cne 'ZODIAC-RELEASE-CANDIDATE-1' -or -not @($manifest.files).Count) {
    throw 'Unsupported or empty candidate manifest.'
}
$names = @('manifest.json') + @($manifest.files | ForEach-Object { $_.path })
$expected = @{}
foreach ($record in $manifest.files) {
    if ($record.path -ieq 'manifest.json' -or $expected.ContainsKey($record.path) -or
        $record.sha256 -cnotmatch '^[a-f0-9]{64}$' -or $record.bytes -lt 0) {
        throw 'Invalid or duplicate manifest entry.'
    }
    $expected[$record.path] = $record
}
foreach ($name in $names) {
    if ($name -notmatch '^[A-Za-z0-9_.\/-]+$' -or $name.StartsWith('/')) { throw 'Unsafe archive entry.' }
    $current = $stagePath
    foreach ($part in $name.Split('/')) {
        if (-not $part -or $part -eq '.' -or $part -eq '..' -or $part.EndsWith('.') -or
            $part -match '^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)') { throw 'Unsafe archive entry.' }
        $current = Join-Path $current $part
        if ((Get-Item -LiteralPath $current).Attributes -band [IO.FileAttributes]::ReparsePoint) {
            throw 'Archive paths must not contain reparse points.'
        }
    }
}
$stream = [IO.File]::Open($Destination, [IO.FileMode]::CreateNew, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
try {
    $archive = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Create, $true)
    try {
        foreach ($name in ($names | Sort-Object)) {
            if ($name -notmatch '^[A-Za-z0-9_.\/-]+$' -or $name.StartsWith('/') -or
                @($name.Split('/') | Where-Object { $_ -eq '' -or $_ -eq '.' -or $_ -eq '..' }).Count) {
                throw 'Unsafe archive entry.'
            }
            $source = Join-Path $stagePath $name.Replace('/', '\')
            $item = Get-Item -LiteralPath $source
            if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
                throw 'Only ordinary release files are allowed.'
            }
            $entry = $archive.CreateEntry($name, [IO.Compression.CompressionLevel]::Optimal)
            $entry.LastWriteTime = [DateTimeOffset]::Parse('2000-01-01T00:00:00Z')
            $input = [IO.File]::OpenRead($source)
            $output = $entry.Open()
            try { $input.CopyTo($output) } finally { $output.Dispose(); $input.Dispose() }
        }
    } finally { $archive.Dispose() }
} finally { $stream.Dispose() }
# Read the actual ZIP back; no extraction and no execution of archived content.
$archive = [IO.Compression.ZipFile]::OpenRead($Destination)
try {
    if ($archive.Entries.Count -ne $names.Count) { throw 'Archive file count differs.' }
    foreach ($entry in $archive.Entries) {
        if ($entry.FullName -cnotin $names) { throw 'Unexpected archive entry.' }
        $input = $entry.Open()
        $hash = [Security.Cryptography.SHA256]::Create()
        try { $digest = ([BitConverter]::ToString($hash.ComputeHash($input))).Replace('-', '').ToLowerInvariant() }
        finally { $hash.Dispose(); $input.Dispose() }
        $sourceHash = (Get-FileHash -LiteralPath (Join-Path $stagePath $entry.FullName.Replace('/', '\')) -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($digest -cne $sourceHash) { throw 'Archive bytes differ from staged file.' }
        if ($entry.FullName -cne 'manifest.json') {
            $record = $expected[$entry.FullName]
            if ($digest -cne $record.sha256 -or $entry.Length -ne $record.bytes) {
                throw 'Archive bytes differ from manifest.'
            }
        }
    }
} finally { $archive.Dispose() }
