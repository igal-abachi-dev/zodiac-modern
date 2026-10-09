$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
  throw 'This SEC-02 check requires Windows Defender Firewall.'
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run this check from an elevated PowerShell window. No firewall rule was created.'
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$go = Join-Path $root '.cache\toolchains\go\go\bin\go.exe'
$temp = Join-Path $root '.cache\zodiac-decrypt-network-deny-tests.exe'
$ruleName = 'Zodiac SEC-02 test block ' + [guid]::NewGuid().ToString('N')

if (-not (Test-Path -LiteralPath $go -PathType Leaf)) {
  throw "Pinned local Go toolchain not found: $go"
}

$profiles = @(Get-NetFirewallProfile)
if ($profiles.Count -eq 0 -or @($profiles | Where-Object { -not $_.Enabled }).Count -gt 0) {
  throw 'Windows Firewall is not enabled for every profile; no test rule was created.'
}

$env:GOTOOLCHAIN = 'local'
Push-Location $root
try {
  & $go test -mod=vendor -c -o $temp ./receiver/cmd/zodiac-decrypt
  if ($LASTEXITCODE -ne 0) {
    throw "Compiling the isolated receiver test executable failed with exit code $LASTEXITCODE."
  }

  New-NetFirewallRule -DisplayName $ruleName -Direction Outbound -Program $temp -Action Block -Profile Any | Out-Null
  & $temp -test.v
  $testExitCode = $LASTEXITCODE
  if ($testExitCode -ne 0) {
    throw "Receiver tests failed with the outbound block active (exit code $testExitCode)."
  }

  Write-Output 'SEC-02 result: compiled receiver tests passed while Windows Firewall blocked outbound traffic for that executable.'
  Write-Output 'Scope: author-run OS-enforced test-harness evidence only; it is not an integrated independent review.'
}
finally {
  Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule -ErrorAction SilentlyContinue
  Pop-Location
}
