# Before building the nine NeutronStar frontends

Implementation update, 2026-10-17: all nine now exist in
[`../8-framework-test`](../8-framework-test/README.md), with a pinned pnpm
workspace, shared packages, local assets and independent renderers. All nine pass
the current native/browser checks with htmx's explicit offline no-storage patch.
The original unmodified htmx failure remains in the validation record. The
user approved a dialog-only bounded CSSOM style exception, documented in the
workspace contract. Initial external measurement is now complete: 900 primary
and 210 supplemental attempts passed. See the
[measured results](../8-framework-test/results/2026-10-17/RESULTS.md),
[interpretation](../8-framework-test/results/2026-10-17/INTERPRETATION.md),
[validation record](../8-framework-test/VALIDATION.md) and
[source comparison](../8-framework-test/CODE-COMPARISON.md). The original
pre-implementation requirements below remain design history; they are not the
current implementation status. Physical Windows accessibility and broader
benchmark scenarios remain open.

Startup measurement clarification, 2026-10-17: the workspace
[measurement protocol](../8-framework-test/BENCHMARKING.md) now separates
Explorer/PowerShell launch overhead, host process creation, visible window,
loading text, blank/black intervals, complete content and usable Ready. First
and repeat launches form a diagnostic pair after verified helper shutdown;
neither is automatically OS-cold. Initial external collection is now published
above; physical presentation and extended scenarios remain open. Full screens/readiness and the current renderer compatibility checks
are already implemented; see the validation record above for the htmx exception.

Supplemental follow-up: all nine now pass real-host list/filter/remount checks
under the unchanged CSP, using a separate correctness build. Opt-in diagnostic
builds provide bounded browser timing entries and tested summary helpers; see
[diagnostic scope](../8-framework-test/DIAGNOSTICS.md). They do not implement the
external Windows collector themselves; the separate external harness has now
completed the initial cohorts linked above. Production assets remain free of instrumentation.

Agreed next phase, 2026-10-17: implement/validate the external Windows measurement
harness, freeze environment/artifacts, pilot vanilla/Svelte/React, then measure
all nine in randomized rounds and analyze distributions plus accessibility/DX.
The harness must capture launch-method overhead, UIA Ready, synchronized visible
loading/blank transitions and full process-tree resources. Existing browser
observers do not cover those external endpoints. See the
[sequenced measurement gates](../8-framework-test/BENCHMARKING.md#agreed-next-steps--2026-10-17).
No full performance cohort or final product framework selection is complete.

Status: **pre-implementation plan**, 2026-10-16. No shared package, style system,
store, frontend app or test harness is implemented by this document. The goal is
to freeze the common contract before nine implementations begin to drift.

## What the first comparison should answer

Build nine separate production frontends for the same screen and workload:
Svelte 5, React, Vue, Solid, Lit, Preact, Alpine.js, htmx, and one **vanilla
HTML/CSS/TypeScript** implementation. Use the same NeutronStar Host binary,
WebView2 runtime, CSP, dimensions, assets, state semantics and action trace.

2026-10-17 toolchain decision: the host default is now **clang-cl + CMake/Ninja
Multi-Config, C++20 x64**, using the Microsoft SDK/STL/static CRT and linker.
Build via `scripts/Build.ps1`; freeze the resulting Release host hash and use
that same executable for all nine frontends. MSVC/MSBuild remains a supported
alternative and complementary check, not a per-frontend compiler choice. The
compiler/build change does not establish a GUI performance or safety ranking.
See [TOOLCHAIN.md](TOOLCHAIN.md).

This primary lane measures the extra rendering/adaptation cost of each frontend
over the vanilla baseline. A shared state core means it does **not** measure each
framework's native store cost. Record this limit in the result title and cards.
If native-store or component-library ecosystem cost is important, run a second,
separately labeled **idiomatic integration lane** after the controlled lane. Do
not blend its results into the renderer comparison.

## Freeze before parallel frontend implementation

1. **Cohort and question.** Freeze the eight framework versions/production build
   conventions and the vanilla baseline. Record the exact thing being compared:
   controlled renderers with shared state/style/workload, then optionally
   idiomatic DX/integration as a separate task set.
2. **One interaction and accessibility contract.** Freeze exact copy, control
   order, dimensions, empty/busy/success/error/canceled states, keyboard
   behavior, focus, labels, status announcements, reduced motion, theme and RTL
   rules. Ark/Zag is the primary control-behavior direction across the nine
   implementations: use Ark's framework package where available and a tested
   Zag-based adapter/integration for the other renderers. Use native HTML as the
   semantic substrate and as a deliberate fallback where Ark/Zag lacks a
   suitable control or native behavior is the better fit. Keep the actual
   control inventory identical; do not let each app choose a different library.
3. **Visual artifact.** Turn Nova/Neutral/Emerald into reviewed literal CSS
   tokens: light/dark surfaces, text, muted text, borders, action colors, focus
   ring and radius. Freeze actual type sizes, spacing/control heights, local
   Inter/Noto Sans Hebrew/Arabic font files and emoji fallback, Lucide SVG
   geometry, filenames, licenses and hashes. Tailwind CSS v4 emits one common
   external stylesheet from a complete literal class inventory; all nine use
   the same stylesheet bytes and class recipes. No per-app theme tweaks.
4. **Baseline control scope.** Freeze the exact initial screen's shared control
   inventory and use Ark/Zag behavior as the primary implementation direction
   across all nine apps. Ark's supported React/Vue/Solid/Svelte packages are the
   preferred wrappers; use pinned Zag machines and tested integrations for
   Preact, Lit, Alpine, htmx and vanilla where Ark has no package. Native controls
   remain the substrate/fallback for controls without a suitable Ark/Zag
   behavior or where native behavior is explicitly chosen. Do not build a generic
   20-control library before the first comparison. Record per-app adapters,
   lifecycle, CSP and bundle costs; validate equivalent behavior and appearance.
5. **Application-state contract.** Freeze a small typed state/action schema for
   view, fixture ID, operation status, progress and reset. Freeze legal
   transitions, exact fixture data, 2-second operation, 10 Hz updates,
   cancel/reset behavior, notification timing and stable snapshots. Use one
   document-local Nano Stores core in every controlled frontend, after pinning
   versions and passing the adapter/CSP spike. Use its framework adapters where
   available and direct subscriptions for vanilla/htmx. Keep transitions and
   selectors in a small typed domain module. State that this measures renderer +
   adapter, not native state engines. Never duplicate a second framework store
   as a second owner.
6. **Routing and persistence.** Primary workload has no router. Views switch in
   the same document and in-memory state lives in the common store. A separate
   navigation scenario can use hash routes in all variants. No history/path
   fallback, storage middleware or URLs containing test text. Reload resets to a
   safe initial state.
7. **Build and host contract.** Pin Node, package manager, Vite, TypeScript,
   framework/compiler plugins and app dependencies in a dedicated workspace
   under `8-framework-test/`; do not change the website root dependencies. One
   reproducible lockfile, exact notices, `typecheck` and production build per
   app. Use the same Vite/build target where supported. Start with the example's
   verified settings: `base: './'`, `build.assetsInlineLimit: 0` and
   `build.sourcemap: false`; record an explicit common browser target because
   the example's TypeScript target alone does not fix Vite's output target.
   Emit only local
   allow-listed files, no maps or inline styles/scripts, and run every build
   under the existing CSP without changing the host. Test Lit's stylesheet
   delivery in an actual WebView before freezing its DOM/shadow-root mode.
8. **Test manifest and results format.** Define a machine-readable manifest per
   app: commit, package versions, host hash, runtime version, asset manifest,
   stylesheet hash, output size, scenario and profile policy. Freeze the UI
   Automation trace and visible readiness endpoint. Record not-measured,
   failed and unsupported distinctly. Keep the native bridge off for the main
   UI lane; test synthetic bridge behavior separately and identically.
   Record the new optional host settings too: primary runs use decorated
   windows, window-control messaging disabled, and normal memory targeting.
   `--custom-titlebar` and `--memory-target low` are separately labeled host-policy
   scenarios, each applied consistently to every frontend in that scenario.
9. **One smoke spike per distinct renderer/control integration.** Before
   building the nine full apps, compile the shared style/store package and prove
   the selected Ark/Zag control path in each renderer: Ark packages in React,
   Vue, Solid and Svelte; Zag-based integrations in Preact, Lit, Alpine, htmx and
   vanilla. These small fixtures must pass real-host CSP, interaction and
   teardown checks; include Lit stylesheet scope and Alpine's CSP build. Resolve
   emitted assets, style attributes, adapter versions and routing assumptions.
   Then implement the frozen common screen in vanilla and one framework before
   applying it to the remaining seven.

## Suggested workspace boundary

```text
8-framework-test/
  package.json                 # workspace scripts and pinned package manager
  pnpm-workspace.yaml
  pnpm-lock.yaml
  packages/
    bench-contract/             # Nano Stores core + typed actions/transitions
    bench-domain/               # pure TS fixtures, simulation rules and formatting
    design/                     # tokens, class recipes, local fonts/icons, CSS
    test-support/               # shared non-secret behavior assertions/trace
  apps/
    vanilla/
    svelte/
    react/
    vue/
    solid/
    lit/
    preact/
    alpine/
    htmx/
```

Workspace packages are source/build inputs only. Each host run points to one
independently built app output tree and one isolated profile. Do not put the
host, Go CLI, secrets, runtime profile or generated benchmark captures in the
shared package.

## Shared versus framework-owned

| Shared verbatim across all nine | Implemented per frontend |
|---|---|
| Screen text, semantics, layout dimensions and state/transition contract | Component syntax and lifecycle hooks |
| CSS tokens, stylesheet bytes, class recipes, font/icon assets | Thin subscription/update adapter |
| Fixed fixture, action trace, timing and accessibility expectations | Framework compiler/runtime and required adapter packages |
| Control inventory and Ark/Zag behavior specification, native fallback rules, hash policy | Ark wrapper or Zag/native adapter, framework-owned rendering and lifecycle |
| Host binary/runtime/CSP/profile conditions | Source map from behavior to framework-specific implementation |

Sharing actual rendered controls through an imperative DOM/Web Component layer
would measure the shared layer instead of the framework renderers. Share
specification, assets and tiny state core; let each framework own its render tree.

## What not to build before the first comparison

- No shared UI framework, wrapper engine or 20-control library.
- No Zustand/TanStack package in the controlled lane: Nano Stores is the selected
  common state substrate. Compare alternative stores only in a separately
  labeled store/DX lane; TanStack Store is currently documented as alpha.
- Ark/Zag is part of the primary shared-control direction. Do not add a different
  behavior library per frontend; record the exact Ark wrapper/Zag adapter and
  dependency bytes in each app. Native controls are fallback/substrate, not the
  planned default for the shared interactive UI.
- No router in the primary screen, no persistence, no Go CLI, no crypto, no
  secrets, no telemetry, no native bridge in ordinary rendering trials.
- No per-framework exceptions to CSP, assets, font/style tokens or operation
  semantics. If one cannot meet the same contract, capture that as a result.

## Recommended defaults for the first implementation

These defaults were selected to let implementation begin without another design
round. They are the common contract unless a real-host compatibility spike proves
one cannot work under the unchanged host policy. Any resulting change must be
applied to all nine variants and recorded before comparative runs.

### Screen and interaction

- Window: existing **960 x 640 DIP** host baseline. App content uses 28 px outer
  padding, a 24 px page title, 14 px body copy, 40 px controls, 16 px card padding
  and a 20 px grid gap. At widths below 760 px, the two cards stack; test that as
  responsive QA, not as the primary performance viewport.
- Header copy: **“NeutronStar GUI Bench”** and **“A UI-only simulation for comparing desktop frontends.”** Add a visible badge: **“SIMULATION · NO FILES OR CRYPTOGRAPHY.”** Keep the window title identical across variants; the manifest identifies the framework.
- Main area: two equal cards, **Decrypt** on the left and **Encrypt** on the
  right. Decrypt shows the fixed label **“Synthetic sample: starlight.nsx”**
  with **“No disk file is opened.”** Encrypt shows a read-only sample text,
  **“Zodiac GUI benchmark — שלום — مرحبًا — 🌠”**. Neither fixture is sent to the
  host or processed cryptographically.
- Actions: buttons say **“Simulate decryption”** and **“Simulate encryption.”**
  Either starts the same two-second visual operation. During work, show a
  progress indicator and **“Simulating {encryption|decryption}…”**; both action
  buttons are disabled and a **“Cancel”** action is available. On completion,
  show **“Simulation complete. No file was changed.”** On cancellation, show
  **“Simulation canceled.”** A test-only injected failure may show **“Simulation
  failed. No file was changed.”** Show a **“Reset”** action that returns the
  operation state to Ready and progress to zero. Do not expose a fake error
  button in the UI.
- Add an **“About this test”** affordance opening an accessible dialog whose copy
  explains that actions are simulations and no files, cryptography, Go CLI,
  network or native bridge are involved. This provides one meaningful Ark/Zag
  dialog behavior in addition to the shared action controls.
- Shared control priority: use Ark components for the supported framework
  packages and Zag machines/adapters for Preact, Lit, Alpine, htmx and vanilla.
  The selected control inventory should exercise at least the dialog and the
  progress/status interaction. Use native HTML as the underlying semantic
  element or fallback only where Ark/Zag has no suitable behavior. All nine
  versions must match behavior and accessible names, even when their adapter
  implementation differs.

### State and timed action

- Keep the chosen Nano Stores core with one immutable `BenchState` atom and
  named typed transitions. State is `ready | running | success | canceled |
  error`, with operation `encrypt | decrypt | null`, progress `0..100`, and one
  fixed synthetic fixture identifier. No other store, router or persistence.
- Legal transitions: `ready/success/canceled/error -> running`; `running ->
  success` at 2,000 ms or `running -> canceled` on Cancel. A test harness can
  inject `running -> error`. Starting again resets progress to zero. Completion
  remains visible until the next action or explicit Reset. Only one operation
  can be active at once. Cancel, Reset and disposal invalidate the active run
  generation and clear its timer; late callbacks from that generation cannot
  change a reset state or a subsequent run. Test this without introducing a
  native bridge or changing the visible synthetic fixture identifier.
- Use one shared timer helper: target 10 updates/second for 2 seconds (20 steps,
  nominally 5 percentage points each), computing progress from elapsed monotonic
  time rather than assuming timers fire exactly on schedule. Do not perform
  crypto, file I/O, IPC or artificial CPU work. Report actual observed update
  counts/timing if a renderer misses a tick; do not compensate with a burst.
- Status changes use a polite live region; progress exposes a consistent
  accessible label/value. Dialog focus entry, Escape dismissal and focus return
  follow one shared behavior trace.

### Visual tokens and assets

- Preserve **Nova + Neutral + Emerald + Inter + Lucide + Tailwind CSS v4**.
  Baseline theme is deterministic light mode (not inherited from Windows); dark
  theme uses the same token map and is checked in visual/accessibility QA, not
  mixed into the initial performance lane.
- Proposed light tokens: background `#F8FAF9`, foreground `#171A18`, card
  `#FFFFFF`, muted `#F1F4F2`, muted foreground `#5D6660`, border/input
  `#DCE3DE`, primary `#047857`, primary foreground `#FFFFFF`, destructive
  `#B42318`, focus ring `#047857`.
- Proposed dark tokens: background `#101412`, foreground `#F0F3F1`, card
  `#171D19`, muted `#202923`, muted foreground `#A7B2AA`, border/input
  `#313B34`, primary `#34D399`, primary foreground `#062B20`, destructive
  `#F87171`, focus ring `#6EE7B7`.
- Use 8 px card/control radius, 2 px `:focus-visible` outline with 2 px offset,
  no per-framework animation, and no information carried by color alone. The
  proposed light primary/white contrast is 5.48:1; dark primary/dark foreground
  is 7.95:1. Verify every actual text, focus and disabled-state pairing after
  CSS composition before declaring accessibility acceptance.
- Bundle the same local Inter weights (400/500/600), Noto Sans Hebrew and Arabic
  subsets, and Lucide SVG assets in every output. Use 16 px icons with the same
  viewBox/stroke geometry. Freeze actual file versions, licenses and SHA-256
  hashes when assets are fetched; do not use remote fonts or icon runtime CDN.

### Readiness and measurement trace

- Provide one visible, accessible `role="status"` readiness message: **“Ready”**
  only after app mount, required local assets and the chosen font set settle, and
  both action controls are enabled. The automation harness waits for that status
  and checks the accessible names; it must not rely on a fixed sleep or hidden
  debug endpoint. The message remains visible until an action starts.
- Main launch metric: host process creation to UI Automation observing the ready
  state. Label it **process-cold launch**; close the host gracefully and verify
  its profile-associated WebView2 helpers have exited between runs, retaining a
  per-variant profile. Use the example's 30-second helper-exit deadline as the
  initial correctness limit. If exceeded, mark lifecycle failure and exclude
  that run from successful comparison samples. Forced cleanup of only that run's
  owned processes is recovery, not a successful shutdown. Measure first-use with
  a fresh profile separately. Do not call an OS-cache-warm test a true cold boot.
- Use a randomized variant order and **20 measured launches per variant and
  profile condition**, after three unrecorded warm-up launches. Report median,
  p95, minimum and raw samples. Keep host/runtime/build/OS, display scale and
  power mode fixed. Restart/verify the tree is gone before every process-cold
  run; do not run multiple candidates concurrently.
- After readiness, record a 60-second idle window and sample the complete host +
  WebView2 process tree once per second: private working set, private bytes,
  total working set, process count and CPU. Report per-process and summed values;
  do not add shared working-set pages as if private. Record an idle sample after
  the last paint and before starting the window. Use separate 20-run action traces
  for dialog open/close, operation start, first visible progress update, cancel,
  completion and reset. Report click-to-first-update and operation wall time.
- Preserve each raw run record with app revision, package lock, host hash,
  Evergreen runtime version, profile condition, run order, ready timestamp,
  action timings, per-process samples and asset hashes. Publish no aggregate
  winner from one run or a single Task Manager snapshot.

### Lessons verified in NeutronStar-Example

Reviewed 2026-10-17 against the existing source and its recorded 2026-10-16
validation. This review adds planning requirements; it does not rerun the example
or establish compatibility/performance for the nine new apps.

| Existing evidence | Requirement for the nine-app implementation |
| --- | --- |
| `vite.config.ts` builds local module JS, external CSS and SVG under the synthetic origin | Reuse the production asset boundary and settings above. Run `tsc --noEmit` separately from bundling; raw TypeScript and dev/HMR output are not host assets |
| Normal `dist` and instrumented `dist-test` are separate; only test mode injects the self-test module | Separate correctness fixtures from measured production artifacts in every app. Verify no self-test, diagnostics or diagnostic title signaling enters the performance build |
| `Test.ps1` copies the built fixture into a unique run root with separate assets/profile/report paths | Use immutable app assets and per-run records; isolate profiles by variant and follow first-use versus retained-profile policy. Runtime profile writes still occur even without application persistence |
| `Run.ps1` launches the interactive window with `-WindowStyle Normal`; `Test.ps1` deliberately uses hidden smoke mode | Launch measured UI trials normally and visibly. Hidden startup can override the initial Win32 show behavior; neither `--hidden` nor the test smoke flags belong in foreground rendering/startup trials |
| `main.ts` shows pending state, disables repeated submit, restores controls in `finally`, and writes replies with `textContent` | Define busy/error/cancel/reset behavior centrally, render dynamic text through safe framework bindings, and check focus/status semantics after each transition |
| `native-bridge.ts` has one pending request, bounded input, response correlation, timeout and page-close cleanup | Reuse the lifecycle principles for timer/subscription cleanup and stale-result rejection. Keep native bridge trials separate; do not import the greeting transport into the main UI lane |
| Greeting tests preserve empty/whitespace names, Unicode, quotes and markup-as-text | Preserve shared fixture strings exactly. Include Unicode/bidi and literal-markup tests where text is displayed; do not silently trim, normalize or use HTML insertion |
| About/Back hash navigation retains the same document and its memory | Keep the primary screen router-free. Reuse the small hash fixture only for a separate navigation test; it is not evidence for framework-router mounting, focus restoration or reload behavior |
| Hidden real-WebView tests check CSS, SVG decoding, missing assets, eval/style/network/navigation blocks | Reuse these correctness checks for each frontend, then add every Ark/Zag open/closed/busy state and actual DOM-style checks. Hidden success does not establish paint timing, visible layout, physical keyboard or screen-reader acceptance |
| Example Release/Debug tests record native callbacks/rejections and helper shutdown within the deadline | Keep bounded, synthetic reports and verify graceful lifecycle. Earlier intermittent initialization-close helper failure remains open despite these passes; resolve or explicitly characterize it before reliable comparative results |

The [example README](../NeutronStar-Example/README.md#executed-validation--2026-10-16)
records the historical Release/Debug results: each counted 9 native greetings,
6 rejected requests, 3 blocked resources and 1 blocked navigation. Its pinned
Vite/TypeScript/Node versions are a known example combination, not evidence that
all nine framework/compiler plugins support those versions. Check compatibility
before freezing the new workspace lockfile.

**Do not copy the example wholesale into the vanilla baseline.** It is a greeting
and host-integration demo with opt-in `--test-greet`, custom styling and a hash
About view. The new baseline must implement the same Nano Stores + Tailwind +
Ark/Zag control contract and synthetic operation trace as the other eight apps.
The example has not validated Nano Stores, Tailwind, Ark/Zag, local font loading
or the planned UI Automation readiness signal. Its final smoke PASS title means
test completion; it is not the benchmark's Ready or first-paint timestamp.

### Architecture lessons from Astro/Svelte content apps

- Put deterministic domain code in a framework-free TypeScript package:
  synthetic fixtures, operation transition rules, progress calculation and any
  locale/number formatting. It must not import a UI framework, touch the DOM,
  call WebView2/native APIs or persist data. Each app renders the same output
  from these functions; lifecycle and subscriptions stay in its renderer adapter.
- Keep component-local/transient UI details local to the component or Ark/Zag
  machine. Nano Stores owns only the shared benchmark workflow snapshot. The
  common-store lane is deliberate experimental control; a later, separately
  labeled idiomatic lane can replace it with Svelte runes, React local state,
  Solid signals, etc. Do not mix state owners within one run.
- Astro's static-first/partial-hydration strategy is a useful optional
  experiment, but these candidates are standalone Vite dist apps in one WebView2
  document, not Astro pages with `client:idle` islands. The primary lane loads
  the required UI code normally. If deferred startup/hydration is tested, define
  the same visible static shell, activation trigger and ready signal in all nine
  candidates and report it as a separate lane.
- Do not add `localStorage`, Wake Lock, Web Share or other browser/device APIs to
  the primary test. They change persistence, permissions and platform capability
  rather than framework rendering. If the future product needs them, compare
  them in a separate API-capability test under the real host. The UI-only fixture
  remains in memory and all profiles stay isolated.
- Use one shared Unicode/RTL display fixture and pure formatting helpers for the
  baseline; verify the same visible Hebrew/Arabic/emoji output in all nine.
  Framework-specific accessibility and bidi rendering still require actual
  WebView2 checks.

## Start gate

Begin all nine builds only after the screen/state spec, literal tokens and asset
hashes, shared CSS artifact, store semantics, production/CSP build settings,
smoke-spike outcome and test manifest are written and reviewed. The existing
[frontend checklist](FRONTEND-CHECKLIST.md), [UI design](UI-DESIGN.md),
[state notes](STATE-MANAGEMENT.md), [routing decision](ROUTING.md) and
[benchmark protocol](../../desktop-gui.md#11-prototype-and-validation-plan)
are the detailed source material for this gate.
