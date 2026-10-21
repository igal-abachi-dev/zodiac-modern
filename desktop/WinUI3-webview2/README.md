# WinUI 3 / C# WebView2 host

Sixth host candidate for the frozen NeutronStar Svelte screen. This is a normal
C#/XAML Windows App SDK application containing the **built-in WinUI WebView2
control**. It is separate from the raw Rust `webview2-com` and C++ HWND/controller
hosts. The UI remains Svelte, Ark/Zag, Nano Stores and the shared external CSS.
There is no Go CLI, encryption, native command bridge or frontend rewrite here.

## Build and run

Prerequisites: Windows 11 x64, installed Evergreen WebView2 Runtime, .NET SDK
**10.0.402**, and Python 3.12+ for the shared asset verifier (the sibling pywebview
venv is used when available). NuGet access is required on the first build.
The Windows SDK build tools restore from NuGet; Visual Studio's Windows app
development workload is useful for editing/debugging but not used by these scripts.
The frozen `../NeutronStar-Svelte/dist` and `.cache/frontend-manifest.json` must
already exist. Node/pnpm are needed only to rebuild that separate baseline.

Run `init.cmd`, or `./Build.ps1`. Then right-click `Run.ps1` → **Run with
PowerShell**, or run `./Run.ps1` from this directory. An execution policy that
permits local PowerShell scripts is required; scripts do not change machine policy.
The executable is `out/win-x64/neutronstar-winui-webview2.exe`.

`Build.ps1 -Offline` skips restore and requires the previously restored locked
cache and assets. Normal builds use `--locked-mode`; committed package locks pin
transitive dependencies and NuGet content hashes. No frontend package installation
or per-host frontend rebuild occurs. The script verifies/stages all 16 baseline
assets, runs policy tests, publishes, rechecks asset hashes and writes
`.cache/build-receipt.json` with hashes of the complete deployment folder.

`Run.ps1 -ProfilePath D:\NeutronStar\profiles\winui-test` selects a local profile
directory outside the assets. InPrivate mode is requested; the profile directory
can still contain runtime metadata. Do not store secrets in this benchmark.
`WEBVIEW2_*` overrides are rejected, rather than silently changing the runtime.
The script launches the requested interactive window normally.

## Frozen native configuration

| Item | Choice |
| --- | --- |
| Language / build | C#, strict nullable checking, warnings as errors, SDK MSBuild |
| Target | .NET 10, Windows SDK 26100, Windows 11 minimum build 22000, x64 |
| Windows App SDK | 2.5.1 (WinUI transitive package 2.3.9) |
| WebView2 SDK | 1.0.4258.31, WinRT projection |
| SDK build tools | 10.0.28000.2705 |
| Deployment | Unpackaged folder, self-contained .NET + Windows App SDK; untrimmed, no Native AOT, no ReadyToRun |
| Window | Standard system decorations, 960×640 DIP initial client area, per-monitor DPI awareness |
| Browser | Installed runtime, hardware rendering/default memory behavior, no custom performance switches |
| Web origin | `https://neutronstar.invalid/`, intercepted resources, no localhost server |
| Profile | Explicit separate user-data folder, named InPrivate profile, extensions disabled |

The generated STA entry point and dispatcher remain WinUI-owned. Browser creation
waits for the control to be loaded. Public CoreWebView2 APIs enforce the content
policy. Settings disable developer tools, messages/host objects, context menus,
default script dialogs, browser accelerators, zoom/pinch controls, autofill and
password saving. External navigation, frame navigation, popups, downloads,
external URI schemes and requested permissions are denied. No custom COM window
or alternate WebView2 backend is substituted.

Only GET requests for manifest-listed, allow-listed local MIME types are served.
There is no history-route fallback: use hash routing. CSP is unchanged from the
baseline, including `style-src-attr 'none'` and `worker-src 'none'`. The existing
bounded Zag dialog metadata exception in the frontend audit is unchanged.

Assets are verified against the staged manifest and snapshotted in managed
memory before window initialization. Request bodies use the WinRT random-access
stream adapter. This snapshot/hash cost is part of this candidate's startup and
memory footprint. Path/reparse checks are performed before opening files; this
is **not** the raw C++ host's atomic final-handle confinement. Hash verification
does not authenticate an app folder against an attacker who can replace both
assets and manifest. No production security/audit claim is made.

## Delivery and comparison limits

Keep the whole published folder, including generated app `.pri`/`.xbf` files.
The project explicitly copies those resources during publish; omitting them
caused a XAML startup failure in the initial validation attempt.
The Windows App SDK umbrella package brings additional runtime components; the
output has not been manually pruned. Count them, the managed/native runtime DLLs,
and all WebView2 children when measuring. Installed WebView2 remains a prerequisite;
this host never downloads a runtime. Deployment on a clean Windows machine,
including any Visual C++ runtime prerequisite, remains a validation gate.

The later comparison measures the whole hosting stack, not C# versus Rust/C++
alone. WinUI control composition, framework defaults, profile behavior and delivery
cost must be recorded. See [validation](VALIDATION.md) and the
[six-host plan](../NeutronStar-Svelte/HOST-COMPARISON-PLAN.md).

References: [WinUI WebView2](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/webview2),
[WinRT environment API](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/winrt/microsoft_web_webview2_core/corewebview2environment?view=webview2-winrt-1.0.4258.31),
[self-contained deployment](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/self-contained-deploy/deploy-self-contained-apps).
