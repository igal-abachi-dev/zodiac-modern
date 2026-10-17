# NeutronStar pywebview host

Standard **pywebview 6.2.1**, explicitly forced to its **Edge Chromium/WebView2**
backend on Windows. No `window.native`, C#/CLR controller customization, raw COM,
application JS API, receiver CLI or frontend-specific code. Its backend itself
uses Python.NET, WinForms and Microsoft's managed WebView2 controls; those are
framework dependencies, not an application-written raw host.

## Run and build

Right-click `Run.ps1` → Run with PowerShell. It starts the packaged app at
`dist/neutronstar-pywebview/neutronstar-pywebview.exe`. Keep the entire onedir
folder with `_internal/`, not just the EXE. Installed WebView2 and Windows .NET
Framework/WinForms support are required. The local CLR import check passed on
this machine; the installed WebView2 runtime is not redistributed.

For development only, `Run.ps1 -Source` uses `.venv/Scripts/pythonw.exe`.
Source and packaged launches are different comparison conditions.
`-ProfilePath <directory>` chooses a profile parent. **pywebview deletes its
storage directory in private mode**; we give it only a dedicated child named
`pywebview-owned-storage`, never the caller's parent directory. Do not place
other data inside that app-owned child. Concurrent instances need distinct
profile parents; native cleanup/helper lifecycle still needs acceptance.

Rebuild with `init.cmd` or `Build.ps1 -Restore`. This uses `uv`, a project-local
Python **3.13.15**, and hash-locked dependencies in `requirements.lock`.
The installed Python 3.14 is not used for this framework. Frozen dependencies
include Python.NET **3.2.1**, clr-loader **0.3.1**, PyInstaller **6.22.3** and its
hooks. `Build.ps1` alone uses the existing environment; `-Restore` synchronizes it.
The PyInstaller onedir/windowed build avoids a onefile extraction step. Its
Python/.NET/native libraries must count in later footprint and process studies.

The common verifier stages the same 17 production Svelte files in `frontend/`;
PyInstaller packages them and the manifest under `_internal/`. Startup checks
file sizes/hashes before starting the GUI. No frontend build or npm process runs.

## Transport and policy differences

The public WSGI entry point is a static-only allowlist application served by
pywebview's normal Bottle/threaded loopback server. It has **no backend methods**:
only GET requests for known assets, no directory listings, SPA fallback, dynamic
API or key/file inputs. Responses carry the same strict CSP, explicit MIME,
nosniff, no-store and no-referrer policy. The host header is loopback-restricted.

This is `http://127.0.0.1:<port>/`, with a framework-selected port. It is not the
same origin/transport as the C++/Rust raw hosts. The in-process server threads,
Python, CLR and WebView2 all count. No TLS/security bypass flags are added.
Files remain synthetic; this is not a reviewed launcher for sensitive input.

Other disclosed differences:

- Decorated/resizable light page, requested 960×640 window size, no devtools,
  downloads, file URLs or remote debugging. pywebview's size is an outer-window
  size in the inspected WinForms backend, so client-size parity requires later
  calibration through public options. Do not silently call this 960×640 client.
- Private mode is enabled, but it also clears cookies/removes the profile and
  therefore differs from NeutronStar's retained-directory semantics. Random
  loopback ports change the origin between launches. Retained-profile results
  cannot be silently pooled with the raw host's stable origin.
- Its inspected Edge backend supplies `--disable-features=ElasticOverscroll`.
  There is no public additional-arguments override here; it remains a recorded
  framework default. File URL access is explicitly disabled, preventing its
  optional `--allow-file-access-from-files` argument. No library monkey-patch.
- The public `request_sent` event changes headers, not navigation cancellation.
  Remote navigation/native browser permissions are not guaranteed denied by
  this wrapper. `OPEN_EXTERNAL_LINKS_IN_BROWSER=False` avoids an external opener
  but routes requested new-window URLs into the same view; it is **not** the raw
  host's popup-denial policy. Trusted frontend/CSP does not eliminate that gap.
- pywebview injects its own JS/native message bridge, window/state/DOM helpers
  even without a `js_api` object. Internal scripts and any framework-generated
  styles must be audited separately; the input Svelte assets stay unchanged.

See [validation](VALIDATION.md) and the
[five-host plan](../NeutronStar-Svelte/HOST-COMPARISON-PLAN.md). No comparative
benchmarks yet; this framework-default configuration needs separate labeling
and admission decisions for its policy/profile/size gaps.

References: [public API](https://pywebview.flowrl.com/api/),
[usage](https://pywebview.flowrl.com/guide/usage.html), and inspected installed
6.2.1 sources `webview/http.py`, `platforms/edgechromium.py`, `winforms.py`.
