# Regression for a fresh checkout whose public/keys directory does not exist.
param([Parameter(Mandatory = $true)][string]$Root)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'write-public-recipient.ps1')
[IO.Directory]::CreateDirectory((Join-Path $Root 'config')) | Out-Null
$source = Join-Path (Split-Path -Parent $PSScriptRoot) 'receiver/tests/fixtures/keys/openssl-3.5-3072-public.pem'
$fingerprint = 'a' * 64 # Public-only helper serialization test, not identity validation.
Write-ZodiacPublicRecipient -RepositoryRoot $Root -PublicPEM $source -RecipientName 'Synthetic regression only' -Fingerprint $fingerprint
$destination = Join-Path $Root 'public/keys/recipient-public.pem'
if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $destination).Hash) { throw 'Public copy changed bytes' }
$config = Get-Content -Raw -LiteralPath (Join-Path $Root 'config/recipient.json') | ConvertFrom-Json
if ($config.name -ne 'Synthetic regression only' -or $config.fingerprint -ne $fingerprint -or $config.publicKey -ne 'public/keys/recipient-public.pem') { throw 'Public config mismatch' }
$refused = $false
try { Write-ZodiacPublicRecipient -RepositoryRoot $Root -PublicPEM $source -RecipientName 'Overwrite must fail' -Fingerprint $fingerprint } catch { $refused = $_.Exception.Message -like '*refusing overwrite*' }
if (-not $refused) { throw 'Public overwrite was not refused' }
Write-Host 'PASS: absent public folder created, exact public bytes/config written, overwrite refused.'
