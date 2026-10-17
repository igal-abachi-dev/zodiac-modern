# Wails validation

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
