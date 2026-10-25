# NeutronStar Host

2026-10-24 follow-up: new application builds default to **embedded assets**;
the file-backed runner remains an explicit research/development option. Lifecycle
initialization/shutdown handling and loading backgrounds have changed after the
six-host cohort. See [startup/lifecycle details](STARTUP-AND-LIFECYCLE.md) and
[current validation](VALIDATION.md). The frozen six-host binaries/results have
not been rebuilt or relabeled. Tauri/Svelte remains the selected product stack.

## Current application build/run

Build your frontend production assets first. `scripts/Build.ps1` defaults to
embedded mode and requires your explicit `-AssetsDirectory <dist>`; it builds both the application runner
(`neutronstar_embedded_runner.exe`) and the explicit file-backed research runner
(`neutronstar_host_runner.exe`). An embedded Release app needs the installed
WebView2 Runtime, but no external frontend directory, Node or local server.

```powershell
# Separate output tree preserves the previous benchmark binary:
.\scripts\Build.ps1 -AssetsDirectory D:\Apps\my-svelte-app\dist -BuildTag my-app
.\Run.ps1 -BuildTag my-app
```

`Run.ps1` selects embedded mode and light color scheme by default. Match your UI
with `-BackgroundRgb` (white by default). Use `-FileAssets` explicitly with
`-AssetsDirectory` for file-backed mode; a file-only
build also accepts `scripts/Build.ps1 -FileAssets -BuildTag file-research` and
does not need Node or a prebuilt frontend merely to compile the C++ host.
Existing older run/test snippets below describe the original file-backed runner.
They remain useful for the controlled nine-frontend research lane, not the new
application default. Rebuild native embedded executables after asset changes.

For other trusted static frontends, set CMake's `NEUTRONSTAR_EMBED_ASSETS` to that
production tree in an isolated developer-environment build. The library accepts
owned `HostOptions::embedded_assets`; empty selects the compatible file-backed
mode. Embedded applications may omit `asset_directory`. Unknown embedded paths
never fall back to disk. Both modes keep the same synthetic origin, CSP and
resource/navigation restrictions. See the linked follow-up for limits and traces.

2026-10-17 frontend implementation: the separate
[nine-app workspace](../8-framework-test/README.md) now contains all candidates,
shared packages and correctness checks. All nine pass current native/browser
checks with an explicit pinned htmx no-storage patch. Its unmodified upstream
failure remains documented. See its
[validation](../8-framework-test/VALIDATION.md) and
[code comparison](../8-framework-test/CODE-COMPARISON.md). Benchmark runs remain
deferred. Older frontend-readiness paragraphs below are historical design context;
the workspace record is the current implementation status.

A small Windows 11 C++20 static library and runner for comparing locally built
web frontends in the **same WebView2 host**. It does not implement the eight GUIs,
encryption, the Go receiver, an updater, plugins or an application framework.

The native owner handles one HWND, STA initialization, asynchronous WebView2
creation, event lifetime, resizing, PerMonitorV2-related bounds/focus handling,
local resources and an optional two-action bridge. Frontend rendering stays in
the browser; no native messages or timers are needed for ordinary DOM updates.

This library is deliberately **not a full desktop application framework**. Use
it to hold native conditions constant while comparing static frontends, and
consider it only as a starting point for small single-purpose tools after the
remaining validation gates. A launcher with multiple windows, tray/notifications,
updates, background downloads and account/store integrations should start from a
complete framework such as Tauri v2, Wails or WinUI 3 + WebView2. Recreating
those services around this one-window host would transfer their long-term
maintenance to this project. The host's CSP, local-assets, narrow-bridge,
profile-separation and minimize policies can inform those architectures. The
[detailed product capability gap list](../../desktop-gui.md#1315-scope-boundary-benchmark-host-versus-complete-desktop-framework)
compares the missing shell, process, update, download, observability and
distribution responsibilities.

## Prerequisites

| Task | Required dependencies |
| --- | --- |
| Run the compiled host with already-built frontend assets | Windows 11, the built host runner, and a compatible **Microsoft Edge WebView2 Runtime**: installed Evergreen or an unpacked Fixed Version selected with `--runtime` |
| Build NeutronStar Example's frontend | **Node.js 24.21.x** on PATH, npm and the example's committed `package-lock.json`. Vite and TypeScript are installed as local development dependencies by `npm ci`; run `npm run build` to produce `dist` |
| Build the C++ host | Visual Studio 2026 C++ desktop tools, LLVM/Clang x64 and CMake/Ninja components, Windows SDK, CMake 4.2+ for the supplied workflow, PowerShell, and the pinned WebView2 SDK/WIL NuGet packages restored by the host script |

Node/npm are frontend **build-time** requirements; users running the compiled
host and existing `dist` assets do not need Node, npm, Vite or TypeScript.
The example records Node 24.21.x as its tested baseline; its package manifest
allows Node `>=24.21.0 <25`. Pin and verify compatible versions separately when
setting up the nine-frontend workspace.

The WebView2 SDK/loader used to compile the host does **not** contain the browser
engine. The WebView2 Runtime must be available when launching the app. The host
fails with a diagnostic if it is missing or incompatible; it never downloads or
installs a runtime. See [the example's setup and launch instructions](../NeutronStar-Example/README.md#build-and-run)
and [the tested tool/runtime versions](VALIDATION.md).

## Build choice

**Default: clang-cl + CMake + Ninja Multi-Config, C++20, x64.** This uses the
Microsoft ABI, Windows SDK, Microsoft STL/static CRT and Microsoft `link.exe`.
LLVM's compiler does not imply libc++, MinGW or LLD. This user-selected default
provides complementary diagnostics and a lighter build workflow; it does not
establish better GUI performance or greater memory safety.

MSVC remains a supported alternative compiler. Separate presets
cover MSVC and clang-cl with both Visual Studio/MSBuild and Ninja Multi-Config;
the installed LLVM 22.1.3/Ninja 1.13.2 combination passed all eight x64
Release/Debug configurations (native, real-WebView2 and example tests) in the
[compiler/build-system matrix](TOOLCHAIN.md#reproduce-the-compilergenerator-matrix).
Keep C++20. See the [measured build times and artifact sizes](TOOLCHAIN.md#executed-matrix-results-2026-10-17);
they do not establish a GUI memory or startup advantage.
MinGW-w64 GCC is not an accepted build configuration. See the detailed
[compiler, CMake/Ninja and dependency workflow comparison](TOOLCHAIN.md).
The ARM64 CMake preset is supplied but requires the ARM64 MSVC tools and has not
been built or executed here. No package manager/compiler/runtime is installed by
the build. The WebView2 loader is statically linked; WebView2 itself is not.

Requirements: Visual Studio 2026 C++ desktop/CMake components, Windows SDK,
CMake 4.2+ for the supplied VS 2026 presets, PowerShell and the pinned NuGet SDKs
in `dependencies.lock.json`. The reusable library's CMake language minimum is 3.25.
The tested tool/OS/runtime details belong in [VALIDATION.md](VALIDATION.md).
The routing follow-up passed its new fixture, but exposed an early-initialization
browser-helper shutdown failure in the expanded suite. Lifecycle acceptance is
reopened; consult that record rather than treating the original 14-case pass as
current proof of reliable teardown.

From this directory:

```powershell
# First restore may download only the two pinned official NuGet packages.
.\scripts\Restore-Dependencies.ps1
# Subsequent builds verify cached archives AND the complete extracted file set offline.
.\scripts\Build.ps1 -Configuration Release
# Synthetic native/WebView2 checks; helpers are started hidden.
.\scripts\Test-Host.ps1
```

Equivalent explicit CMake commands, after restoring/verifying dependencies:

```powershell
cmake --preset clang-cl-ninja-x64
cmake --build --preset release
ctest --preset release
```

`Build.ps1` imports the official x64 VS developer environment in a child process
and locates bundled LLVM/CMake/Ninja through `vswhere`. Explicit Ninja commands
need that environment and LLVM/CMake/Ninja on PATH. `release`/`debug` build/test
presets now target clang-cl/Ninja at `out/clang-cl-ninja-x64`. There is no silent
fallback when a default tool is missing. To build the alternative solution path,
use `Build.ps1 -Preset msvc-x64 -Configuration Release` (or Debug).
Scripts honor machine execution policy; no bypass is required or
recommended. Builds/restores may need the environment's normal tool permissions.
No network downloads occur during CMake configuration/build or host startup.

SDK packages are downloaded over HTTPS and checked against committed SHA-256
pins. Restore compares every extracted file and rejects modifications/extras.
This is integrity/provenance checking, not a claim of independent package audit
or NuGet signature-chain verification. `.cache`, `.packages` and `out` are ignored.
Do not commit the browser profile, SDK binaries or generated build artifacts.

## Open, build and debug in Visual Studio

The default workflow is **File > Open > Folder**, selecting the host root and
the `clang-cl-ninja-x64` preset. Visual Studio consumes CMake directly; Ninja does
not generate a solution. Configure launch arguments through Debug and Launch
Settings. `Build.ps1` is the ordinary-shell command-line entry point.

For the optional MSVC/MSBuild solution workflow, **the `.slnx` is generated under
`out/`, not stored in the host root.** That CMake configure step creates the
Visual Studio solution/projects from `CMakeLists.txt`;
the subsequent build step compiles them. On a fresh checkout, run from the host
root (with the prerequisites above installed and CMake on PATH):

```powershell
.\scripts\Restore-Dependencies.ps1
cmake --preset msvc-x64
```

You can then choose either opening method:

- **Open a Project or Solution:** open `out/msvc-x64/NeutronStarHost.slnx`.
- **File > Open > Folder:** select the `NeutronStar-Host` root folder. Visual
  Studio reads `CMakeLists.txt`/`CMakePresets.json` and configures the project
  directly; there is no need to locate a solution file manually. Select the
  `clang-cl-ninja-x64` default preset (or `msvc-x64` alternative), the runner
  target and its launch arguments. Ninja requires the developer environment and
  tool discovery described above.

The existing CMake configuration generates a regular Visual Studio 2026 solution
at `out/msvc-x64/NeutronStarHost.slnx`, containing `neutronstar_host` (static
library), `neutronstar_host_runner` (Windows executable), and
`neutronstar_policy_tests`. The solution/project files are generated build output;
change `CMakeLists.txt`/presets rather than editing generated `.vcxproj` files.

1. Open that `.slnx` in Visual Studio 2026. If it is absent, restore the pinned
   dependencies and run `cmake --preset msvc-x64` first.
2. Select **Debug | x64** and set **neutronstar_host_runner** as Startup Project.
3. Build the example frontend once using its README. Then open the runner's
   **Properties > Configuration Properties > Debugging > Command Arguments**
   and paste (the paths are relative to this generated solution directory):

   ```text
   --assets "$(SolutionDir)..\..\..\NeutronStar-Example\dist" --profile "$(SolutionDir)..\..\.cache\vs-profile" --test-greet
   ```

4. Press **F5** to build/debug the native host, or **Ctrl+F5** to run without the
   debugger. Close the running app before rebuilding its executable.

The runner needs these asset/profile arguments; launching it without arguments
does not choose a frontend automatically. The example's Vite build is separate
from the C++ solution build. The generated solution uses the same SDK includes,
libraries, resources/manifest and C++20 settings as the command-line build.

Alternatively, Visual Studio's **Open Folder** workflow can consume the host's
`CMakeLists.txt` and `CMakePresets.json` directly; configure its launch arguments
through Debug and Launch Settings. See [Microsoft's CMake Presets guide](https://learn.microsoft.com/en-us/cpp/build/cmake-presets-vs)
and [launch settings](https://learn.microsoft.com/en-us/cpp/build/launch-vs-schema-reference-cpp).
No `pch.h`/`pch.cpp` is required: this small library deliberately has no precompiled
header. PCH is an optional compilation-speed feature, not a Visual Studio project
requirement.

## Research readiness

The host is ready to run the planned local-static frontend bake-off, not to be
called a production-ready recipient app. The bounded native greeting is a demo.
The initial cohort should include the eight planned framework builds and a
vanilla HTML/CSS/TypeScript control using the same screen and behavior. No real
frontend winner, performance ranking or framework-specific CSP compatibility is
claimed yet.

The intermittent early-initialization browser-helper shutdown observation is
still an open lifecycle issue even though later full Release and Debug suites
passed. The controlled suite has not isolated the original trigger/root cause.
Keyboard/screen-reader, high-contrast, DPI/multi-monitor and real-framework
validation also remain pending. Details and evidence: [VALIDATION.md](VALIDATION.md).
Before creating the nine frontend projects, follow the [pre-implementation
gate](FRONTEND-IMPLEMENTATION-PLAN.md) to freeze the shared state/style/workload
contract and smoke-test the CSP-sensitive builds.

## Run one of the frontend candidates

For a runnable **Vite + strict TypeScript** baseline, start with
[NeutronStar Example](../NeutronStar-Example/README.md). Its Greet button calls
C++ through a separate opt-in test capability; no Tauri or Node runtime ships in
the assets. This does not close the recorded intermittent initialization-shutdown issue.

The supplied Tauri starter was inspected: see
[template compatibility and adaptation notes](TEMPLATE-COMPATIBILITY.md).
Its local UI fits this host, but TypeScript must be built and Tauri-only native
calls replaced; this host does not emulate the Tauri API.

Use the [frontend compatibility checklist](FRONTEND-CHECKLIST.md) for each variant.
The [routing decision](ROUTING.md) keeps the two-button baseline router-free and
recommends hash routing for a separately labeled navigation test. No native SPA
fallback or directory-index expansion is implemented.
Route data stays in memory by default; see the
[route-state policy](ROUTING.md#passing-state-between-routes) and proposed
[framework-neutral state core](STATE-MANAGEMENT.md). These are design notes, not
an installed state library or persistence feature.
The nine-implementation [shared UI design](UI-DESIGN.md) selects Nova-style spacing,
Neutral/Emerald, local Inter with script-specific Noto fallbacks, Lucide and
build-time Tailwind CSS v4. Matching semantic controls are framework-neutral;
React shadcn/Base UI is not required inside the other frontends. This is a design
decision for later implementation, not a completed UI or installed package set.
The [styling/recipe comparison](STYLING.md) recommends Tailwind v4 + CSS variables
and shared class recipes, and covers vanilla-extract, Panda, StyleX, Pigment and
CSS/SCSS alternatives. Ark is the selected higher-level UI direction where supported.

Build Svelte/React/Vue/Solid/Lit/Preact/Alpine/htmx assets independently later.
Use their production static output, with an `index.html`, local dependencies,
ES module chunks and external styles. Then reuse **this identical executable**:

```powershell
.\out\clang-cl-ninja-x64\Release\neutronstar_host_runner.exe `
  --assets "D:\NeutronStar\svelte-dist" `
  --profile "D:\NeutronStar\profiles\svelte"
```

### TypeScript frontend support

**TypeScript-authored frontends are supported through their compiled production
assets.** Write frontend code in `.ts` (or framework-specific TypeScript/TSX
components), type-check it during the frontend build, and emit browser JavaScript
and external CSS into `dist`. Pass that complete directory to `--assets`.

```text
frontend/src/*.ts / components
    -> frontend type-check + production build (for example, Vite)
    -> dist/index.html + assets/*.js + assets/*.css + local images/fonts
    -> NeutronStar Host --assets <absolute path to dist> --profile <separate path>
```

The host serves `.js`/`.mjs` modules with JavaScript MIME types. Module imports,
dynamic chunks and root-relative assets resolve against its local synthetic
origin. Bundle package imports into browser-ready output; Node APIs and bare npm
imports are not supplied by the host. Keep all emitted chunks and assets together.
For client-side routing use hash routing, since missing paths have no SPA fallback.

There is no TypeScript compiler, Node runtime, Vite dev server or HMR inside the
host. Raw `.ts`/`.tsx` files are not executable dist assets and are not in its MIME
allowlist. TypeScript must compile to JavaScript before loading; enabling a `.ts`
MIME type would not perform that compilation. Type-checking is a separate build
gate because transpiling alone does not establish type correctness.

Apply this same build boundary to all nine frontend implementations, including
the TypeScript vanilla baseline.
Use production builds with local dependencies and the unchanged host CSP. In
particular, verify extracted CSS, generated style attributes and any eval-based
features. Source maps are not served by the current MIME policy. No package or
frontend compiler is added to the C++ host by this support contract.

`--assets` and `--profile` are required, local, separate directory trees. An
optional `--runtime "D:\NeutronStar\runtime"` selects an already-unpacked Fixed
Version runtime. Otherwise the installed Evergreen runtime is selected. Missing
or incompatible runtimes fail; the host never downloads/installs a runtime.
Use distinct profiles, the same browser distribution/version, and equivalent
frontend content when comparing results. The full process tree still counts.

The runner has no native action callback by default. Its `--smoke-test`,
`--bridge-smoke-test`, early-close flags, timeout and numeric JSONL report are
verification aids, not a performance harness or the future benchmark UI. `--report`
is explicit diagnostic output; it records fixed event IDs/HRESULTs/timing/runtime,
not URL/document-title/input contents. Timings are internal milestones, not proof
of first paint/input readiness or comparative performance. Exit: 0 success,
1 initialization/runtime failure, 2 smoke assertion failure, 3 timeout.

## Optional HTML title bar and memory target

Both features are opt-in. The default remains a decorated native window and the
runtime's normal memory target; use those defaults for the primary nine-app lane.
Reports record `decorations`, `window_controls` and `memory_target` so optional
variants cannot be silently mixed into baseline measurements.

### Custom HTML title bar

`--custom-titlebar` sets `HostOptions::decorations = false` and
`allow_window_controls = true`. It removes the native title/caption buttons,
retaining a narrow native resize frame and OS system-menu behavior. This is a
caption-free resizable window, not a promise of pixel-identical Tauri decorations
or a completely borderless fixed-size surface. The HTML assets must supply the
title and keyboard-accessible buttons.

The host enables WebView2's `ICoreWebView2Settings9` non-client region support.
Use **external CSS** with `app-region: drag` (and optionally
`-webkit-app-region: drag`) on the title area and `app-region: no-drag` on the
buttons/interactive descendants. WebView2 handles dragging, double-click
maximize/restore and the title area's system menu; no pointer coordinates or
generic drag RPC are exposed. A runtime lacking the requested interface fails
initialization rather than silently changing the feature.

**Drag regions can be placed anywhere in the HTML layout**, including a top bar,
bottom bar, left/right sidebar, or multiple separate regions. They do not have
to touch a window edge. Snapping the window to a side does not impose a new CSS
placement requirement; a responsive layout may relocate the handle if desired.
Keep buttons, links, inputs and selectable/editable content outside a drag region
or explicitly mark those descendants `no-drag`:

```css
.sidebar { app-region: drag; -webkit-app-region: drag; }
.sidebar button,
.sidebar a,
.sidebar input { app-region: no-drag; -webkit-app-region: no-drag; }
```

Drag regions move the window; they are not resize handles. The host's native
resize edges handle resizing separately. Physical dragging out of left/right/
quadrant snapped positions, moving across monitors and the resulting restore
geometry still need manual validation in this host; this placement guidance is
not evidence that those scenarios have passed.

Window buttons send one of exactly three strings:

```javascript
window.chrome.webview.postMessage('neutronstar.window.minimize.v1');
window.chrome.webview.postMessage('neutronstar.window.toggle-maximize.v1');
window.chrome.webview.postMessage('neutronstar.window.close.v1');
```

The capability is independent of the encrypt/decrypt/greeting busy gate, so
window controls work during an operation. Requests pass the same local-origin
and bounded-message checks, then post fixed Win32 system commands on the STA.
No arguments, file paths, arbitrary window handles or native API names are
accepted; no JS bridge reply is sent. Reusing a caption-free window with controls
disabled is possible through the library when an embedder owns other controls.

From this directory, run the local interactive fixture:

```powershell
.\out\clang-cl-ninja-x64\Release\neutronstar_host_runner.exe `
  --assets "$PWD\tests\fixtures\smoke" `
  --profile "$PWD\.cache\titlebar-demo" `
  --entry window.html --custom-titlebar
```

Automated checks cover caption style removal, maximize/restore/minimize/close,
command grammar, disabled-capability rejection and commands during action busy.
Physical dragging, edge resizing, Snap/Win+Arrow, Alt+F4, multi-monitor DPI,
Narrator/high contrast and focus behavior still require manual validation.
The HTML maximize button is not a native caption hit target; native Snap Layout
hover parity is not implemented or claimed.

### Low-memory target

`--memory-target normal|low` chooses the initial target. `low` uses the official
`ICoreWebView2_19::put_MemoryUsageTargetLevel(LOW)` API and verifies target
read-back. Library embedders can call
`HostWindow::set_memory_usage_target(MemoryUsageTarget::low)` and later `normal`
on the creating STA thread after the controller is ready. Invalid enum/CLI values
or unsupported APIs fail explicitly. The default normal startup leaves the
browser setting untouched.

LOW is a **best-effort memory target**, intended especially for inactive views.
Scripts continue to run; it is not suspension, a memory cap or a single-process
mode. Pages may be paged out, and restore latency/hard faults may increase. The
CLI keeps the chosen target until explicitly changed or closed; it does not
automatically restore NORMAL on activation. No `TrySuspend`, working-set trim,
GPU disable, sandbox change or Chromium command-line flag is introduced. Measure
private bytes/private working set and responsiveness before claiming savings.

WRY exposes `set_memory_usage_level(Low/Normal)` over this same Windows API. The
inspected Tauri configuration has `additionalBrowserArgs`, but no dedicated
`memoryUsageLevel` config field; do not confuse arbitrary Chromium low-end flags
with this supported WebView2 target. Sources:
[WRY Windows extension API](https://github.com/tauri-apps/wry/blob/dev/src/lib.rs),
[Microsoft memory-target API](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2_19),
[WebView2 drag regions](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2settings9),
[Tauri configuration](https://v2.tauri.app/reference/config/).

Add `--memory-target low` to a runner command only for a separately labeled
memory experiment. Keep runtime/profile/asset conditions identical across all
frontends within that experiment. See [MEMORY-NOTES.md](MEMORY-NOTES.md).

## Reuse the library from CMake

```cmake
add_subdirectory(path/to/NeutronStar-Host neutronstar-build)
target_link_libraries(your_app PRIVATE NeutronStar::Host)
```

The public interface is [host_window.hpp](include/neutronstar/host_window.hpp).
Call `HostWindow::create(HostOptions)`, retain the returned unique owner, and pump
the STA message loop (`run()` is a single-window convenience). `native_handle()`
supports external observation; it does not transfer ownership. Call `close()`
and destroy on the creating UI thread. In an embedding app, provide an asInvoker,
PerMonitorV2 manifest and compatible linker hardening/CRT settings; the library
does not mutate the application's process-wide DPI policy.

Standalone presets use `/MT` (`/MTd` Debug). An embedding build defaults to its
parent CRT selection; all targets exchanging C++ objects must match. Configure
`NEUTRONSTAR_STATIC_CRT` deliberately when needed. This is a source/static-library
interface using the C++ standard library, not a stable cross-compiler DLL ABI.
`on_event` is synchronous and must be quick/nonthrowing; closing during a callback
is supported. An exception from a native observer marks failure and schedules
close. Async completion callbacks hold weak state, so closing does not leave a
callback referencing a deleted window; any late-created controller is closed.

## Optional button/action bridge

Set `HostOptions::on_action` to opt in. With both bridge callbacks absent, web messaging is disabled.
The callback receives only `Action::encrypt` or `Action::decrypt` on the STA:

```javascript
// Later frontend event handlers; no host command syntax, filenames or secret data.
window.chrome.webview.postMessage('neutronstar.action.encrypt.v1');
window.chrome.webview.postMessage('neutronstar.action.decrypt.v1');
window.chrome.webview.addEventListener('message', event => {
  // event.data is one of the documented fixed status tokens.
});
```

The host validates the source URL and accepts exactly those strings. Objects,
unknown versions/commands, extra payloads and strings over 64 UTF-16 code units
are rejected. WebView2 allocates/deserializes received messages before the host
can apply that limit; it is not a pre-allocation guarantee against a compromised
renderer. The asset tree is trusted application code.

One action may be queued/in flight. The host posts one enum through the native
message loop, reports `neutronstar.status.busy.v1`, then invokes the callback.
Duplicates while busy are rejected; they do not accumulate an unbounded native
work queue. Call `post_status(Status::succeeded/failed/canceled/idle)` on the STA
to emit a terminal token and release the gate. `Status::busy` keeps it held.
Tokens use `neutronstar.status.<name>.v1`. No arbitrary JS execution or JSON
response payload is exposed. No per-frame polling, progress IPC or backend work
is performed by the library.

The bridge smoke test acknowledges synthetic commands only. **No Go process is
launched.** A future integration must perform process work asynchronously and
marshal completion to the STA, pin the executable, define request/operation IDs,
cancellation, paths and the separate passphrase boundary, and review those changes.
This tiny protocol neither transports secrets nor constitutes a reviewed
production CLI interface. Keep it off during frontend-only comparisons unless
the same explicitly labeled action scenario is enabled for all eight frontends.

## Local content and policy

### Optional synthetic greeting capability

`HostOptions::on_test_greet` enables a separate, example-only native request.
The runner opts in with `--test-greet`; neither the default runner nor the
action-only bridge admits it. Encrypt/decrypt tokens and fixed statuses are unchanged.
The callback receives `TestGreetRequest { id, name }` on the STA after message-loop
dispatch, then replies with `post_test_greeting(id, text)`. It shares the existing
one-in-flight gate with actions, rejects unmatched reply IDs, and closes without
logging request/reply contents. Keep callbacks brief and return a reply to release
the gate; missing replies leave it busy until close. The client has a five-second
timeout, which does not cancel native work or reset that native gate.

Request wire: `neutronstar.test.greet.v1:<id>:<name-hex>`; result wire:
`neutronstar.test.greet.result.v1:<id>:<text-hex>`. IDs are exactly 32 lowercase
hex characters, generated randomly per request in the example. Each UTF-16 code
unit is four lowercase hex characters. Names are bounded to 120 units and replies
to 256; malformed/lone surrogates are rejected. This narrow ASCII-string grammar
preserves quotes, Unicode and embedded NUL without COM string truncation or a
general JSON parser. It is encoding, not encryption. IDs correlate replies and
are not authorization. Parsing occurs after WebView2's own message allocation.
No trimming or empty-name substitution occurs. Use synthetic names only: this
capability is not a production data/password interface or general RPC framework.

`--test-greet-smoke-test` delays synthetic replies 100 ms solely to exercise the
busy gate and checks callback/rejection counts. It is not an IPC benchmark.

### Resource footprint

The host executable size excludes its browser processes. See the measured
[process-tree snapshot and optimization plan](MEMORY-NOTES.md). A shared installed
runtime does not mean arbitrary applications share one browser process. Keep
foreground, minimized, low-memory and suspended measurements separately labeled.

- One synthetic origin, `https://neutronstar.invalid/`, served directly by
  WebView2 resource events: **no HTTP listener, DNS-backed content server or dev
  server**. Same-origin GET supports static HTML fragments (including later htmx
  experiments); methods other than GET are denied. No generated backend responses.
- URI parsing rejects foreign/noncanonical origins, traversal, double encoding,
  encoded separators, device names, alternate data streams and invalid UTF-8.
  MIME types are allowlisted and resources capped at 32 MiB per file. Reparse
  components are refused and final file handles checked against the held root.
  Missing resources are 404; there is no directory listing or SPA path fallback.
  Use hash routing and ordinary relative/root-relative static asset paths.
- Every response gets CSP, `nosniff`, `no-store` and `no-referrer`. CSP permits
  local scripts/styles/fonts/images and same-origin local fetches; it forbids
  inline style attributes, eval, workers/service workers, frames, objects and
  forms. No CSP relaxation for any of the eight frontends: e.g. use Alpine's CSP
  build and avoid directives/animation libraries that write style attributes.
- External top-level navigation, new windows, external schemes, downloads,
  permissions and external drops are blocked. Host objects, devtools, browser
  accelerator shortcuts, default context/script dialogs, autofill/password saving
  and extensions are disabled. Normal HTML controls, JS/ES modules and keyboard
  tabbing remain available; verify AT behavior in the later UI tests.
- InPrivate is explicitly selected with an isolated supplied user-data directory.
  Browser/OS metadata and files may still be written there. The host does not
  promise erasure or automatically delete profiles. No plaintext/key handling.
- `WEBVIEW2_*` environment overrides cause controlled runs to fail, rather than
  silently changing runtime/arguments/profile. Machine policy and runtime/OS
  servicing remain external factors; record actual resolved runtime information.

This is a benchmark host for **trusted, locally built assets in a trusted local
directory**. It is not a sandbox for attacker-controlled HTML, a secret-file
server or a replacement for the receiver's path/ACL checks. Final confinement
does not make concurrent hostile installation-tree changes safe (including
reparse replacement races); keep assets immutable for a run. InPrivate/CSP/blocked
page requests do not prove that WebView2/Windows performs no background network
activity. No process-aware network trace, firewall-isolated acceptance, independent
review, code signing or complete Windows accessibility trial is claimed here.

## References consulted

The user's Codex Electron manifest/reverse-engineering notes are assessed in
[desktop-gui.md section 13.10](../../desktop-gui.md#1310-user-supplied-codex-electron-inspection-transferable-architecture-lessons).
The transferable lessons are UI/native separation, production asset builds,
versioned operation contracts, runtime validation and lifecycle discipline.
Our existing two-action bridge follows that direction without a Node/preload
layer. Native Node addons do not run in this host; browser component libraries
still require individual CSP/asset compatibility checks. No terminal, database,
telemetry, updater or extra frontend dependency was added from that example.

Original C++ implementation; reference patterns were inspected, not copied as a
framework dependency. Microsoft SDK/WIL are the only external build packages.

- [Microsoft Win32 guide](https://learn.microsoft.com/en-us/microsoft-edge/webview2/get-started/win32),
  [local content](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/working-with-local-content),
  [security guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/security),
  [WIL](https://github.com/microsoft/wil).
- [WRY Windows lifecycle](https://github.com/tauri-apps/wry/blob/6642074224a2db9eb197f69d21b300b02b5dcd49/src/webview2/mod.rs),
  [TAO window handling](https://github.com/tauri-apps/tao/blob/0c025d22e90bd120d0298ce8dc3a8a3ad9090bbf/src/platform_impl/windows/window.rs),
  [Tauri runtime integration](https://github.com/tauri-apps/tauri/blob/136a28eaa879e8aa706f9b2e05a050c46dcc1f4f/crates/tauri-runtime-wry/src/lib.rs).
  Reference commits resolved 2026-10-16. Do not copy WRY's extra browser flags or
  turn off browser protection to match its configuration.
- [Microsoft C# CoreWebView2/WPF sample](https://github.com/MicrosoftEdge/WebView2Samples/blob/main/SampleApps/WebView2WpfBrowser/MainWindow.xaml.cs)
  (main, read 2026-10-16) and
  [Wails v2.15.0 Windows host](https://github.com/wailsapp/wails/blob/v2.15.0/v2/internal/frontend/desktop/windows/frontend.go).
  Lifecycle/settings are useful references; browser samples'
  broad APIs and Wails' Go bindings are not imported into this library.

NuGet package terms/notices remain inside the verified archives. Preserve those
terms and notices when distributing SDK loader-derived binaries. This local
unsigned research candidate is not a selected or signed Zodiac release.

### External benchmark collection

The nine-app workspace now has a separate [Windows measurement harness](../8-framework-test/measurement/README.md)
for process-tree memory/CPU, direct versus controlled PowerShell launch timing,
UIA readiness and coarse client-frame evidence. .NET 10 Windows Desktop and
Python are tooling requirements for this collector, **not host runtime
dependencies**. The C++ library/runner remains unchanged. Collection does not
enable DevTools, relax CSP or add privileged messages. A later Electron versus
Avalonia/Skia comparison needs equivalent apps plus additional GPU/energy,
packaging and native accessibility evidence; nine frontends in this host alone
cannot establish that comparison.

Initial collection is complete: [900 primary + 210 supplemental passing attempts](../8-framework-test/results/2026-10-17/RESULTS.md).
Read the [interpretation](../8-framework-test/results/2026-10-17/INTERPRETATION.md)
before ranking frameworks. The C++ host/assets were unchanged; the collector's
UIA/PID-attribution fixes and rejected preliminary cohorts are documented. Normal
Ready-to-close success does not resolve the older early-init shutdown gate.
