# Six-host supplemental Svelte workloads

This is a separate lane from production startup/idle/action collection. It uses
the existing standalone Svelte `dist-workload`, staged identically for all six.
Production frontend/native artifacts remain unchanged.

`../prepare_workload_hosts.py` creates a fresh isolated tree under
`../.cache/workload-hosts-20261023`. Raw C++/Rust reuse their binaries with the
alternate asset path. WinUI and pywebview reuse copied complete deployments with
only their manifest-verified assets replaced. Tauri/Wails compile isolated source
replicas with the supplemental assets embedded; native application/policy code
is copied unchanged. `../Build-WorkloadHosts.ps1` performs those two offline builds.
Never run builds concurrently with timed collection.

The .NET 10.0.402 collector uses pinned FlaUI.UIA3 5.0.0 for all six and links the
primary collector's PID/creation-time process accounting and native input helpers.
Restore with the local NuGet.Config and committed lock, then build Release into
`../.cache/workload-bin/`. This tooling is not shipped in any frontend/app.

From `desktop/`:

```powershell
python host-test-support/workloads/run.py pilot --folder host-test-support/.cache/my-workload-cohort
# Validate all six semantic/keyed-row/cleanup results and record pilot-accepted.json.
python host-test-support/workloads/run.py measure --folder host-test-support/.cache/my-workload-cohort
python host-test-support/workloads/run.py summarize --folder host-test-support/.cache/my-workload-cohort
```

The collector starts a new process/profile, calibrates client DIP, waits for
Ready, scrolls the workload toolbar into view and sends actual pointer/Unicode
keyboard input. It checks creation of 10,000 rows, 10k→1k replacement, reversal,
ten-row splice, 10% update, filter/clear, filtering during a requested 30 Hz burst,
stop and remount. Counts, first keyed row and tick/reset state must match; unchanged
counts alone are not accepted. The timer frequency is requested scheduling, not
measured rendering FPS or browser throughput.

There are six pilot attempts, three randomized warmup rounds and **20 randomized
measured rounds** (120 independent measured lifetimes), total 144 attempts. Runtime
and complete deployment/collector/asset hashes are checked; failure stops collection
and is retained. Normal root exit must be zero and discovered helpers must exit.

The endpoint is input-to-UIA-observed semantic completion. UIA traversal and
accessibility-tree synchronization can dominate large unvirtualized lists. These
are not DOM mutation, scripting, INP, physical paint, energy or GPU measurements.
Security-policy equivalence and physical accessibility remain separate gates.
