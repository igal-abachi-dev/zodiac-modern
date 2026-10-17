# Shared host correctness tooling

These tools support the five-host Svelte experiment. They do not collect
comparative benchmarks and are not shipped in a desktop application's assets.

- `verify_assets.py`: verifies the baseline lock/manifest and exact built file
  set, sizes and SHA-256; optionally stages identical files for embedded hosts.
  It never rebuilds the frontend. All candidates currently consume 17 files.
- `NativeSmoke.csproj` / `Program.cs`: .NET 10 Windows UIA correctness launcher.
  Uses visible task-owned windows and real pointer input; no screenshots or
  performance sampling. Accepts an executable, absolute profile directory,
  JSON report and optional extra application arguments.
- `inspect_pe.py`: read-only development PE metadata inspector, requiring
  `pefile` (available in the pywebview packaging environment). See
  [hardening findings](HARDENING.md).

Example from `desktop/`, after building the checker with the installed .NET SDK:

```powershell
dotnet build host-test-support/NativeSmoke.csproj -o host-test-support/.cache/bin
dotnet host-test-support/.cache/bin/NativeSmoke.dll `
  Wails/build/bin/neutronstar-wails.exe `
  Wails/.cache/correctness-profile Wails/.cache/correctness.json
```

The checker waits for the actual document containing visible Ready, avoiding a
stale `about:blank` document during framework startup. It tests About/open/close,
encryption simulation/completion, Reset, decryption/Cancel and Reset, then sends
WM_CLOSE to that application. It strips browser override variables in the child
environment only. It does not terminate unrelated browser processes.

Its successful root-process exit is **not** complete WebView2 helper lifecycle,
keyboard/assistive-technology, physical presentation or security-policy
acceptance. Reports and exploratory failures remain in candidate `.cache/`
directories; each candidate's `VALIDATION.md` distinguishes them from accepted
checks and still-open gates. The hidden-focus fixture failure is retained too.
