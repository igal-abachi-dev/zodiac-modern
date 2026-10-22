# WinUI 3 WebView2 validation

Implementation evidence, 2026-10-21/22; UIA3 follow-up 2026-10-23.
Comparative benchmarks have **not** run.

| Check | Result / evidence |
| --- | --- |
| Locked restore | Passed; committed `packages.lock.json` and test lock |
| Release publish | Passed; self-contained x64 folder, warnings treated as errors |
| Frozen frontend | All 16 files verified before staging and after publish; fixture `starlight-en-he-v2` |
| Policy/integrity unit checks | 30 assertions passed: exact origin, URL decoding/traversal/reserved names, methods/MIME, missing assets, hash mismatch, exact file set, path containment |
| Visual production screen | Passed at initial 960×640 client size: English/Hebrew/emoji, both cards, local styling, Ready |
| Real-input visual interactions | About opened, Escape closed it and restored visible trigger focus; encryption reached complete/100%; Reset restored Ready/0%; decryption reached complete/100% |
| Shared UIA2 production workflow | Unsupported in this configuration: sees native chrome only, times out on `ready document`; initial reports retained |
| UIA3 production workflow | **Passed**, final fresh and retained profiles: Ready, About/Escape/focus return, About/Close, encryption/complete, Reset, decryption/Cancel, Reset, normal window exit |
| Checker cross-check | C++ baseline passed the same UIA3 workflow; updated UIA2 baseline also passed |
| Window close | Tested instances exited after close; not a helper-tree lifecycle acceptance |

The visual checks used the computer-use skill's window capture and real input
against the production app launched by `Run.ps1`. They are correctness observations,
not measurements. Screenshots were inspected in-session; no screenshot artifact
is claimed. The original inspector's missing UIA text was followed up independently.

### UIA3 follow-up

The production host and all Svelte assets were left unchanged. A test-only checker
using pinned FlaUI.UIA3 5.0.0 exposes the full web document, accessible control
names, the InPrivate web-content pane and Ready. The original managed UIA2 checker
still fails even when waiting for a visible HWND and refreshing the automation
root. The observed solution is a **UIA3 collector path**, not a host API/policy
change. This evidence does not establish every underlying UIA2/provider cause or
imply UIA2 fails for all WinUI apps.

The full checker uses actual pointer input and Escape, asserting focus return
through the About button's `HasKeyboardFocus` property. A global focused-element
query did not identify that button in the first attempt; the element-local query
does. Unsupported Name properties on unnamed intermediate nodes must also be read
with safe defaults. Both exploratory collector failures remain recorded rather
than counted as host failures or accepted results.

Accepted and rejected reports plus artifact hashes are committed under
[UIA3 evidence](../host-test-support/uia3/results/2026-10-23/). Final fresh and
retained WinUI workflows and the C++ baseline workflow passed; Cancel is now
explicitly checked. This closes the **automated production workflow/readiness
blocker**, not Narrator/NVDA, complete native admission or release acceptance.

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

- Use the UIA3 path for WinUI readiness and workflow (passed). Before timing,
  pilot the same UIA3 collector across all six hosts so automation endpoint/backend
  differences do not masquerade as framework performance differences.
- Inspect actual WebView2 version, process arguments, InPrivate/cache behavior,
  initial client size/DPI/zoom and native policy behavior. API configuration is
  implemented, but browser-level negative policy probes are not yet passed.
- Check clean-machine deployment and Visual C++ runtime requirements.
- Check normal/early initialization close and run-owned WebView2 helper exit.
- Complete Narrator/NVDA, IME, high contrast, 150/200% DPI and multi-monitor checks.
- Adapt and pilot the six-host measurement harness; freeze host/deployment and
  frontend hashes afterward. Do not reuse old five-host admission as this host's.

This is a runnable implementation with passing UIA3 production workflow checks.
The remaining policy/lifecycle/physical accessibility and six-host harness gates
above still apply; this is not full benchmark admission or a production release.
