# NeutronStar Wails host

Standard **Wails v2.15.0** Windows application loading the selected Svelte
production artifact. No raw COM/controller code, bound Go application objects,
plugins, receiver CLI, menus, updater or frontend-specific changes.

## Run and build

The current build is `build/bin/neutronstar-wails.exe`. Right-click `Run.ps1` →
Run with PowerShell. Optional: `Run.ps1 -ProfilePath <directory>`.
Node and Go are not required to run the built executable. Installed WebView2 is
required; the `wv2runtime.error` build strategy does not install/download it.

To rebuild, run `init.cmd` or `Build.ps1`. Requirements: Go **1.27.1** (the script
finds this repository's pinned toolchain), Python 3.13+ for asset verification,
and authenticated Go dependencies. After restore, `Build.ps1 -Offline` works
from the local cache. It verifies both module graphs, runs tests, compiles a
separately locked official Wails CLI from `tools/go.mod`, and invokes its normal
production packager with `-s -skipbindings -webview2 error`. It places the selected
Go on child PATH so the CLI does not accidentally use the older system Go.
CLI build tooling is not linked into the shipped application.

Only **`frontend/dist/`** is embedded. The common verifier copies and verifies
all 17 files against `NeutronStar-Svelte/.cache/frontend-manifest.json`, including
the frontend lock hash. Wails may generate `frontend/wailsjs/`; those wrappers
are outside the embedded dist and unused. Rebuild the executable after changing
the Svelte production artifact. No Vite/Node process or loopback listener runs.

## Controlled configuration and differences

- Decorated/resizable window, requested 960×640 dimensions, light native theme,
  zoom 1, no GPU-disable/code-integrity-disable flags, no low-memory/suspension
  override. Actual client size/DPI still needs admission measurement.
- Standard Wails embedded asset transport at `http://wails.localhost/`, unlike
  NeutronStar's HTTPS synthetic origin. The middleware enforces the same CSP,
  external CSS/scripts, allowed asset MIME types, no-store/nosniff and 32 MiB
  limit; unsupported methods/types are 403 and missing files 404. The unchanged
  bounded Zag dialog style exception still applies.
- Wails injects its own `/wails/runtime.js` and `/wails/ipc.js` and processes the
  entry HTML. These routes bypass the application asset middleware. They count
  as framework overhead even though no Go objects are bound. Internal runtime
  APIs remain part of Wails; an empty Bind is not a disabled native channel.
- **InPrivate parity is unavailable through v2's public Windows options.** A
  separate profile folder is configured, but Wails uses its normal persistent
  profile. It must be a separately labeled configuration in later comparisons.
- The inspected Wails Windows backend calls `SetGlobalPermission(...Allow)`.
  There is no public per-request deny callback in these options. CSP and trusted
  assets do not replace the raw host's native permission denial. This is a
  security/admission gap, not a claim of equivalent lockdown. Navigation,
  downloads and permission behavior need explicit native tests before selection.
- `EnableFraudulentWebsiteDetection: true` avoids Wails' default
  `--disable-features=msSmartScreenProtection`. GPU and renderer integrity stay
  enabled. This is an explicit public application option, not a library patch.
- The standard Go WebView2 loader initializes/resets several `WEBVIEW2_*`
  environment variables before main. Rejecting every such variable inside main
  would reject normal Wails startup. The launcher checks inherited overrides
  instead; external tests control the child environment. Do not replace the
  framework loader with custom COM code to hide this difference.

Local build/native receipts live in `.cache/`. See [validation](VALIDATION.md)
and the [five-host plan](../NeutronStar-Svelte/HOST-COMPARISON-PLAN.md).
No comparative benchmarks have been run for this candidate.

Sources: [Wails options](https://wails.io/docs/reference/options/), pinned source
`pkg/options/windows/windows.go`, `pkg/assetserver/assetserver.go` and
`internal/frontend/desktop/windows/frontend.go` from v2.15.0; pinned
`go-webview2` v1.0.22 `webviewloader/env_create.go`.
