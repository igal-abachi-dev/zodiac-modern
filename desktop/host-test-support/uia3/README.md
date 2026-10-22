# UIA3 production workflow checker

Test tooling only; never linked into a native host, Svelte assets or shipped app.
Uses FlaUI.UIA3 **5.0.0**, pinned transitive dependencies/content hashes in
`packages.lock.json`, .NET SDK **10.0.402** and Windows x64. The restored package
identifies upstream commit `c5e7eb7af081e68534cb6b6890a38aa791ce4168` and MIT
license. It uses the modern UIA COM client independently of the original managed
`System.Windows.Automation` checker. [Upstream](https://github.com/FlaUI/FlaUI).

Build with `./Build.ps1` (NuGet access on first restore) or `./Build.ps1 -Offline`
after restoring. This writes `../.cache/uia3/`; dependencies remain test-only.
Run from `desktop/` in an interactive Windows session:

```powershell
dotnet host-test-support/.cache/uia3/UIA3Probe.dll `
  WinUI3-webview2/out/win-x64/neutronstar-winui-webview2.exe `
  D:/NeutronStar/profiles/winui-correctness `
  D:/NeutronStar/reports/winui-correctness.json
```

Additional arguments after the report pass to the child, e.g. C++'s `--assets`
with the absolute Svelte `dist/` path. Use task-owned test profiles/reports and
synthetic assets only. The checker foregrounds its window and sends actual input;
do not operate another app during the check. It strips `WEBVIEW2_*` from the child
environment, without changing the caller/machine environment or logging values.

The checker waits for a visible task-owned NeutronStar HWND, reacquires the UIA3
root during startup, tolerates unsupported Name properties on intermediate nodes,
and finds the actual document containing Ready. It verifies About → Escape →
trigger focus, About → Close, encryption → complete, Reset → Ready, decryption →
Cancel → canceled and Reset → Ready, then closes its host and checks root exit.
Focus return uses the button's `HasKeyboardFocus`; a global focused-element query
did not identify that inner web button in this WinUI configuration.

[2026-10-23 reports](results/2026-10-23/) contain final fresh/retained WinUI passes,
a C++ UIA3 pass, a C++ UIA2 regression pass and rejected collector attempts. The
first UIA3 probe's unguarded Name query threw on an unnamed intermediate node;
its exploratory `.cache/uia3-01.json` is not accepted. The global-focus-query
failure is also retained. The WinUI production host and frontend were unchanged.

In this environment UIA2 still sees native chrome only, even after visibility and
root-refresh fixes; UIA3 exposes the full document. This is observed backend
compatibility, not a complete diagnosis of all provider differences or a general
claim about every WinUI app. No production security option was relaxed.

These are **correctness** checks: no benchmark timings, physical presentation,
Narrator/NVDA/IME/high-contrast/DPI or helper-tree lifecycle acceptance. The six-host
measurement harness must pilot the same backend/semantic endpoints across all
six, then freeze its own version and overhead. Do not mix old UIA2 and new UIA3
timing cohorts. A passing checker is not a screen-reader accessibility audit.
