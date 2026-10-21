# WinUI 3 WebView2 validation

Implementation evidence, 2026-10-21/22. Comparative benchmarks have **not** run.

| Check | Result / evidence |
| --- | --- |
| Locked restore | Passed; committed `packages.lock.json` and test lock |
| Release publish | Passed; self-contained x64 folder, warnings treated as errors |
| Frozen frontend | All 16 files verified before staging and after publish; fixture `starlight-en-he-v2` |
| Policy/integrity unit checks | 30 assertions passed: exact origin, URL decoding/traversal/reserved names, methods/MIME, missing assets, hash mismatch, exact file set, path containment |
| Visual production screen | Passed at initial 960×640 client size: English/Hebrew/emoji, both cards, local styling, Ready |
| Real-input visual interactions | About opened, Escape closed it and restored visible trigger focus; encryption reached complete/100%; Reset restored Ready/0%; decryption reached complete/100% |
| Shared UIA2 production workflow | **Failed admission**: checker sees native chrome only, times out on `ready document`; reports `.cache/smoke-02.json`, `smoke-04.json`, `smoke-06.json` |
| Window close | Tested instances exited after close; not a helper-tree lifecycle acceptance |

The visual checks used the computer-use skill's window capture and real input
against the production app launched by `Run.ps1`. They are correctness observations,
not measurements. Screenshots were inspected in-session; no screenshot artifact
is claimed. UIA text was also unavailable in that inspector. The UIA problem's
root cause is **not established**; do not label it a harmless collector bug, an
inherent WinUI defect, or a passed accessibility test. A compatible UIA3 inspection
and Narrator test are the next diagnostics. Cancel was not visually checked and
the full common workflow remains unaccepted.

The initial publish lacked generated app `.pri`/`.xbf` resources and exited with
`XamlParseException` before rendering. The project now explicitly publishes those
resources. Subsequent native checks initialized WebView2 and rendered the screen,
but still failed the UIA document gate. Starting only after the control's Loaded
state did not resolve the UIA failure. Failed attempts are retained.

The generated entry point has STAThread and WinUI's dispatcher synchronization
context. Asynchronous initialization checks closing state after awaits and closes
the control, unsubscribing events at shutdown. These source checks do not prove
all early-close or browser-helper exit behavior.

`.cache/build-receipt.json` records the actual final deployment file hashes;
include the managed DLL and resources, not only the small .NET apphost EXE, in
artifact identity. An intermediate build contained 537 files / 241,050,633 bytes
(about 230 MiB) including unpruned self-contained runtimes and symbols; use the
final receipt for later payload measurements. This is not installed WebView2
runtime size or a memory measurement.

## Before six-host benchmark admission

- Resolve missing UIA content exposure, then pass the shared workflow including
  cancel, focus/keyboard and readiness under the final production artifact.
- Inspect actual WebView2 version, process arguments, InPrivate/cache behavior,
  initial client size/DPI/zoom and native policy behavior. API configuration is
  implemented, but browser-level negative policy probes are not yet passed.
- Check clean-machine deployment and Visual C++ runtime requirements.
- Check normal/early initialization close and run-owned WebView2 helper exit.
- Complete Narrator/NVDA, IME, high contrast, 150/200% DPI and multi-monitor checks.
- Adapt and pilot the six-host measurement harness; freeze host/deployment and
  frontend hashes afterward. Do not reuse old five-host admission as this host's.

This is a runnable implementation with an explicit UIA/accessibility admission
gap. It is not yet an admitted sixth benchmark candidate or a production release.
