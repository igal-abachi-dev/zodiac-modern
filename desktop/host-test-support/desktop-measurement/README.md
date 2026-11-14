# Desktop cross-toolkit collector

Measures the independent desktop candidates (see [PROTOCOL.md](PROTOCOL.md) for clocks, endpoints and limits). It is
test tooling and is never shipped in an application. The six-host WebView2 collector in `../measurement/` is unchanged;
only its `Native.cs` and `ProcessTree.cs` are linked.

Status 2026-11-14: calibration, reference recording, targets (Dear ImGui), startup, idle and interaction scenarios are
implemented and one full cohort (`desktop-cohort-3`, 557 attempts, 0 failed) was collected; results are in
`../results/20261114-desktop/RESULTS.md`. The 10/30/60 Hz burst workloads and UIA timing for actions are not measured.

## Build (from `desktop/`)

```powershell
dotnet restore host-test-support/desktop-measurement/DesktopMeasurement.csproj --locked-mode --configfile host-test-support/desktop-measurement/NuGet.Config --packages host-test-support/.cache/nuget
dotnet build host-test-support/desktop-measurement/DesktopMeasurement.csproj --no-restore -c Release -o host-test-support/.cache/desktop-measurement-bin
python -m unittest discover -s host-test-support/desktop-measurement -p test_analysis.py
```

The pinned SDK is 10.0.404 (`global.json`, `rollForward: disable`). Packages: FlaUI.UIA3 5.0.0, Vortice.Direct3D11 and
Vortice.DXGI 3.8.3 (test-only, MIT, locked by `packages.lock.json`).

## Phases (the PC must stay untouched: the collector moves the pointer and focuses windows)

```powershell
python host-test-support/desktop-measurement/run.py calibrate --folder host-test-support/.cache/<cohort> --variants avalonia
python host-test-support/desktop-measurement/run.py reference --folder host-test-support/.cache/<cohort> --variants <ids>
python host-test-support/desktop-measurement/run.py targets   --folder host-test-support/.cache/<cohort>     # Dear ImGui click targets
python host-test-support/desktop-measurement/run.py pilot     --folder host-test-support/.cache/<cohort> --variants <ids>
python host-test-support/desktop-measurement/run.py pilot-work --folder host-test-support/.cache/<cohort>   # idle + interact, one lifetime each
# review pilot frames, then write <cohort>/pilot-accepted.json
python host-test-support/desktop-measurement/run.py startup   --folder host-test-support/.cache/<cohort> --variants <ids>
python host-test-support/desktop-measurement/run.py idle      --folder host-test-support/.cache/<cohort> --rounds 3 --warmups 1
python host-test-support/desktop-measurement/run.py interact  --folder host-test-support/.cache/<cohort> --rounds 8 --warmups 1
python host-test-support/desktop-measurement/run.py summarize --folder host-test-support/.cache/<cohort>
```

Variant ids: `tauri electron avalonia winui-mvvm winui-reactor flutter qt slint rnw wx imgui-dx12 imgui-dx11`.
Rebuilding any frozen artifact requires a new cohort folder. A failed attempt stops the run and is retained.
