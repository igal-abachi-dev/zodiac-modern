# Run in your own trusted interactive PowerShell console, never through a
# transcript, assistant terminal, redirected input, or a screen recording.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][string]$OpenSSL,
    [Parameter(Mandatory = $true)][string]$Receiver,
    [ValidateSet(3072, 4096)][int]$Bits = 4096,
    [string]$RecipientName = 'Zodiac Modern recipient',
    [switch]$ConfigureRecipient
)
$ErrorActionPreference = 'Stop'
if ([Console]::IsInputRedirected -or [Console]::IsOutputRedirected) {
    throw 'Use a local interactive console with transcripts and recording disabled.'
}
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$destinationPath = [IO.Path]::GetFullPath($Destination)
$opensslPath = (Resolve-Path -LiteralPath $OpenSSL).Path
$receiverPath = (Resolve-Path -LiteralPath $Receiver).Path
if (Test-Path -LiteralPath $destinationPath) { throw 'Choose a new folder. Existing setup folders are never overwritten.' }
if ($RecipientName.Trim().Length -eq 0 -or $RecipientName.Length -gt 120) { throw 'Choose a recipient name of 1 to 120 characters.' }
$signature = Get-AuthenticodeSignature -LiteralPath $opensslPath
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notlike '*CN=FireDaemon Technologies Limited,*') {
    throw 'OpenSSL must have a valid expected FireDaemon publisher signature.'
}
$version = & $opensslPath version
if ($LASTEXITCODE -ne 0 -or $version -notmatch '^OpenSSL 3\.5\.\d+ ') { throw 'Use the latest patched supported OpenSSL 3.5 LTS; check current advisories first.' }
Write-Host $version
# Reject directory redirection before creating the private setup folder.
$parent = [IO.DirectoryInfo]([IO.Path]::GetDirectoryName($destinationPath))
while ($parent) {
    if (-not $parent.Exists -or ($parent.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'The setup path needs existing ordinary local parents, without reparse points.' }
    $parent = $parent.Parent
}
$drive = New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($destinationPath))
if ($drive.DriveType -ne 'Fixed' -or $drive.DriveFormat -ne 'NTFS') { throw 'Choose a nonsynced local fixed NTFS disk.' }
if ($ConfigureRecipient) {
    $publicDestination = Join-Path $repositoryRoot 'public/keys/recipient-public.pem'
    if (Test-Path -LiteralPath $publicDestination) { throw 'Public recipient already exists; use a reviewed rotation instead of overwriting it.' }
}
$owner = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetOwner($owner)
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object Security.AccessControl.FileSystemAccessRule($owner, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$acl.AddAccessRule($rule)
# The folder contains no key until its protected ACL has been installed.
[IO.Directory]::CreateDirectory($destinationPath) | Out-Null
Set-Acl -LiteralPath $destinationPath -AclObject $acl
$actualACL = Get-Acl -LiteralPath $destinationPath
if (-not $actualACL.AreAccessRulesProtected -or $actualACL.Access.Count -ne 1) { throw 'Private folder ACL verification failed; no key has been generated.' }
function Invoke-OpenSSL([string[]]$Arguments) {
    & $opensslPath @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'OpenSSL failed. Keep existing files and inspect the local error; do not rerun into this folder.' }
}
$initial = Join-Path $destinationPath 'rsa-private-initial-encrypted.pem'
$final = Join-Path $destinationPath 'rsa-private-encrypted.pem'
$public = Join-Path $destinationPath 'rsa-public.pem'
$publicDER = Join-Path $destinationPath 'rsa-public.der'
Write-Host 'Use independent random 24-32 character ASCII temporary and final passphrases from your trusted local password manager. Enter them only at the hidden OpenSSL prompts.'
Write-Host 'First: enter and confirm the TEMPORARY passphrase. This weaker intermediate must never be synced or backed up.'
Invoke-OpenSSL -Arguments @('genpkey', '-algorithm', 'RSA', '-aes-256-cbc', '-pkeyopt', "rsa_keygen_bits:$Bits", '-pkeyopt', 'rsa_keygen_pubexp:65537', '-out', $initial)
Write-Host 'Next: unlock with the TEMPORARY passphrase, then enter and confirm the FINAL passphrase.'
Invoke-OpenSSL -Arguments @('pkcs8', '-topk8', '-in', $initial, '-out', $final, '-v2', 'aes-256-cbc', '-v2prf', 'hmacWithSHA256', '-iter', '600000', '-saltlen', '16')
Write-Host 'Enter the FINAL passphrase to extract the shareable public key.'
Invoke-OpenSSL -Arguments @('pkey', '-in', $final, '-pubout', '-out', $public)
Write-Host 'Enter the FINAL passphrase for OpenSSL private-key validation.'
Invoke-OpenSSL -Arguments @('pkey', '-in', $final, '-check', '-noout')
Invoke-OpenSSL -Arguments @('pkey', '-pubin', '-in', $public, '-outform', 'DER', '-out', $publicDER)
$fingerprint = (Get-FileHash -Algorithm SHA256 -LiteralPath $publicDER).Hash.ToLowerInvariant()
Remove-Item -LiteralPath $publicDER
Write-Host 'Enter the FINAL passphrase at the receiver hidden prompt. Compare its full fingerprint with the value below.'
& $receiverPath verify-key --key $final --public $public
if ($LASTEXITCODE -ne 0) { throw 'Receiver pair verification failed. Do not configure or remove the intermediate.' }
Write-Host "Public SPKI SHA-256: $fingerprint"
if ($ConfigureRecipient) {
    Write-Host 'Confirm this identity and fingerprint in your trusted local console before enabling the hosted default. Never derive the expected value from a website claiming to verify itself.'
    $confirmation = Read-Host 'Re-enter the full locally verified public fingerprint'
    if ($confirmation -cne $fingerprint) { throw 'Fingerprint confirmation failed; public configuration was not written.' }
    . (Join-Path $PSScriptRoot 'write-public-recipient.ps1')
    Write-ZodiacPublicRecipient -RepositoryRoot $repositoryRoot -PublicPEM $public -RecipientName $RecipientName -Fingerprint $fingerprint
    Write-Host 'Only the public PEM and configuration were copied into tracked build inputs.'
}
Write-Host 'Keep the encrypted final key and a protected independent passphrase backup. Restore the encrypted backup to a separate private folder, verify the pair and decrypt a nonsecret test message before removing the intermediate.'
Write-Host 'Setup complete. The intermediate is retained until that drill passes; delete only that specific intermediate afterward. Deletion cannot erase snapshots, SSD history or other copies.'
