# Flutter validation — 2026-10-26

Independent implementation complete; **not a comparative benchmark or release approval**.
Canonical feature contract: `../Tauri-v2-Svelte5/FEATURE-PARITY.md`.

Verified with Flutter **3.47.8**, Dart **3.13.7**, `flutter_svg 2.3.0`,
`flutter_lints 6.0.0`, the committed SHA-256 pub lock and the official verified
SDK archive documented in README. Standard Windows CMake/MSBuild runner, MSVC
19.51 and Windows SDK 10.0.26100. No Android/web target or native plugin selected.

`Build.ps1` passes locked restore, format check, analyzer (**no issues**), four
domain/widget tests and the Windows x64 **Release AOT** build. Model tests cover
deterministic IDs/filtering/immutable updates, cancellation, stale workflow
generations, timer Stop/disposal and reset. Widget tests cover readiness,
About/Close, cancel and reset. Assets are local Inter/Noto Hebrew and trusted
Lucide SVGs. Flutter/Dart/engine notices and asset licenses are included.

The actual Release window passes the external FlaUI/UIA3 checker at **192 DPI
(200%)**, including:

- About Escape/Close, trigger focus restoration and dialog Tab containment.
- Simulated encryption completion, decryption cancellation and Reset.
- 1k → 10k → 1k row replacement with exact IDs; reverse, splice and update 10%.
- Filter-to-one, clear, filtering during requested 30 Hz updates and empty result.
- Requested 10/60 Hz updates, Stop stability, remount, leave during updates,
  fresh reopen and main actions afterward.
- 480-DIP card stacking and restored 960 × 640 DIP client layout.
- Clean main-process/helper exit with code zero; main/narrow screenshots inspected.

Persistent acceptance and the complete deployment hash receipt are under
`validation/2026-10-26/`. Check that receipt against the current build before
reusing this evidence. The Release folder is about **29.3 MB / 30 files** at this
snapshot; that excludes the external Microsoft VC++ runtime requirement. It is
not an installer/compressed download size or a RAM result. Full process-tree,
startup, GPU/frame pacing and energy measurements remain **not run**.

## Corrections and retained attempts

The first window check reached a working dialog but looked for a UIA ID that this
Flutter Windows build does not expose. The adapter now uses client names/roles
and excludes the native caption Close. Reading one summary uses a targeted UIA
condition rather than enumerating every row peer. Windows Ctrl+A selection uses
proper scan codes and a held modifier; zero-scan batched modifier injection had
failed to clear the filter. These were external checker corrections.

A repeat Stop assertion could observe an older committed tick immediately after
input. The controller now publishes active/stopped state, with a corresponding
accessible hint, and the checker waits for the committed stopped feedback before
sampling stability. Domain cancellation/disposal remains generation-aware.
The raw failed attempts remain in `.cache/first-check`, `names-check`,
`targeted-summary-check` and the earlier `check-*` directories; a concise history
is retained with the acceptance evidence. They are not successful benchmark runs.

Visual Studio was updated during this session. Flutter initially rejected its
temporarily incomplete installation; the generated CMake project could build.
After installation completed, the normal `Build.ps1` / `flutter build windows`
path passed. No Flutter SDK detection code or installer settings were patched.

## Remaining gates

Physical Narrator/NVDA, keyboard/IME/bidi review, contrast/theme adaptation,
multi-monitor/mixed-DPI, GPU/device-loss, power, broader lifecycle stress,
clean-machine VC++ runtime deployment, signing and an independent release review
remain open. UIA and synthetic screenshots do not close these gates. Preserve the
standard first-frame window-show policy and include process creation in later
startup measurements. No Go, crypto or real file workflow is implemented here.
