# Wails validation

## Six-host measurement update - 2026-10-24

The accepted pilot and full six-host collection completed with the identical
Svelte fixture. See [results and configuration caveats](../host-test-support/results/2026-10-24/RESULTS.md).
All selected Wails observations passed; persistent-profile/native-policy
differences remain explicit. This is not physical accessibility, security parity
or production/release acceptance. Historical records below remain historical.

## Current frontend revision — 2026-10-20

Offline production rebuild and policy tests passed with the common 16-file,
four-font English/Hebrew/emoji fixture `starlight-en-he-v2`.
Frontend manifest SHA-256:
`6bf90db01cfc3df86a27f401c9e961ff9157790aa734be5f13238b5745266415`.
Executable SHA-256:
`5cbd30f97da243b11f5a9caf91d201aee2a8799ac31d687f06574d961a9faa63`.
The shared production UIA/real-input workflow passed with exit 0; report:
`../host-test-support/.cache/en-he-dbb3d95683a44c308945507c7ce63173/Wails.json`.
No comparative timing or broader policy/helper-lifecycle acceptance is implied.

## Historical validation

Executed 2026-10-18. Research implementation, not release/security acceptance.
No comparative benchmark runs.

- Standard Wails **2.15.0**, Go **1.27.1**, Windows amd64 production packager.
  Main and separate CLI module graphs are locked; `go mod verify` passed for
  both. `Build.ps1 -Offline` completed with no dependency download.
- Asset middleware test passed (six method/path/MIME/query/missing-file cases).
  This is an application-policy unit test, not end-to-end browser enforcement.
- All **17** input assets verified against the common Svelte manifest
  `211ec53bbf3677974de1f1987aaadba58530739662dadcf5763bb300029f6902`.
  The native framework injects its own runtime scripts/rewrites entry HTML.
- Final production executable SHA-256:
  `96cedd57f78133313a97ec57402985ec484e12c25f96eb2b83b93e7f0a201d11`.
  Build receipt: `.cache/build-receipt.json`.
- External production UIA/real-input workflow **passed**, exit 0:
  Ready, About/open/close, encryption simulation/completion, Reset,
  decryption simulation/Cancel, Reset, then WM_CLOSE.
  Evidence: `.cache/native-smoke-final.json`.

## Startup investigation

Earlier failures remain in `.cache/native-smoke-v*.json` and diagnostic output.
An initial app guard rejected variables that Wails' own loader sets during init;
that guard was removed and the launch script checks inherited overrides instead.
The checker initially selected an auxiliary window, then attempted unsupported
UIA InvokePattern, then could not reliably focus the window. Those are checker
failures, not evidence of framework rendering crashes.

With normal visible launch, the screen was present in the failure snapshot but
the checker retained the provisional `about:blank` UIA document. Re-querying the
document until it contains visible Ready fixed that issue; the v8 and final
workflows passed. Temporary JS startup diagnostics were removed before the
final production build. Do not interpret these exploratory attempts as timings.

## Still open

Full native resource/navigation/permission/download policy probes, injected
runtime CSP/style review, client-size/DPI calibration, workload suite, physical
keyboard/AT/IME/high-contrast/multi-monitor checks, and run-owned browser-helper
cleanup including early initialization. Root exit alone does not accept helper
lifecycle. Wails v2's persistent profile and native permission defaults differ
from raw NeutronStar; see [README](README.md). This configuration is not admitted
to a policy/profile-equivalent benchmark lane yet.
