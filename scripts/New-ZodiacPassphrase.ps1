# Run this file in your own trusted local console. Do not run password generation
# in an assistant terminal, transcript, screen recording, or shared session.
[CmdletBinding()]
param(
    [ValidateRange(24, 128)][int]$Length = 32,
    [switch]$SelfTest
)
$ErrorActionPreference = 'Stop'
$alphabet = -join (33..126 | ForEach-Object { [char]$_ })
$count = $alphabet.Length # 94 printable ASCII characters, no spaces/control bytes
$limit = 256 - (256 % $count) # 188: every accepted index has exactly two preimages
if ($SelfTest) {
    # Exhaust the mapping instead of making a statistical randomness claim.
    $frequencies = New-Object int[] $count
    $rejected = 0
    foreach ($sample in 0..255) {
        if ($sample -ge $limit) { $rejected++; continue }
        $frequencies[$sample % $count]++
    }
    if ($count -ne 94 -or $limit -ne 188 -or $rejected -ne 68 -or
        @($frequencies | Where-Object { $_ -ne 2 }).Count -ne 0) { throw 'Unbiased mapping self-test failed.' }
}
if (-not $SelfTest -and ([Console]::IsInputRedirected -or [Console]::IsOutputRedirected -or $Host.Name -ne 'ConsoleHost')) {
    throw 'Password generation requires your own interactive local console; redirected input/output is refused.'
}
if (-not $SelfTest) {
    Write-Host 'Disable transcripts, recording and screen sharing before continuing. This script cannot detect every recorder.'
    if ((Read-Host 'Type GENERATE to display a new password in this local console') -cne 'GENERATE') { exit 0 }
}
$characters = New-Object char[] $Length
$sampleBytes = New-Object byte[] 1
$rng = $null
$password = $null
try {
    $getInt32 = [Security.Cryptography.RandomNumberGenerator].GetMethod('GetInt32', [type[]]@([int]))
    if ($getInt32) {
        # Modern .NET performs unbiased rejection sampling internally.
        for ($i = 0; $i -lt $Length; $i++) {
            $characters[$i] = $alphabet[[Security.Cryptography.RandomNumberGenerator]::GetInt32($count)]
        }
    } else {
        # Windows PowerShell 5.1: native .NET CSPRNG with explicit rejection.
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        for ($i = 0; $i -lt $Length; $i++) {
            do { $rng.GetBytes($sampleBytes) } while ($sampleBytes[0] -ge $limit)
            $characters[$i] = $alphabet[$sampleBytes[0] % $count]
        }
    }
    if ($SelfTest) {
        if (@($characters | Where-Object { [int]$_ -lt 33 -or [int]$_ -gt 126 }).Count -ne 0) { throw 'Generator alphabet test failed.' }
        Write-Host 'PASS: all 94 printable ASCII indices occur exactly twice; all 68 biased-tail bytes reject. Native CSPRNG and bounded alphabet work. No password displayed.'
        exit 0
    }
    $password = -join $characters
    Write-Host "New $Length-character ASCII passphrase (no automatic clipboard or file save):"
    Write-Host $password
    Write-Host 'Store it in your trusted local password manager and a protected recoverable backup. Use a different generated password for the temporary key. Enter it only in the local hidden OpenSSL/receiver prompt.'
    Read-Host 'Press Enter after storing it; closing this console removes visible output, not guaranteed OS/runtime copies' | Out-Null
} finally {
    if ($rng) { $rng.Dispose() }
    [Array]::Clear($sampleBytes, 0, $sampleBytes.Length)
    [Array]::Clear($characters, 0, $characters.Length)
    $password = $null # Immutable strings and console/runtime copies cannot be securely erased.
}
