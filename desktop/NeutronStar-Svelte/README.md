# NeutronStar Svelte baseline

Svelte 5 is the selected frontend for the next desktop-host research phase.
This standalone project is the common frontend for NeutronStar Host, Tauri v2,
Wails, Rust `webview2-com` and pywebview. No winning native host is selected yet.
The screen is a synthetic UI simulation: no Go CLI, cryptography or file access.

Current fixture: **English, Hebrew and emoji**, with four local fonts and
16 production assets. See [fixture revision and historical-result boundaries](FIXTURE-REVISION.md).
The 2026-10-18 identity checks below describe the older fixture.

## Run

Build prerequisites: Node **24.21.x** and **pnpm 12.8.1** on PATH. The native
baseline additionally needs Windows 11, an installed WebView2 Runtime, and the
existing clang-cl/Ninja Release NeutronStar host. Node and pnpm are build tools;
they are not required by the built native app.

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
.\Run.ps1
```

Alternatively, run `init.cmd` to install/build, then right-click `Run.ps1` and
choose Run with PowerShell. The script resolves paths relative to itself.
It uses the host at
`../webview2-raw-bench/NeutronStar-Host/out/clang-cl-ninja-x64/Release/neutronstar_host_runner.exe`.
Supply `-RunnerPath` or `-ProfilePath` to override. Its reusable interactive
profile is for convenience; benchmark runs require separately controlled profiles.
The host does not download a missing runtime.

### Open the built frontend in a browser

Chrome, Vivaldi, Brave and Edge can run this frontend without a native host.
Right-click `Run-Browser.ps1` and choose **Run with PowerShell**, or run
`.\Run-Browser.ps1`. Keep its window open and visit http://127.0.0.1:4188/;
Ctrl+C stops the server. It prefers the repository's pinned Node 24.21.0 and
otherwise checks Node on PATH; `-NodePath` selects an explicit executable.
From this directory, run:

```powershell
node scripts/serve.mjs
```

First install the separately pinned preview tooling if `init.cmd` has not done so:
`pnpm --dir scripts/preview install --ignore-workspace --frozen-lockfile --ignore-scripts`.

Open **http://127.0.0.1:4188/**. Stop the server with Ctrl+C. It serves the
existing `dist/` with the strict CSP; rebuilding is necessary only after source
changes. Double-clicking `dist/index.html` is not supported: its external ES
modules are subject to browser `file://` origin/CORS restrictions. Do not disable
browser security flags to work around that.

This checks browser UI behavior, not native host integration, window lifecycle,
native request blocking or host process-tree costs. Full-browser and desktop-host
measurements must remain separate. `pnpm dev` supports development/HMR, while
this server is for checking the built production assets under the CSP.
It uses Fastify + `@fastify/static`; see [browser preview choices and the Nginx
distinction](BROWSER-PREVIEW.md). The same frontend assets are used in the browser
and desktop hosts; native chrome and host behavior remain separate.

## State and code ownership

Keep **Nano Stores 1.5.5** for the benchmark workflow and supplemental workload
state. Svelte consumes its native-compatible store contract without a second
state owner. Ark's Svelte hooks handle control behavior. Use runes for new
component-local state where useful; do not mirror the workflow into `$state`.
No Zustand dependency is needed.

For a Svelte-only product, shared `.svelte.ts` runes are a reasonable alternative:
[Svelte documents shared rune-based state](https://svelte.dev/docs/svelte/stores#When-to-use-stores).
That does not establish a speed advantage over this existing store. A runes-only
variant must be separately tested for subscriptions, cancellation, late callbacks,
disposal and readiness, then rebaselined across every host. It must not be mixed
into the host comparison as a per-host optimization.

The four `packages/` directories are private parts of this project, retained for
clear domain, workflow, design and test boundaries. They no longer depend on the
nine-app workspace. All host candidates should consume one built asset tree or
verified identical copies. Sharing a Svelte frontend across native hosts does
not require framework-agnostic UI state. Merging these directories offers no
inherent runtime saving; Vite already bundles and tree-shakes their imports.

## Build and check

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm test:browser
pnpm build:test
pnpm build:workloads
pnpm build:workload-tests
pnpm build:diagnostics
```

Production is `dist/`; test/workload/diagnostic output is separate. Only the
production asset audit writes `.cache/frontend-manifest.json`. The browser test
starts a temporary loopback correctness server under the host-equivalent CSP;
it is not the native asset delivery mechanism or a performance measurement.
Vite dev/preview alone does not demonstrate production CSP compatibility.

On 2026-10-18 all 17 rebuilt production files matched the original Svelte
benchmark output byte-for-byte. See [validation](VALIDATION.md) and the
[five-host comparison plan](HOST-COMPARISON-PLAN.md). Previously copied generated
folders are not acceptance evidence until rebuilt using their corresponding
command. The original nine-app experiment remains unchanged.
