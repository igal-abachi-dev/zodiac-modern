# NeutronStar: nine frontend tests

Nine independently rendered, production-built interfaces for the same Windows
WebView2 host: **vanilla TypeScript, Svelte 5, React, Vue, Solid, Lit, Preact,
Alpine CSP and htmx**. The folder keeps the original `8-framework-test` name;
vanilla is the ninth baseline. This is a synthetic research suite, not a Go CLI
wrapper or an encryption application. See [VALIDATION.md](VALIDATION.md) for
executed checks and remaining limits.

## Build and run

Prerequisites: Node **24.21.x**, pnpm **12.8.1**, installed WebView2 Runtime,
and the compiled NeutronStar Host. The PowerShell workspace wrapper uses the
repository's existing pinned Node/pnpm tools when available; otherwise put the
specified tools on PATH. Global Node 25 is not this workspace's tested baseline.
It never downloads a Node toolchain or changes execution policy.

From this folder:

```powershell
.\scripts\Workspace.ps1 -Task install
.\scripts\Workspace.ps1 -Task typecheck
.\scripts\Workspace.ps1 -Task build
.\Run.ps1 -App svelte
```

Alternatively, `init.cmd` performs the first three steps. With the specified
Node/pnpm on PATH, the equivalent commands are `pnpm install --frozen-lockfile
--ignore-scripts`, `pnpm typecheck`, and `pnpm build`.

Choose any app using `Run.ps1 -App vanilla|svelte|react|vue|solid|lit|preact|alpine|htmx`.
Each `apps/<name>/Run.ps1` is also an Explorer entry point: right-click **Run with
PowerShell** after building. The root `Run.ps1` defaults to vanilla. These launch
visible windows. Close each window before comparative trials; no other app is
stopped. Native builds remain separate:

```powershell
..\NeutronStar-Host\scripts\Build.ps1 -Configuration Release
```

The default runner is
`../NeutronStar-Host/out/clang-cl-ninja-x64/Release/neutronstar_host_runner.exe`.
`-Configuration Debug` and explicit `-RunnerPath` overrides are available.
No compiler, Node, pnpm or frontend development server runs inside the shipped
WebView2 document. Runtime profiles live separately under `.cache/interactive/`.

## Selected stack

```text
CMake → Ninja Multi-Config → clang-cl (C++20) → Microsoft link.exe
                         Microsoft ABI / STL / static CRT / Windows SDK
                         WebView2 SDK + WIL via pinned NuGet

Installed WebView2 Runtime
  └─ one app's Vite-built local HTML / JS / CSS / fonts / SVGs
       ├─ independent framework renderer and control adapter
       ├─ Nano Stores → common immutable workflow + pure TS transitions
       └─ identical Tailwind v4 stylesheet and local assets
```

| Layer | Frozen implementation |
| --- | --- |
| Workspace | pnpm 12.8.1; one lockfile; exact direct versions; no website dependency changes |
| Build | Vite 8.3.4, strict TypeScript 6.0.3, `base: './'`, output target `chrome120`, no inline assets or source maps |
| State | Nano Stores 1.5.5; one document-local immutable snapshot; no persistence/devtools |
| Controls | Ark React/Vue/Solid/Svelte public hooks and prop APIs; Zag 1.45.0 adapters elsewhere |
| Styling | Tailwind 4.3.3 compiled once; ordinary CSS variables and shared recipes; no second styling engine |
| Appearance | Nova-inspired spacing, Neutral/Emerald, deterministic light baseline; dark tokens for QA |
| Assets | Local Inter 400/500/600, Noto Hebrew/Arabic 400, Lucide SVGs; Windows Segoe UI Emoji fallback |
| Host | Same executable/runtime/policy: decorated window, normal memory target, bridge off |
| Routing/storage | Router-free, memory only; reload starts Ready; no Web Storage or history snapshots |

The real manifests in `.cache/manifests/` record exact packages, lock/source/asset
hashes, host hash and byte counts. Regenerate with `pnpm manifest`. The compiler
and package choices do not establish greater safety or a performance winner.

## Workspace and renderer ownership

- `packages/bench-domain`: exact synthetic fixture, status copy, pure transitions
  and elapsed-time progress calculation. No DOM, framework, native API or storage.
- `packages/bench-contract`: Nano Stores atom and a generation-guarded 2-second,
  10 Hz simulation. Cancel, reset, failure and disposal stop owned timers.
- `packages/design`: tokens, shared stylesheet, prop-style filtering, bounded
  dialog-style policy, readiness/font helpers. `generated/` is build output.
- `packages/test-support`: correctness-only assertions, imported by test builds.
- `apps/*`: each renderer owns its DOM and lifecycle; no React embedded in other
  apps and no shared imperative renderer hiding framework costs.

Svelte uses the Nano Stores-compatible Svelte store contract directly through
`$snapshot`; it does not require `@nanostores/svelte`. React, Vue, Solid and Preact
use their Nano Stores adapters. Lit uses light DOM and its normal update cycle;
Alpine uses the separate `@alpinejs/csp` distribution and external methods, without
`x-show`, inline scripts or expression evaluation. htmx fetches its initial trusted
static screen fragment, then a small controller binds the common state and Zag
controls. Its extra GET and controller are part of its measured integration cost.
htmx eval/scripts/indicator injection/history are disabled before processing.

Ark's public hooks supply the machine and framework prop mapping; app-owned
markup preserves IDs, ARIA and interaction props. This permits external-CSS
composition without runtime width styles. The other five use Zag's pinned public
adapters, not copied internals from Ark/Radix/Base UI. Application state and
dialog-control state have separate owners.

## CSP and the approved dialog-style exception

The native host and its CSP are unchanged. Production HTML has no inline scripts,
handlers or styles. Progress dimensions use a finite external CSS codebook.
Focus trapping, Escape, outside dismissal and focus return remain Ark/Zag-driven.
Every renderer composes the same `inert` background with a full-screen external-CSS
dialog layer and `aria-modal="true"`. The machine uses `modal:false`,
`preventScroll:false`, `trapFocus:true`; native `inert` and the overlay provide
background interaction isolation without body-style scroll locking.

Actual compatibility checks found that Zag's layer manager still writes styles.
The user explicitly approved this narrowly bounded exception, identically in all
nine apps, **only on `#about-content[data-scope="dialog"][data-part="content"]`**:

```css
--layer-index: 0;
--nested-layer-count: 0;
pointer-events: auto;
```

No body styles, other values, `!important`, geometry, colors, `--z-index`, injected
stylesheets or generic CSS are permitted. The validator inspects observed prior
and current attribute values as well as the final DOM. This is not a CSP header
relaxation: these are library CSSOM writes that the browser permits under the
existing CSP. The old absolute no-style-attribute rule is superseded only by this
explicit exception. No monkeypatch, global CSSOM interception or library fork is
used to hide mutations. The dialog scope remains one non-nested modal; extending
it requires revisiting both behavior and policy.

## Correctness checks

```powershell
.\scripts\Workspace.ps1 -Task test
.\scripts\Workspace.ps1 -Task build:test
.\scripts\Test-Frontends.ps1
.\scripts\Workspace.ps1 -Task test:browser
```

The real-host suite uses isolated profiles, the unchanged host smoke contract,
and `dist-test` builds. It checks actual UI states, exact Unicode, dialog focus,
progress, busy/cancel/reset/error behavior, allowed styles, healthy-state CSP,
local assets, no app Web Storage, denied resources/navigation and helper exit.
It launches visible windows because the dialog focus assertions require a
visible WebView. The window closes automatically after each case. Its deliberate
denial probes and correctness instrumentation exclude these runs from startup,
rendering or resource benchmarks. Hidden exploratory runs timed out on focus;
they are retained as failed diagnostics rather than accepted frontend results.

Playwright uses **installed Edge**, a loopback static test server with matching
CSP, and production `dist` to check real keyboard Tab/Shift+Tab/Escape, focus
return, actions, responsive stacking, dark tokens, forced-colors/reduced-motion
smokes, reload and page-request locality. This supplements the real WebView2
suite; it does not replace Windows Narrator/NVDA, physical DPI/multi-monitor or
process-aware network/storage testing. Screenshots use synthetic data only.

## What this comparison means

This measures **renderer + adapter/control integration over shared workflow and
assets**. Shared source, timer targets, machine versions and stylesheet bytes
reduce uncontrolled differences. They do not guarantee identical CPU cycles,
notifications, layout/paint work or timing. Ark wrappers, adapters, framework
scheduling, initialization and DOM updates still differ. Native Svelte runes or
Zustand in a separate idiomatic lane would answer a different question, rather
than being inherently unfair approaches for real products.

Node and TypeScript are build-time tools. Their versions do not guarantee
optimized or flawless browser behavior, and local fonts remove network asset
fetches without eliminating decode/shaping/cache variance. Use the explicit
browser target and actual runtime tests. Report raw JS/CSS/font bytes from these
builds; approximate upstream library sizes are not measurements here.

No full comparative performance trial or framework ranking is claimed. Follow
[BENCHMARKING.md](BENCHMARKING.md) before collecting results. The host's previously
observed intermittent early-initialization helper-shutdown issue remains open.
See [third-party notices](THIRD-PARTY-NOTICES.md), [license texts](licenses/dependencies.json),
and the [host implementation plan](../NeutronStar-Host/FRONTEND-IMPLEMENTATION-PLAN.md).

The [source and artifact comparison](CODE-COMPARISON.md) compares all nine with
vanilla and React, and reviews the supplied external benchmark methods. All nine
now pass current native/browser checks with **htmx 2.0.11 + the explicit offline
no-storage patch**. Its original upstream failure is retained in
[VALIDATION.md](VALIDATION.md); see [patch maintenance](patches/README.md).
No performance runs are included.

## Supplemental renderer workloads

Run `pnpm build:workloads`, then `pnpm test:workloads` for correctness. These
commands also work through `scripts/Workspace.ps1 -Task build:workloads` and
`-Task test:workloads`. Each `apps/<app>/dist-workload` adds a labeled panel with
1,000/10,000 keyed rows, reverse/splice/partial updates, filtering, bounded update
bursts and fresh-store remounts. Each framework owns its view; htmx retains an
explicit vanilla-like client controller. The shared driver is test-only.

For manual use pass that directory to the runner's `--assets` and use an isolated
profile. The ordinary `Run.ps1` still launches production `dist`, which contains
no workload driver. Browser checks cover sequential typing, multilingual filters,
timer cleanup and repeated original Ark/Zag control actions. All nine supplemental
workloads now pass native-host correctness too, using `pnpm build:workload-tests`
and `scripts/Test-Frontends.ps1 -Lane workload`. External startup/process-tree
and semantic workload measurements are now published below. Physical presentation,
heap-trend studies and long soaks remain pending.

Opt-in browser observers are available in separate diagnostic builds; see
[DIAGNOSTICS.md](DIAGNOSTICS.md) for commands, bounded/redacted data, correctness
checks and native export limits. They add no code to production `dist` and do not
compute official INP, Lighthouse TBT or a framework score. See the
[measurement protocol](BENCHMARKING.md).

The [agreed next-step sequence](BENCHMARKING.md#agreed-next-steps--2026-10-17) is:
external measurement harness, environment freeze, a vanilla/Svelte/React pilot,
randomized measurements of all nine, then evidence-based analysis. App and
collector correctness passes do not complete the external harness. The full
performance cohort was gated on the harness and pilot. The user has now
authorized it: the [external Windows harness](measurement/README.md) passed its
18-attempt pilot and completed 900 primary attempts. The separate supplemental
cohort completed 210 attempts. All accepted attempts passed; rejected earlier
collector versions remain separate. Read the [key measured tables](results/2026-10-17/RESULTS.md)
and [interpretation](results/2026-10-17/INTERPRETATION.md). Physical AT/IME/DPI,
GPU/energy and extended-lifetime acceptance remain open.
