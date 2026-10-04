# Run this yourself in a trusted local console. This helper has no password parameter.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Receiver,
    [Parameter(Mandatory = $true)][string]$Key,
    [Parameter(Mandatory = $true)][string]$EncryptedBackup,
    [Parameter(Mandatory = $true)][string]$PublicPEM,
    [Parameter(Mandatory = $true)][string]$Ciphertext,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-f0-9]{64}$')][string]$ExpectedFingerprint,
    [Parameter(Mandatory = $true)][ValidatePattern('^Zodiac readiness: [a-f0-9]{32}$')][string]$ExpectedToken
)
$ErrorActionPreference = 'Stop'
if ([Console]::IsInputRedirected -or [Console]::IsOutputRedirected) { throw 'Run the readiness drill in your own interactive console; passwords go only to the hidden receiver prompt.' }
function Ordinary-Path([string]$Value, [bool]$Existing) {
    if ($Value -match '^(\\\\|//)' -or $Value -match '[<>"|?*]' -or $Value -match '^[A-Za-z]:[^\\/]') { throw 'Use ordinary absolute or relative local paths.' }
    $absolute = [IO.Path]::GetFullPath($Value)
    if ($absolute -notmatch '^[A-Za-z]:[\\/]' -or $absolute.Substring(2).Contains(':')) { throw 'Network, device and stream paths are not supported.' }
    $item = if ($Existing) { Get-Item -LiteralPath $absolute -Force } else { [IO.DirectoryInfo]([IO.Path]::GetDirectoryName($absolute)) }
    while ($item) {
        if (-not $item.Exists -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Use existing ordinary local parents without reparse points.' }
        $item = if ($item -is [IO.FileInfo]) { $item.Directory } else { $item.Parent }
    }
    return $absolute
}
$receiverPath = Ordinary-Path $Receiver $true
$keyPath = Ordinary-Path $Key $true
$backupPath = Ordinary-Path $EncryptedBackup $true
$publicPath = Ordinary-Path $PublicPEM $true
$ciphertextPath = Ordinary-Path $Ciphertext $true
$destinationPath = Ordinary-Path $Destination $false
if (Test-Path -LiteralPath $destinationPath) { throw 'Choose a new drill folder. Nothing is overwritten.' }
if ($keyPath -ieq $backupPath) { throw 'Choose the separately backed-up encrypted final key, not the working key itself.' }
$drive = New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($destinationPath))
if ($drive.DriveType -ne 'Fixed' -or $drive.DriveFormat -ne 'NTFS') { throw 'Restore into a nonsynced local fixed NTFS folder.' }
if ((Get-Item -LiteralPath $backupPath).Length -gt 16384) { throw 'Encrypted backup exceeds the key-file limit.' }
Write-Host 'Development readiness drill with a NONSECRET token only. The executable is not a signed release. Passwords are entered solely at its hidden local prompts.'
function Verify-Pair([string]$PrivatePath) {
    $lines = & $receiverPath verify-key --key $PrivatePath --public $publicPath
    if ($LASTEXITCODE -ne 0) { throw 'Receiver pair verification failed; retain the working key and intermediate.' }
    $summary = $lines -join "`n"
    Write-Host $summary
    if ($summary -cnotmatch ('(?m)^RSA-(3072|4096) SHA-256 ' + [regex]::Escape($ExpectedFingerprint) + '\s*$')) { throw 'Actual receiver fingerprint differs from the independently verified expected value.' }
}
Write-Host 'First, unlock the ORIGINAL final key and verify its actual public half.'
Verify-Pair $keyPath
$owner = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetOwner($owner)
$acl.SetAccessRuleProtection($true, $false)
$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($owner, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
[IO.Directory]::CreateDirectory($destinationPath) | Out-Null
Set-Acl -LiteralPath $destinationPath -AclObject $acl
$actualACL = Get-Acl -LiteralPath $destinationPath
if (-not $actualACL.AreAccessRulesProtected -or $actualACL.Access.Count -ne 1 -or $actualACL.Access[0].IdentityReference.Translate([Security.Principal.SecurityIdentifier]) -ne $owner) { throw 'Protected current-user-only restore folder check failed; no backup was copied.' }
$restored = Join-Path $destinationPath 'restored-final-encrypted.pem'
[IO.File]::Copy($backupPath, $restored, $false)
Write-Host 'Now unlock the RESTORED encrypted backup using the separately backed-up passphrase.'
Verify-Pair $restored
$expected = [Text.Encoding]::UTF8.GetBytes($ExpectedToken)
try {
    foreach ($entry in @(@{ Key = $keyPath; Name = 'original-token.txt' }, @{ Key = $restored; Name = 'restored-token.txt' })) {
        $output = Join-Path $destinationPath $entry.Name
        & $receiverPath decrypt --key $entry.Key --in $ciphertextPath --out $output
        if ($LASTEXITCODE -ne 0) { throw 'Receiver decryption failed; keep all key material and investigate locally.' }
        $actual = [IO.File]::ReadAllBytes($output)
        try {
            $equal = $actual.Length -eq $expected.Length
            for ($i = 0; $equal -and $i -lt $expected.Length; $i++) { $equal = $actual[$i] -eq $expected[$i] }
            if (-not $equal) { throw 'Saved output differs from the exact expected nonsecret token.' }
        } finally { [Array]::Clear($actual, 0, $actual.Length) }
    }
} finally { [Array]::Clear($expected, 0, $expected.Length) }
Write-Host 'PASS: original key and restored encrypted backup match the independently confirmed fingerprint and recover the exact nonsecret token.'
Write-Host "Explicit saved outputs remain in $destinationPath. This drill does not delete files, open an editor, verify release authenticity or substitute for an observed first-time user trial."
