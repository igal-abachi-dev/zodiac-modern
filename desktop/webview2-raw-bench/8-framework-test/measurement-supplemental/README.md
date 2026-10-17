# Supplemental external workload lane

Final cohort `workload-20261017-g` completed 210 passing process attempts:
three pilot, 27 warmup and 180 measured. [Tables](../results/2026-10-17/SUPPLEMENTAL.md)
and [interpretation](../results/2026-10-17/INTERPRETATION.md) are published. Older
development failures and collector versions remain separate. Discovery now uses
the shared PID-and-creation-time ancestry checks and regression fixtures.

This collector drives `dist-workload`, never production `dist`. It is separate
from the frozen startup/idle collector and uses the same unchanged Release host.
It sends Windows mouse and keyboard input; it does not invoke the test-only
JavaScript API or enable a privileged bridge.

```powershell
dotnet restore measurement-supplemental/Workloads.csproj --configfile measurement/NuGet.Config
dotnet build measurement-supplemental/Workloads.csproj -c Release -o .cache/workload-measurement-bin --no-restore
python measurement-supplemental/run.py pilot --folder .cache/workload-cohort
# Inspect and record pilot-accepted.json before proceeding.
python measurement-supplemental/run.py measure --folder .cache/workload-cohort
```

Each attempt starts a fresh process/profile, waits for Ready, scrolls the common
workload toolbar into view, then performs the same sequence: replace 10,000 rows,
replace 1,000, reverse, splice ten, update every tenth, filter to one, clear,
filter during a requested 30 Hz burst, stop, and remount a fresh model. It checks
the expected summary, first keyed row ID and reset tick rather than accepting
unchanged row counts as completion. This complements the stronger browser/native
correctness suites; it does not re-prove every row/key invariant itself.

Three randomized warmup rounds and 20 measured rounds produce independent
process attempts per app; operations within an attempt remain correlated and
ordered. The order intentionally includes a 10,000-to-1,000 transition, so it
does not describe a clean 1,000-row mount alone. Preserve the entire sequence.
htmx's list uses the declared explicit client controller, not server hypermedia.

The observable endpoint is a Windows accessibility-provider response. Input
dispatch, UIA traversal and provider work are included, and large accessible
trees can make that overhead substantial. These numbers must not be relabeled
DOM mutation time, browser scripting time, physical paint or typing INP. A
requested 30 Hz timer is not a measured rendering rate. The current external
lane does not compare 10/30/60 Hz frame budgets or perform the 100-remount heap
trend study; those require additional trace/heap collection. Keep those gates
open rather than guessing from this collector.

Asset/collector/host hashes and runtime are frozen independently of the primary
cohort. Failed attempts remain and stop collection; do not silently retry them.
The initial vanilla development pilot is retained separately in
`.cache/workload-pilot-b/vanilla`; it established UIA availability, not comparative
performance. The earlier missing-initial-document failure is also retained.
