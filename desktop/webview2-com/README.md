# NeutronStar raw Rust WebView2 host

Minimal **Win32 + `webview2-com`** implementation following the decorated,
normal-memory, bridge-disabled benchmark path of
[`NeutronStar-Host`](../webview2-raw-bench/NeutronStar-Host/README.md).
No Tauri, WRY, TAO, Go, Python, Node, managed runtime or embedded web server.
`windows` supplies Win32 bindings/RAII COM interfaces; `webview2-com` supplies the
official WebView2 API bindings, loader, options and callback helpers.

## Run and build

Right-click `Run.ps1` → Run with PowerShell. It loads the existing
`../NeutronStar-Svelte/dist/` directly. Override `-AssetsPath` / `-ProfilePath`
for explicit test trees. Installed WebView2 Runtime is required; there is no
runtime installer, bootstrap download or automatic fallback.

Build via `init.cmd` or `Build.ps1 -Offline` after dependencies are cached.
Requires Rust/Cargo (built here with **1.91.1**), MSVC/Windows SDK tools, and Python
3.13+ for baseline verification. Versions: `webview2-com` **0.39.1**, `windows`
**0.62.2**, committed Cargo.lock. Standard Rust LLVM → Microsoft x64 ABI/linker,
static CRT, opt-level 3, thin LTO, one codegen unit, stripped Release symbols.
Executable: `target/x86_64-pc-windows-msvc/release/neutronstar-rust-host.exe`.

The library exposes `HostWindow`, `HostOptions`, `create`, `run`, `close`; the
runner owns process-wide PerMonitorV2 DPI policy. The owner contains `Rc` and is
therefore not Send/Sync. It owns STA initialization, the HWND, async browser
initialization and deterministic close. COM initialization drops after the state
and COM objects. OS handles use File RAII; interfaces use binding Clone/Drop;
callback payload strings use `CoTaskMemPWSTR`.

## Matched baseline behavior

- Same **`https://neutronstar.invalid/`** synthetic origin, no listener; strict
  canonical prefix, percent/UTF-8 decoding, reserved-device/unsafe-segment checks,
  MIME allowlist, GET-only, no SPA fallback and 32 MiB/file bound.
- On-demand asset reads like C++: root directory handle, reparse-component
  rejection, file handle final-path confinement, disk-file/size checks and exact
  reads. Assets/profile must be separate local directory trees; containment is
  checked before creating a profile directory.
- Same CSP/MIME/nosniff/no-store/referrer response headers. Intercepts all resource
  contexts, blocks external/unsupported requests, remote/frame navigation,
  external URI launching, popups, permissions and downloads.
- Same normal benchmark browser settings: scripting on, host objects and native
  messaging off; devtools/context menus/script dialogs/status bar/accelerators/
  password saving/general autofill/external drag-drop disabled. Extensions off,
  no additional browser switches; no memory/suspension/GPU override.
- Profile name `NeutronStar`, InPrivate, installed Evergreen or explicitly supplied
  Fixed Version directory. `WEBVIEW2_*` overrides are rejected.
- Decorated/resizable window; 960×640 DIP client size; 720×480 minimum; DPI-aware
  frame adjustment, bounds updates, focus, move notification, minimized visibility
  and DPI-change handling. Native loading/error text precedes the browser surface.
- Async completions use weak state; a late controller is closed if its owner
  disappeared. Event tokens are removed in reverse order, controller closed,
  interfaces released before COM uninitialization. No strong callback cycle.

## Scope: similar benchmark host, not every optional C++ API

This ports the path actually exercised by the Svelte host comparison. It is
**not** a drop-in/full feature replica of the C++ library. Optional C++ custom
titlebar/window-token controls, low-memory switching, two-action native bridge
and test-greet RPC are not implemented here. They are disabled in the comparison
baseline anyway. Do not compare those optional modes until separately ported
and validated. No claim that Rust alone determines any resulting difference:
bindings, file/string allocations, build options and lifecycle must also match.

Supported runner flags:

```text
--assets <absolute directory> --profile <absolute separate directory>
[--runtime <absolute Fixed Version directory>] [--entry <relative HTML>]
[--report <numeric JSONL path>] [--timeout-ms 100..120000]
[--smoke-test] [--hidden]
[--close-before-ready | --close-at-environment | --close-at-controller]
```

`--smoke-test` uses the existing synthetic title-based correctness fixture, not
production script injection. The numeric log records event IDs/HRESULT/runtime,
not document titles/URLs or input values. Internal elapsed times are diagnostic,
not comparative timing results. Reports and build receipts live in `.cache/`.
See [validation](VALIDATION.md) and the
[five-host plan](../NeutronStar-Svelte/HOST-COMPARISON-PLAN.md).

The Windows build enables `-C control-flow-guard=yes` as well as static CRT.
The Release PE was checked for CFG, ASLR and DEP; see the
[native hardening audit](../host-test-support/HARDENING.md). CET compatibility
and sanitizer/unsafe-code review are separate, still-open validation items.
