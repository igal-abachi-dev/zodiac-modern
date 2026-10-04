# Public data only. The setup caller must already have verified this public key
# against the private half and independently confirmed its complete fingerprint.
function Write-ZodiacPublicRecipient {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string]$RepositoryRoot,
        [Parameter(Mandatory = $true)][string]$PublicPEM,
        [Parameter(Mandatory = $true)][string]$RecipientName,
        [Parameter(Mandatory = $true)][ValidatePattern('^[a-f0-9]{64}$')][string]$Fingerprint
    )
    $publicDirectory = Join-Path $RepositoryRoot 'public/keys'
    $publicDestination = Join-Path $publicDirectory 'recipient-public.pem'
    if (Test-Path -LiteralPath $publicDestination) { throw 'Public recipient already exists; refusing overwrite.' }
    [IO.Directory]::CreateDirectory($publicDirectory) | Out-Null
    # Copy is exclusive even if another process creates the file after the check.
    [IO.File]::Copy([IO.Path]::GetFullPath($PublicPEM), $publicDestination, $false)
    $configuration = [ordered]@{ name = $RecipientName; publicKey = 'public/keys/recipient-public.pem'; fingerprint = $Fingerprint }
    [IO.File]::WriteAllText((Join-Path $RepositoryRoot 'config/recipient.json'), ($configuration | ConvertTo-Json) + "`n", (New-Object Text.UTF8Encoding($false)))
}
