[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedSHA256
)
$ErrorActionPreference = 'Stop'
$file = Get-Item -LiteralPath $Path
if ($file.PSIsContainer -or $file.Extension -ne '.html' -or ($file.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'Select an ordinary local HTML file.'
}
$actual = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
if (-not [String]::Equals($actual, $ExpectedSHA256, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Sender hash mismatch. Do not open this file or type any message into it.'
}
Write-Host 'Full HTML SHA-256 matches the supplied value. Only open it if that value came from an independent trusted publisher channel. The file was not opened automatically.'
