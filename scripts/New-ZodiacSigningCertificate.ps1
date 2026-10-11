# Owner-run provisioning only; never installs a root or exports a private key.
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [Parameter(Mandatory = $true)][string]$PublicOutputDirectory
)
$ErrorActionPreference = 'Stop'
$subject = 'CN=Zodiac Modern'
$destination = [IO.Path]::GetFullPath($PublicOutputDirectory)
if (Test-Path -LiteralPath $destination) { throw 'Select a new public-output directory; existing paths are refused.' }
$parent = Split-Path -Parent $destination
if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw 'Public-output parent must already exist.' }
$cursor = Get-Item -LiteralPath $parent
while ($cursor) {
    if ($cursor.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Public-output parents must not be reparse points.' }
    $cursor = $cursor.Parent
}
if (-not $PSCmdlet.ShouldProcess('CurrentUser\\My and new public-output directory', 'Create protected non-exportable RSA-3072 code-signing key; export public certificate and receipt only')) { return }
if ([Console]::IsInputRedirected -or [Console]::IsOutputRedirected -or $Host.Name -ne 'ConsoleHost') {
    throw 'Run provisioning in the owner''s trusted interactive local console. Native high-protection prompts require owner interaction.'
}
# Creation is intentionally a custody action on the owner's selected signing PC.
# High protection requires Windows UI authorization. No trust stores are changed.
$certificate = New-SelfSignedCertificate -Type CodeSigningCert -Subject $subject `
    -CertStoreLocation 'Cert:\CurrentUser\My' -Provider 'Microsoft Software Key Storage Provider' `
    -KeyAlgorithm RSA -KeyLength 3072 -HashAlgorithm SHA256 -KeyUsage DigitalSignature `
    -KeyExportPolicy NonExportable -KeyProtection ProtectHigh -NotAfter (Get-Date).AddYears(1)
if ($certificate.Subject -cne $subject -or -not $certificate.HasPrivateKey) {
    throw 'Unexpected certificate; provisioning incomplete. Inspect the personal certificate store locally.'
}
$hash = [Security.Cryptography.SHA256]::Create()
try { $pin = ([BitConverter]::ToString($hash.ComputeHash($certificate.RawData))).Replace('-', '').ToLowerInvariant() }
finally { $hash.Dispose() }
New-Item -ItemType Directory -Path $destination -ErrorAction Stop | Out-Null
$publicFile = Join-Path $destination 'zodiac-signing-public.cer'
Export-Certificate -Cert $certificate -FilePath $publicFile -Type CERT -NoClobber | Out-Null
$receipt = [ordered]@{
    schema = 'ZODIAC-SIGNING-PROVISIONING-1'
    subject = $certificate.Subject
    certificateSHA256 = $pin
    storeSelectorThumbprint = $certificate.Thumbprint
    store = 'CurrentUser/My'
    provider = 'Microsoft Software Key Storage Provider'
    keyAlgorithm = 'RSA-3072'
    keyExportPolicy = 'NonExportable'
    keyProtection = 'ProtectHigh'
    notBeforeUTC = $certificate.NotBefore.ToUniversalTime().ToString('o')
    notAfterUTC = $certificate.NotAfter.ToUniversalTime().ToString('o')
    status = 'self-signed; Windows trust and independent identity verification not established'
    limitations = 'No private export/backup, root installation, binary signing, timestamp, publication or reviewed-release assertion. Record custody, replacement/revocation and independent pin verification separately.'
}
$receipt | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $destination 'signing-public-receipt.json') -Encoding UTF8
Write-Host 'Created protected signing key in the personal store; exported public certificate/receipt only. No root installed and no binary signed.'
Write-Host "Public certificate SHA-256: $pin"
