# Host validation record

## Six-host measurement update - 2026-10-24

The unchanged clang-cl/Ninja Release runner served as the baseline in the
completed [six-host pilot and full study](../../host-test-support/results/2026-10-24/RESULTS.md).
All selected baseline observations passed semantic/bounded lifecycle checks.
Eighteen first-visible-window close probes across the six hosts add evidence;
they do not close the older early-initialization helper-shutdown concern or
replace physical accessibility/DPI/native-policy/release acceptance.

Date: **2026-10-16**. Scope: the reusable native host and synthetic fixtures,
not the eight frontend implementations or a comparative performance benchmark.
These are local development checks, not independent security/release approval.

## Tested configuration

| Component | Observed configuration |
| --- | --- |
| OS | Windows 11 Pro for Workstations, 10.0.26200, build 26200 |
| Architecture | x64 |
| Visual Studio | Community 2026, installation major version 18 |
| MSVC | 19.51.36260.0; tools directory 14.51.36231 |
| Windows SDK | 10.0.26100.0 |
| CMake | 4.3.1-msvc1 |
| C++ / CRT | C++20; Release /MT, Debug /MTd |
| WebView2 SDK | Microsoft.Web.WebView2 1.0.4258.31 |
| WIL | Microsoft.Windows.ImplementationLibrary 1.0.260126.7 |
| Resolved browser runtime | Installed Evergreen 155.0.4283.45 |

The package versions and SHA-256 archive pins are committed in
[dependencies.lock.json](dependencies.lock.json). Offline restore verified the
cached archives and every extracted file, including rejection of unexpected files.
The SDK packages were explicitly restored; no compiler or browser was installed.

## Executed checks

Both configurations completed `scripts/Build.ps1 -Configuration <configuration>`:
MSVC compilation with `/W4 /WX`, linking, and **1/1 CTest `asset_policy` passed**.
The policy executable uses explicit checks that remain active in Release. It
covers URL/path validation, UTF-8 and malformed percent encodings, MIME policy,
directory boundary checks, exact action/status grammar and serialized-message
rejections, including escaped embedded NUL.

At initial validation, both configurations completed `scripts/Test-Host.ps1 -Configuration <configuration>`:
**14/14 cases passed**, followed by browser-helper shutdown verification.

| Cases | Result in Release and Debug |
| --- | --- |
| Local modules, external CSS, Unicode and static fragment fetch | Passed |
| CSP: inline style/eval/remote fetch; missing resources and denied methods/types; popup and foreign navigation | Passed within local-content smoke case |
| Optional typed bridge | Passed: 2 actions accepted, 5 messages rejected; busy and completion tokens observed |
| Immediate close before readiness, repeated 5 times | Passed |
| Close at environment-ready and controller-ready | Passed |
| Missing entry and invalid Fixed Version runtime directory | Controlled failure, as expected |
| Junction/reparse entry | Refused, as expected |
| Profile inside assets | Refused without creating the profile directory |
| WEBVIEW2 environment override | Refused, as expected |
| Browser helpers using this suite's unique profile paths | Exited within the 30-second shutdown deadline |

The bridge fixture checks malformed objects, unsupported/oversized strings,
embedded NUL and duplicate submission. It uses synthetic acknowledgements and
a native test timer; it does not execute Go or handle passwords/files.

Reports from the final runs are local ignored development artifacts:

- Release: `.cache/test-ff2d9a312d4e4350857546298db3bf34`.
- Debug: `.cache/test-c878bf1989994fd79b699dd2747ebe77`.

The script launches hidden windows, observes only its own profile paths and does
not terminate unrelated browser processes. These results are not visual UI or
assistive-technology acceptance. Individual event handlers for every denied
permission/download/external-scheme path were not all exercised by the fixtures.

## Routing follow-up and reopened shutdown evidence

On 2026-10-16, added the framework-free `hash-routing-and-reload` fixture to the
suite, increasing its functional cases to 15. **No native source or executable
was changed.** Release and Debug routing checks passed: dynamic module/external
CSS loading, hash changes, back/forward, full reload and fragment reconstruction,
explicit HTML serving, extensionless/directory 403, missing HTML 404, and the
absence of a native resource mapping after `history.pushState`.

- Release suite `.cache/test-28332d4563f540049d855c949d420d73`: **15/15 functional
  cases passed, but the suite failed its 30-second browser shutdown check**.
- A subsequent read-only process inspection found five remaining browser helpers
  associated with `close-before-ready-0`, `close-before-ready-1`,
  `close-before-ready-3`, `close-before-ready-4` and `close-at-environment`.
  No remaining helper from that suite's routing profile was observed. This
  identifies the affected cases, not a proven root cause of the shutdown issue.
- Those five task-owned helpers were explicitly stopped after observation;
  forced cleanup is **not** counted as successful host shutdown. No unrelated
  browser processes were selected.
- Debug targeted routing run `.cache/routing-debug-1cecce0c79de4b04ad0e70401658f8d6`:
  exit 0, fixture passed, and zero matching helpers remained within the deadline.
  The expanded entire Debug suite was not rerun in this follow-up.

The initial 14-case results above remain historical evidence; they do not resolve
this newly observed early-initialization shutdown failure. **Reopen early-close
browser lifecycle acceptance** and investigate pending asynchronous environment
creation/message-pump shutdown before claiming reliable teardown. Do not extend
the deadline or weaken the check merely to make the suite pass. Current routing
evidence does not establish framework-router compatibility or benchmark speed.

## Vite/TypeScript native-greeting follow-up — 2026-10-16

Added separately opt-in bounded greeting requests/replies; encrypt/decrypt tokens
remain unchanged. Release and Debug MSVC builds and CTest policy checks passed,
including malformed UTF-16, message/reply bounds, empty/whitespace semantics and
embedded NUL preservation. Node 24.21.0, Vite 8.3.4 and TypeScript 7.0.2 built the
example and separate test assets with strict type checks. Its dependency install
used `--ignore-scripts` and an example-local npm cache/lockfile.

The Release host regression suite passed all 15 cases and browser-helper shutdown
this run, report root `.cache/test-8495665fd53845ebba3ea52d5bd9983a`.
The action-only fixture also sends a valid greeting token with that capability
disabled. Passing this run does **not** explain or resolve the earlier intermittent
initialization-close failure; that acceptance item remains open.

Release and Debug real-WebView example tests passed, each recording 9 native
greeting callbacks and 6 rejected requests, with helper shutdown inside 30 seconds.
Coverage and exact report roots are in the [example README](../NeutronStar-Example/README.md).
The normal production build excludes the self-test; test-mode assets compile the
test module through Vite without relaxing the host CSP. This is correctness
evidence, not measured IPC latency or visual/accessibility acceptance.

The tested Release greeting runner was **3,190,272 bytes**, SHA-256:

```text
6EFA69A168AF1FF308883DE29103A6E0E34C8F8254E03083EF703861813248C0
```

The old interactive example's PID 520 tree was sampled before closing it for the
rebuild: 367.43 MiB summed working set, 90.43 MiB private working set and 174.74
MiB private bytes. This uncontrolled snapshot is documented separately in
[MEMORY-NOTES.md](MEMORY-NOTES.md), with raw process values and planned comparison
methods. No low-memory/suspension optimization or Avalonia benchmark is claimed.

## Historical Release binary inspection (before native greeting)

`dumpbin /HEADERS` reported the Windows GUI subsystem and High Entropy VA,
Dynamic Base, NX and Control Flow Guard flags. `/DEPENDENTS` listed SHELL32,
USER32, ole32, SHLWAPI, KERNEL32 and ADVAPI32; no app-local CRT or WebView2 loader
DLL dependency was listed. The separate browser runtime is still required.

The local unsigned Release runner was **3,168,768 bytes**, SHA-256:

```text
3E803F1BF0B3361DD4F6C4DCA0515EA48FCF4FFECF2A92687BE56ABEF6BA0FC7
```

This identifies this local candidate only. It is neither a reproducible-build
claim nor a signed delivery artifact. The executable size excludes the runtime,
assets, profile, SDK cache and build tools; it is not a frontend bundle comparison.

## Remaining validation

- Build and test all eight planned production frameworks plus a vanilla
  HTML/CSS/TypeScript baseline under this unchanged CSP. No real-framework
  compatibility or ranking is established by the synthetic fixtures.
- Run the benchmark protocol in `desktop-gui.md`: process-tree memory/CPU,
  rendering/input latency, cold/warm startup, restore and background activity.
  Internal host timestamps alone do not measure first paint or usable UI.
- Manually exercise keyboard/focus, Narrator/NVDA, high contrast, 150/200% scaling,
  multi-monitor DPI changes, minimize/restore, and relevant Unicode/bidi controls.
- Validate clean standard-user/offline machines, an actual supported Fixed Version
  distribution, runtime absence/incompatibility, and distribution/servicing policy.
- Test clang-cl and ARM64 if they become required; neither was tested here.
- Perform process-aware network/storage observation and independent review before
  making privacy/security acceptance claims. Runtime/OS activity is not proven
  absent by blocking page requests or using InPrivate.
- Design and review future asynchronous Go invocation, operation IDs/cancellation
  and the passphrase boundary separately. No current test covers that integration.

## Research readiness assessment

The current host is suitable for the next **GUI-only frontend comparison**: one
fixed executable, runtime and policy can host Svelte, React, Vue, Solid, Lit,
Preact, Alpine.js, htmx and a vanilla HTML/CSS/TypeScript baseline. This is a
research-host readiness assessment, not a production-ready product designation.
The greeting path is a synthetic native demo, not a future general RPC contract.

The early-initialization helper-shutdown issue remains the main known host quality
issue: expanded runs have both reproduced the timeout and passed later, without
isolating its cause. Keep lifecycle acceptance open until a repeatable test
characterizes or resolves that behavior. Real-framework CSP results and the
keyboard/screen-reader/high-contrast/DPI matrix are also prerequisites before an
unqualified product-readiness claim. Those gaps do not prevent beginning the
controlled bake-off; include teardown status in every run and retain the known
issue in the comparison record.

Scope feedback also makes clear that the host is **not a launcher-scale desktop
framework**. It deliberately omits product services such as multi-window shell
management, tray/notifications, updater/installer integration and long-running
download management. Keep it as controlled comparison infrastructure; carry its
security and packaging lessons to Tauri/Wails or WinUI if the eventual product
needs those broader capabilities. The [capability gap inventory](../../desktop-gui.md#1315-scope-boundary-benchmark-host-versus-complete-desktop-framework)
lists the additional process/lifecycle, IPC, filesystem/download, observability,
native chrome and localization work as well.

No full-product implementation, independent audit, Authenticode signing or FUT-09
completion is asserted by this record.

## Optional window controls and memory target — 2026-10-17

Implemented caption-free HTML title-bar mode (`decorations=false` plus optional
fixed window-control messaging), WebView2 CSS drag regions, and initial/native
LOW/NORMAL memory target selection. Default decorated/normal policy and CSP remain
unchanged. The caption-free mode retains native resize edges; it is not a complete
frameless-window framework or an implementation of native Snap hover targets.

Validation used MSVC 19.51.36260, Windows SDK 10.0.26100.0, the unchanged pinned
WebView2/WIL SDKs (offline archive/extracted-file integrity verification passed),
and Evergreen **155.0.4283.45**. Release and Debug CTest policy suites passed.
Both real-WebView2 **19-case** regression suites passed, including helper exit
within the 30-second deadline:

- Release: `.cache/test-472ce51412674a55bcc2729ea666a0c7`.
- Debug: `.cache/test-7e6329379d0e49c080ad8b1648ace52d`.
- The window fixture verified native caption style removal, resize style retained,
  actual maximize/restore/minimize state events and close, with exactly four
  accepted window commands. Three malformed requests were rejected; one synthetic
  encrypt action was active when the first window command was sent. The action-only
  bridge also rejected window-control tokens when that capability was absent.
- Memory tests applied LOW -> NORMAL -> LOW with successful getter read-back after
  each setter (three events), and exercised ordinary JS/CSP behavior under LOW.
  Invalid CLI target values failed. Target read-back is not memory reclamation
  evidence or a RAM cap. No performance/memory-saving result is claimed.

Builds initially used `out/options-x64` because older interactive runners locked
the standard executable. Tested isolated runner SHA-256/size:

| Configuration | Bytes | SHA-256 |
| --- | --- | --- |
| Release | 3,202,048 | `75D51561EB4983075E80CEB8A24D3927F99F33EAA355074A9DF197FC75AF4447` |
| Debug | 4,186,112 | `8CE2B49528CBE38653DEDA9D23C28FE808CB87E924C7DCF72FC1BE263883430F` |

The standard `out/msvc-x64` Release and Debug targets were also rebuilt. The
standard Release runner passed the existing Vite/TypeScript example test at
`../NeutronStar-Example/.cache/test-d41684c3d15349c7a66393001ef22ba5`:
9 native greetings, 6 rejected requests, 3 blocked resources, 1 blocked navigation,
and helper shutdown within the deadline. Its SHA-256 was
`B9FC6E1336A12831CA77A540E00E37158B29F646B9515ACD9264821A44AA5CB7`.
Separate build trees have separate artifacts; these hashes do not assert
byte-for-byte build reproducibility.

Two older standard Release host processes were observed with no main HWND after
the user closed the interactive instance. They still held the executable open;
only those two were stopped after explicit user approval. No root cause was
established. This observation and the earlier intermittent initialization-close
helper timeout remain open lifecycle evidence; these passing suites do not close
that acceptance item.

Still pending: physical drag/double-click/system-menu interaction, resize edges,
Win+Arrow/Snap/taskbar geometry, multi-monitor DPI, high contrast/Narrator, runtime
absence of the two optional interfaces, and repeated real memory/restore-latency
measurement. `--window-smoke-test` may briefly show/maximize its otherwise hidden
test window; it is correctness automation, not a rendering benchmark.

## Compiler and generator matrix: 2026-10-17

Executed `scripts/Test-Toolchains.ps1` across MSVC/MSBuild, clang-cl/MSBuild,
MSVC/Ninja Multi-Config and clang-cl/Ninja Multi-Config, each Release and Debug.
**All eight passed** native CTest, the 19-case WebView2 suite and the same compiled
Vite/TypeScript example suite. Each example run verified 9 greetings, 6 rejected
requests, 3 blocked resources and 1 blocked navigation, plus helper exit.

Tools: MSVC 19.51.36260.0, clang-cl 22.1.3, Microsoft link.exe 14.51.36260.0,
SDK 10.0.26100.0, CMake 4.3.1-msvc1, Ninja 1.13.2, WebView2 Runtime
155.0.4283.45. Official pinned WebView2/WIL dependencies passed offline integrity
checks. C++20, static CRT, strict warnings and Microsoft linker were held fixed.
Release uses `/O2 /Ob2 /DNDEBUG`; Debug uses `/Ob0 /Od /RTC1` with `/MTd`.

| Compiler / executor | Release bytes | Debug bytes | Both test configurations |
| --- | ---: | ---: | --- |
| MSVC / MSBuild | 501,248 | 4,319,744 | Passed |
| clang-cl / MSBuild | 549,888 | 4,178,944 | Passed |
| MSVC / Ninja | 501,248 | 4,319,744 | Passed |
| clang-cl / Ninja | 549,888 | 4,178,944 | Passed |

Full evidence: `.cache/toolchains-20261017-011737-7a38ea92/`, including all
configuration/build/native/WebView/example logs, `results.json` with per-artifact
SHA-256 and timings, `tools.json` and `source-hashes.json`. Builds are isolated
under `out/tc-6bf98e3b/`. Subsequent dumpbin inspection of all eight artifacts is
saved as `*-pe.txt` and `pe-audit.json`: x64, high-entropy ASLR, NX and CFG present;
no dynamic MSVC CRT import. Generated commands use Microsoft's linker even for
clang/Ninja. This does not establish memory safety or independent review.

The retained pilot `.cache/toolchains-20261017-011208-c0bae0dd/` exposed clang's
`MONITORINFO` aggregate-initialization warning. It was fixed by zero-initializing
the structure and assigning `cbSize` explicitly. No warning suppression was added.
The final clean matrix above reran all configurations. Short output paths also
avoid the pilot's CMake object-path-length warnings.

The old default cache had empty Release/Debug configuration flags. Therefore old
approximately 3.1 MiB Release artifacts were not a normal optimized baseline.
Explicit flags now live in the shared preset; standard `out/msvc-x64` Release and
Debug were reconfigured/rebuilt and both passed CTest after the matrix. The
standard optimized Release runner is 501,248 bytes. Historical hashes remain
records of their original artifacts; size reduction is not a Ninja/LLVM speedup.

The rebuilt standard Release runner also passed the example suite and helper
shutdown at `../NeutronStar-Example/.cache/test-05884ff52a074f06bcaab9397f0c0f60`.
Its SHA-256 is `633B698521B8CC1128B521CB28AADB067761E79C771D6042DCB4F6477AA30F6A`.
PowerShell parsing, preset JSON and the final matrix's source-hash manifest were
checked successfully after the documentation updates.

Follow-up binary inspection compared all four Release files by raw PE section
and disassembled the two compilers' Release greeting-protocol objects. Within
each compiler, MSBuild/Ninja `.text` hashes match exactly. MSVC binaries differ
only in four timestamp bytes; clang binaries differ in timestamp bytes and
18 path-separator bytes in embedded WIL header paths (22 bytes total). Raw
section sizes account for all 48,640 extra clang bytes: `.text` +35,328,
`.rdata` +11,264, `.pdata` +2,048. The internal `valid_id` helper illustrates
unrolling (MSVC 70 bytes, clang 1,015 bytes in the inspected objects). This is
limited inspection, not formal equivalence, a complete symbol-size attribution
or a performance/safety ranking. Evidence is saved beside the matrix as
`release-sections.json` and `*-greet-asm.txt`; interpretation and source links
are in [TOOLCHAIN.md](TOOLCHAIN.md#binary-and-assembly-inspection-follow-up).

## Default changed to clang-cl/Ninja: 2026-10-17

At the user's explicit selection, the default is now clang-cl + CMake/Ninja
Multi-Config, C++20 x64. This supersedes the earlier MSVC/MSBuild default advice.
Microsoft SDK/STL, static CRT, Microsoft linker, strict warnings, security flags
and host runtime policies remain in use. The selection is a workflow preference;
it does not establish a more secure compiler or faster GUI rendering.

Updated `Build.ps1` imports the official x64 VS developer environment in a child
process, locates LLVM/CMake/Ninja and builds the selected tree. It defaults to
`clang-cl-ninja-x64`, fails explicitly for missing tools and accepts `-Preset
msvc-x64` for the retained solution-based alternative. No installation, execution
policy bypass or silent compiler fallback was added. Release/debug build and
test aliases now select the clang/Ninja tree. The default host tests and example
run/tests select that same tree; explicit runner overrides remain available.
Visual Studio Open Folder uses the CMake preset; `.slnx` remains the optional
MSBuild-generator workflow. The Ninja architecture hint uses external x64
environment selection. Interactive F5 use was not revalidated in this change.

Executed against the standard `out/clang-cl-ninja-x64` outputs:

- `Build.ps1 -Configuration Release` and Debug: build and native CTest passed.
- Default Release 19-case host suite and helper shutdown:
  `.cache/test-9ad5d3abf290456b809b9ff8e481ac59`.
- Default Debug 19-case host suite and helper shutdown:
  `.cache/test-8f18fb8aa31343b199ffda9febe66b31`.
- Example Release: `../NeutronStar-Example/.cache/test-d3916af683be4e18b54c3add19f66bb1`.
- Example Debug: `../NeutronStar-Example/.cache/test-e6fb88957d7c404dade1d8780de92975`.
  Both verified 9 greetings, 6 rejected requests, 3 blocked resources,
  1 blocked navigation and helper exit.
- Alternative `Build.ps1 -Preset msvc-x64 -Configuration Release`: passed build
  and native CTest through the updated wrapper.
- Modified PowerShell scripts parsed without errors; preset JSON parsed and
  CMake listed the named default preset successfully.

| Standard clang-cl/Ninja artifact | SHA-256 |
| --- | --- |
| Release | `4AE49ADC08D33CD0F590A6FAA3EE8AE2C6EEF309D307AD29ABBCAA3DFF7C0928` |
| Debug | `E1EF1CBAD8CD12A92FF1E9F7954FB0C7799741F6AE63567DBC5CF8CBD0774851` |

The earlier eight-configuration matrix remains evidence for its own source and
script hashes; it was not rerun wholesale after this default-path change. No
frontend bake-off, GUI performance claim, exhaustive incremental-build test or
closure of the known intermittent teardown issue is asserted.

Build timings are one fresh build and one no-op invocation, not repeated latency
statistics. See [TOOLCHAIN.md](TOOLCHAIN.md#executed-matrix-results-2026-10-17).
No GUI rendering/startup/RAM comparison, ASan, ARM64, real nine-frontend acceptance
or physical accessibility/DPI acceptance was performed. The intermittent early
initialization helper-shutdown issue remains open despite all current passes.
