# NeutronStar Tauri v2 + Svelte 5 application

**Canonical UI/behavior reference for the later desktop GUI comparison**, selected
by the user on 2026-10-24. Use this project as the WebView2 representative;
Electron, Avalonia/Skia and every other candidate independently implement its
screens/workflow using their own source, assets/build and appropriate controls.
No imported Tauri frontend, shared UI runtime or shared `dist` is planned for
those candidates. Benchmark artifact freeze follows
the short parity/configuration check described below. The old `Tauri-v2-Test`
remains a historical control.

This is a standalone application project: local `src/App.svelte`, TypeScript
domain/state/design helpers under `src/lib/`, generated local fonts/icons/CSS,
Vite build and `src-tauri/` native application. It does not read or import sibling
projects' frontend files at runtime or build time. Initial source provenance is
`NeutronStar-Svelte` plus the native policy/reference in `Tauri-v2-Test`.

The root `tauri-v2-app-template.zip` supplies the standard project/hook pattern,
not its opener plugin, unrestricted global API or disabled CSP. See
[Tauri's Vite integration](https://v2.tauri.app/start/frontend/vite/).

## Decisions and boundaries

- Tauri v2 + Svelte 5 remains our WebView2 representative for the later desktop
  toolkit comparison. This implementation does not reopen that selection.
- Keep the explicit Rust window builder: it attaches creation-time navigation,
  permission, popup and download policies. `tauri.conf.json` owns build hooks,
  paths, CSP and distribution settings; `windows: []` avoids a second window.
  Declarative configuration is also standard Tauri, but is not inherently faster.
- Production compiles Svelte/TypeScript and embeds the complete local `dist/`.
  `WebviewUrl::App("index.html")` refers to that built entry page. The original
  test host already embeds compiled Svelte assets too; this project changes
  source ownership and build workflow, not the underlying browser architecture.
- Preserve the current Svelte 5 / Ark / Nano Stores workflow, copied locally,
  for the planned short comparison. No Go CLI, encryption or new native command
  channel has been added. No dependency on the old workspace packages remains.
- Release retains the reference's restrictive CSP and public Tauri APIs only.
  Debug development permits only the fixed loopback Vite origin and WebSocket;
  development-only inline styles allow HMR. Dev is not production CSP evidence.
- Do not add plugins/capabilities merely because this is an application layout.
  Their permissions and any future CLI integration require separate design/tests.

## Toolchain and workflow

Use Node 24.21.x, pnpm 12.8.1, Rust 1.91.1 targeting the Microsoft ABI, Windows
SDK/Visual Studio C++ Build Tools and installed WebView2 Runtime. Pinned versions
and lockfiles belong to this project. Node/pnpm/Rust are build dependencies, not
requirements for running the Release executable. This portable test does not
download a runtime or install/sign/update the application automatically.

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm desktop:dev
# Or build production assets and the native executable through Tauri's hooks:
pnpm desktop:build
```

`desktop:dev` starts Vite at `http://127.0.0.1:1420` with HMR and uses the debug
application. `desktop:build` invokes `beforeBuildCommand`, runs the frontend
checks/build/audit, embeds `../dist`, then builds the Windows x64 Release app.
Rebuild the executable after changing frontend assets. No external production
web server, shared-dist argument or Node process is used by the Release app.

Svelte module edits use Vite HMR. This controlled design pipeline generates
`public/design.css`, fonts and icons with `pnpm build:design`; run that again
after changing design tokens/styles or utility candidates. Vite can then reload
the generated assets without rebuilding Rust. Production always regenerates and
audits them through the build hook.

`Build.ps1` additionally runs frontend and native policy tests; `-Offline` disables
Cargo networking after dependencies are cached. `Run.ps1` launches only the built
Release executable with a separate profile. The executable is
`src-tauri/target/x86_64-pc-windows-msvc/release/neutronstar-tauri-svelte5.exe`.

## Planned short comparison

Compare this app with the unchanged `Tauri-v2-Test`, not with the newly modified
C++ baseline. First freeze native/frontend locks, assets and executable hashes;
verify equivalent UI, CSP and native settings. Disclose generated-byte/transitive
dependency differences before attributing results to project layout. Use Release,
the same installed runtime and client geometry, direct launches and fresh/retained
profiles; never use HMR/dev servers as the production comparison. Collect paired
Ready/transition/process-tree observations, checking helper exit and preserving
failures. No short-comparison results are claimed by this scaffold.

See [the complete reference inventory](FEATURE-PARITY.md),
[current validation](VALIDATION.md), [the stack decision](../WEBVIEW2-STACK-DECISION.md) and the original
[six-host results](../host-test-support/results/2026-10-24/RESULTS.md). Validation
of this new project is tracked separately in `VALIDATION.md`.

## Rust build time

Cargo caches compiled dependencies and supports incremental development builds.
Use `Dev.ps1`/`pnpm desktop:dev` for ordinary UI work: frontend HMR normally avoids
a native rebuild. Preserve the target directory and keep toolchain, target and
features stable instead of running `cargo clean` routinely.

A new target directory compiles Tauri, WRY/TAO, Windows bindings and their Rust
dependencies. The first observed standalone Release build took about 2m50s and
the first Debug build about 1m01s; these are logs, not repeated build benchmarks.
They are not comparable to compiling a few C++ source files against a prebuilt
WebView2 loader. Our optimized Release profile uses thin LTO and one codegen unit;
changed embedded frontend assets may require a native rebuild/relink even when
Rust application source is unchanged. Release dependency caching does not mean
rustc incremental compilation is enabled for Release (it is disabled by default).
Keep production optimizations for the benchmark. A faster experimental build
profile or compiler cache would be a separate DX experiment if later justified.
See [Cargo profiles](https://doc.rust-lang.org/cargo/reference/profiles.html).
