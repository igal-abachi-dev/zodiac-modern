# NeutronStar Tauri v2 host

Minimal Windows 11 Tauri host for **the existing NeutronStar-Svelte `dist/`**.
It does not have a second frontend project, Vite server or copied Svelte source.
The Release executable embeds the production files when compiled. Rebuilding
Svelte therefore requires rebuilding this executable to pick up new assets.

## Build and run

Requirements: Windows 11 x64, Rust/Cargo targeting `x86_64-pc-windows-msvc`,
Visual Studio C++ Build Tools/Windows SDK, and installed WebView2 Runtime.
The initial implementation uses installed Rust **1.91.1**; the manifest requires
at least 1.91. Rust/Cargo and Node are not needed on the end-user machine.
No WebView2 runtime is bundled or automatically downloaded by this portable app.

First build [NeutronStar-Svelte](../NeutronStar-Svelte/README.md) if its production
manifest is absent or stale. Then:

```powershell
.\Build.ps1
.\Run.ps1
```

Or double-click `init.cmd`, then right-click `Run.ps1` → Run with PowerShell.
Use `Build.ps1 -Offline` after dependencies are cached. This uses Cargo directly,
with Tauri's `custom-protocol` feature explicitly enabled; no global Tauri CLI,
npm package or development server is required. `Build.ps1` runs policy tests and
builds Release using the committed lockfile. It does not launch the UI.

Executable:
`src-tauri/target/x86_64-pc-windows-msvc/release/neutronstar-tauri.exe`.
Interactive profile: `.cache/interactive-profile`; override with
`Run.ps1 -ProfilePath <directory>`. Direct executable launches accept only
`--profile <absolute directory>`; otherwise they use a separate per-user app
directory. Profile-folder control and InPrivate are distinct settings.
Interactive reuse is not the later benchmark profile protocol.

## Deliberate configuration

- Tauri **2.12.4** with its standard default features, tauri-build **2.7.3**,
  locked transitive dependencies; standard Rust LLVM compiler with the Microsoft
  ABI, Microsoft linker/SDK and static CRT. Release uses opt-level 3, thin LTO,
  one codegen unit, abort-on-panic and stripped symbols. This is a declared build
  configuration, not a measured performance advantage.
- One decorated, resizable window, **960×640 DIP client size**, light theme,
  InPrivate, installed Evergreen runtime, normal memory policy. No suspension or
  low-memory override. No application menus/tray/updater/sidecar/Go receiver.
- No application commands, plugins or frontend native calls; no capabilities,
  no global `window.__TAURI__` API. Tauri's own initialization/internal IPC still
  exists. This is not the C++ baseline's native messaging-disabled configuration.
- Production CSP matches the baseline, including `style-src-attr 'none'`, no
  workers, eval or remote content. Automatic Tauri CSP additions are disabled
  specifically to retain the already external-only app policy; the CSP itself
  remains enforced. The bounded Zag metadata exception is unchanged.
- Navigation is restricted to the app entry document and optional hash routes.
  New windows, downloads and browser permission requests are denied. Public
  Tauri APIs disable devtools, zoom hotkeys, general autofill, extensions and
  native drag/drop integration. Other WebView2 settings stay at Tauri/WRY defaults;
  this candidate does not call COM or obtain the raw controller. Tauri's native
  message channel remains part of the framework.
- The build verifies the complete asset set, per-file sizes/SHA-256 and frontend
  lock hash against the Svelte manifest. Extra/missing/changed files or descendant
  symlink/reparse assets fail the build. The standard Tauri embedded/compressed
  asset path is retained; no runtime filesystem server is introduced.
- A response policy restricts GET/MIME/path handling, removes Tauri's SPA
  fallback for absent assets, pins exact CSP/MIME/nosniff/no-store headers and
  removes the default cross-origin response allowance. Hash navigation is enough
  for this screen. No HTTP loopback listener is started.

## WRY browser-switch decision

Inspected source: WRY **0.57.0**, `src/webview2/mod.rs`, `create_environment`.
Its default additional browser arguments are:

```text
--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection
```

WRY's comments identify mini-menu suppression and SmartScreen suppression as the
motivation. Those defaults are not proof of a performance requirement. In
particular, disabling SmartScreen is not a default we want to copy into the C++
host. Context menus can be controlled through documented WebView2 settings.

The matched Tauri host explicitly calls **`.additional_browser_args("")`**.
In this pinned WRY version an explicit value replaces that default string; it
does not append to it. NeutronStar Host remains unchanged. We add no
`--no-sandbox`, remote debugging, GPU-disable or web-security-disable switches.
Environment overrides named `WEBVIEW2_*` are rejected rather than silently
changing the experiment. This does not defeat machine-wide enterprise policy;
later collection still needs actual browser version/options verification.

If useful, WRY's stock arguments can be tested later in a separately labeled
configuration after all four alternative hosts are implemented. Do not silently
mix stock WRY switches with the matched no-additional-arguments cohort. Source:
[WRY 0.57.0 WebView2 implementation](https://docs.rs/crate/wry/0.57.0/source/src/webview2/mod.rs).

## Differences and acceptance limits

Windows origin is **`https://tauri.localhost/`**, translated internally to the
Tauri app protocol, versus the baseline's `https://neutronstar.invalid/`.
This is an in-process custom protocol, not an HTTPS network server or a TLS trust
claim. Tauri can normalize the embedded HTML and injects framework initialization
scripts outside the app's external scripts. The frontend input files are the
same; the complete runtime shell is intentionally different and must be counted.

Build-time checks establish input identity, not proof of identical served HTML
or security behavior. The response hook operates on Tauri app-protocol responses;
it is not an all-network native interception hook. CSP restricts page-initiated
remote subresources and native callbacks restrict navigation/permissions, but
browser servicing/background traffic is not claimed absent.

This is a **standard Tauri application using public Tauri APIs**, not a custom
Rust WebView2 controller host. There is no direct `windows`/`webview2-com`
dependency, `with_webview` callback, unsafe block, manual HWND or COM setting in
the application. Those bindings still appear transitively because WRY uses them
internally. Settings not exposed by the public builder, including default context
menus and some accelerator/autosave/error-page controls, are not forced to match
the C++ host. Their effective values need runtime inspection and disclosure;
complete security/settings parity is not claimed. The separate Rust
`webview2-com` candidate will follow the minimal C++ design for a closer
implementation/language comparison.

See [validation](VALIDATION.md) and the
[five-host plan](../NeutronStar-Svelte/HOST-COMPARISON-PLAN.md).
**No comparative benchmarks until Wails, Rust `webview2-com` and pywebview are
implemented too.** Normal/early-close helper teardown, actual CSP/asset responses,
accessibility/IME/high-contrast/DPI and profile semantics remain admission gates.

## References

The supplied `../tauri-v2-app-template.zip` provided the conventional
`src-tauri/` / Cargo / `build.rs` / configuration structure and its default icon.
The ZIP is preserved. Its opener plugin, greet command, permissive capability,
global API, null CSP and Vite dev server were intentionally not copied.
Research context: [desktop-gui.md](../desktop-gui.md), especially 13.9.
Official references: [configuration](https://v2.tauri.app/reference/config/),
[capabilities](https://v2.tauri.app/security/capabilities/),
[CSP](https://v2.tauri.app/security/csp/), and
[WebviewWindowBuilder](https://docs.rs/tauri/2.12.4/tauri/webview/struct.WebviewWindowBuilder.html).
