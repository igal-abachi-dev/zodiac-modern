# Six-host external collector

The [protocol](PROTOCOL.md) defines the primary cohort, endpoints and limits.
This is separate from the historical nine-frontend collector; it uses UIA3 for
all six hosts and leaves those original results/source unchanged.

From `desktop/`, build with the pinned .NET SDK 10.0.402:

```powershell
dotnet restore host-test-support/measurement/Measurement.csproj --locked-mode --configfile host-test-support/measurement/NuGet.Config --packages host-test-support/.cache/nuget
dotnet build host-test-support/measurement/Measurement.csproj --no-restore -c Release -o host-test-support/.cache/measurement-bin
python -m unittest discover -s host-test-support/measurement -p test_analysis.py
python host-test-support/measurement/run.py correctness --folder host-test-support/.cache/my-cohort
python host-test-support/measurement/run.py earlyclose --folder host-test-support/.cache/my-cohort
python host-test-support/measurement/run.py pilot --folder host-test-support/.cache/my-cohort
python host-test-support/review_measurements.py host-test-support/.cache/my-cohort
# Inspect pilot frames and settings, then record pilot-accepted.json.
python host-test-support/measurement/run.py all --folder host-test-support/.cache/my-cohort
python host-test-support/review_measurements.py host-test-support/.cache/my-cohort
python host-test-support/measurement/analyze.py host-test-support/.cache/my-cohort
```

Do not build or change frozen artifacts while collecting. Only the task-owned
target windows are activated/closed. Background helper processes remain hidden.
No invalid attempt is silently replaced; the orchestrator stops at the first
rejection. Private-memory counters must be complete and match the live root
identity. `review_measurements.py` independently checks this after collection.

Collector development failures are retained separately: initial single-shot
activation (`b`), bounded native retries (`d`), explicit message queue (`e`), and
an attached-process exit-code observation failure (`f`). The final collector uses
public UIA focus plus bounded native activation, retains the PowerShell-launched
process handle, and checks exit code zero. This is a collector evolution, not
evidence that Wails failed to render or leaked helpers. Do not pool those attempts
with the final `six-host-20261024-h` cohort.

H completed all measured startup/idle cases, then stopped at an action warmup on
provider COM error `0x80040201`. Its original collector/source were archived before
revision. The complete action lane is recollected separately in
`six-host-actions-20261024-i` using `--collector` to select the action binary.
`actionpilot` runs two action cycles per host before that phase. Read-only query
failures retry at most ten times, retaining every gap; native input is never
replayed. Startup/idle H and action I remain distinct endpoint cohorts.

One measured WinUI dialog attempt in I timed out. The user reported an accidental
click in another window and authorized exactly one retry. That retry passed with
the frozen I collector; the original raw failure remains unchanged and excluded
for reported input interference. `../retry_interrupted_action.py` records the
authorization, original-result hash and selected n=20 action summary separately.
It is outside the original randomized order. Likewise, supplemental preparation
cohort A stopped on a warmup during reported computer use and was restarted as B,
without pooling its attempts. See the protocol's actual phase amendments.

Actual output also records initial geometry, any client calibration, foreground
attempts, process arguments, actual runtime, sampling/capture intervals, collector
CPU and final lifecycle status. The common PowerShell wrapper is a controlled
launch path, not the product's individual Run.ps1 or Explorer gesture.

Supplemental large-list assets/replicas and their independent collector live in
`../workloads/`; build those only while primary measurement is stopped. The two
cohorts use different frontend artifacts and must remain separate.
