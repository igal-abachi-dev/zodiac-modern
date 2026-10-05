[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedSHA256,
    [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$ExpectedPublisher
)
$ErrorActionPreference = 'Stop'
$file = Get-Item -LiteralPath $Path
if ($file.PSIsContainer -or $file.Extension -ne '.exe' -or ($file.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'Select an ordinary local receiver executable.'
}
$actual = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
if (-not [String]::Equals($actual, $ExpectedSHA256, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Receiver hash mismatch. Do not run this file.'
}
$signature = Get-AuthenticodeSignature -LiteralPath $file.FullName
if ($signature.Status -ne 'Valid' -or -not $signature.SignerCertificate -or
    -not [String]::Equals($signature.SignerCertificate.Subject, $ExpectedPublisher, [StringComparison]::Ordinal)) {
    throw 'Receiver signature or expected publisher mismatch. Do not run this file or bypass Windows warnings.'
}
Write-Host 'Hash, Valid Authenticode signature and exact certificate Subject match the supplied expectations. Run only if those expectations came from an independent trusted channel and this release was reviewed. No file was executed.'
