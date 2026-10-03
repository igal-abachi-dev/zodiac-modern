# REC-01 focused review packet

This packet covers the fixed-profile encrypted-PKCS#8 loader and its terminal/test/
dependency glue. It is author-produced evidence for independent assessment;
it is not a completed audit. REC-02 plaintext output is not implemented or enabled.

Review these sources:

- `receiver/internal/keyfile/pbes2.go`: bounded PEM/DER profile, exact nested
  schema consumption, pre-KDF bounds, native PBKDF2/CBC, full-block padding,
  strict inner PKCS#8/two-prime RSA and owned-buffer cleanup.
- `receiver/internal/keyfile/pbes2_test.go` and `pbes2_fuzz_test.go`: real fixture
  expectations, hostile schemas, password/key/padding/resource cases and fuzz properties.
- `receiver/internal/cli/`: bounded demand-driven hidden terminal input,
  cancellation, reader shutdown, pending-input flush and terminal restoration.
  Assess the Windows native calls and possible error/race paths explicitly.
- `receiver/cmd/zodiac-decrypt/`: validate the public file before prompting,
  compare the real public halves, expose nonsecret information and map errors.
- `receiver/go.mod`, `go.sum`, `vendor/` and `scripts/receiver.mjs`: authenticated
  pinned dependencies, complete regenerated vendor comparison and offline build.
- `scripts/oracle-key-fixtures.mjs`, `setup-openssl-ci.mjs`, `check-rec01.mjs`,
  `walk-files.mjs`, `generate-key-fixtures.mjs`,
  the fixture manifest and workflow template: fail-closed, versioned evidence.

Pinned provenance and policy are in [the loader decision](../decisions/rec01-fixed-loader.md).
Prior external findings and dispositions are in [the feedback record](2026-10-03-feedback.md).
The snapshot JSON alongside this packet records exact source/fixture/vendor and
log hashes, tools, platform and results. Changing a covered file reopens its evidence.

Reproduce on Windows x64 with installed Node 24.21.0, pnpm 12.8.1 and Go 1.27.1:

```powershell
pnpm install --frozen-lockfile
node scripts/setup-openssl-ci.mjs
$taskOracles = Get-Content ".cache/toolchains/openssl-oracle-env.json" -Raw | ConvertFrom-Json
$env:ZODIAC_OPENSSL30 = $taskOracles.ZODIAC_OPENSSL30
$env:ZODIAC_OPENSSL35 = $taskOracles.ZODIAC_OPENSSL35
pnpm check:rec01
```

On a clean checkout first authenticate the two pinned Go modules using
`go -C receiver mod download` and `go -C receiver mod verify`, with `GOMODCACHE`
set to the absolute repository `.cache/go-mod` path and `GOTOOLCHAIN=local`.
The gate then uses `GOPROXY=off`, complete vendor comparison, offline tests/build,
two 30-second fuzz targets with two workers, a 90-second test timeout and a Go
soft memory budget of 256 MiB. Logs and `latest.json` go to ignored
`artifacts/rec01/`. Tests accept only the repository's openly synthetic key data.
No production private key or passphrase is needed.

The provisioning script verifies the full recorded OpenSSL archives before a
fresh extraction, including their DLLs, then checks both executable hashes. It
does not change PowerShell execution policy. Unavailable/changed archives or
missing oracle executables fail the gate; upgrading tools requires new evidence.

The workflow in `workflows/foundation.yml` remains a template by explicit user choice after the
user moved it out of `.github/workflows/`. Its individual gates have been run
locally. No hosted CI execution or required branch check is claimed. Activating
it and configuring required checks are separate from a passing local run.
Action versions are immutable source commits verified against the upstream
[checkout](https://github.com/actions/checkout/commit/8e8c483db84b4bee98b60c0593521ed34d9990e8),
[setup-node](https://github.com/actions/setup-node/commit/48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e)
and [setup-go](https://github.com/actions/setup-go/commit/924ae3a1cded613372ab5595356fb5720e22ba16) releases.

The corpus now includes 58 pre-KDF seeds and 39 post-KDF seeds. It covers the
required weak/absent/invalid PRFs, all algorithm OIDs, explicit zero/wrong key
lengths, negative/billion/overflow iterations, oversized salts/files, IV/block
bounds, otherSource salt, prefixes/trailing content, every nested extra member,
tag-class substitutions and adversarial DER lengths. Post-KDF seeds reach valid
synthetic inner-key and CBC paths and all padding lengths. Mutation campaigns
exercise bounded parser/cleanup properties; passing fuzzing is not proof.

Observed Windows controlling-terminal checks use only the synthetic fixture
password: RSA-3072 success returns immediately after Enter with no password echo;
wrong password returns the generic unlock failure/exit 3; Ctrl-C restores the
terminal and exits 130. Unit tests cover exact input, Unicode/backspace, byte
bounds, overflow draining, demand-driven reads, cancel controls and context
cancellation. The opt-in Windows integration test
`TestNativeConsoleContextCancellation` also passed in a disposable real
controlling terminal: a context deadline interrupted a blocked console read in
1.0003955 seconds and before/after terminal settings matched. Run with
`ZODIAC_TEST_CONSOLE=1`, pinned Go, and
`go -C receiver test -mod=vendor -count=1 -v -run '^TestNativeConsoleContextCancellation$' -timeout 15s ./internal/cli`.
The ordinary CI gate explicitly skips this interactive-only test; it must not
be described as automated hosted-console evidence. These observations do not
establish absence of all native I/O cancellation races. Non-Windows terminal
behavior remains experimental.

The reviewer should record identity, exact covered hashes/revision, platform,
commands, findings/severity, missing coverage and post-fix verification. Explicitly
assess the loader's owned glue, terminal cancellation/restoration and bounds;
standard-library primitives alone do not satisfy this review. The earlier
user-supplied Go 1.24.7/Node WebCrypto report remains useful input, distinct from
the pinned native/real-browser evidence and updated code reviewed here.

The user-supplied [focused follow-up review](2026-10-03-rec01-followup.md) grants
conditional approval once its findings are fixed. Those fixes, mandatory automated
evidence and [native Windows console checks](rec01-console-evidence.json) pass.
REC-01 is Done on that basis; this does not claim an external post-fix execution.
QA-03 later assesses the integrated sender/receiver/output/trust boundary separately.

The tracked encrypted PEM fixtures are normalized to LF before hashing, with
original generator-byte hashes retained in the manifest. Current exact checkout
hashes supersede earlier CRLF working-copy snapshots. The gate uses only the
covered standard-library file walker and does not import website CSP code.
