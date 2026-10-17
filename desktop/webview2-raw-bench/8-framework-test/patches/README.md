# htmx offline no-storage variant

The user's instruction to fix htmx's failures authorizes this explicit local
patch. `pnpm-workspace.yaml` and `pnpm-lock.yaml` record it for **2.0.11**;
`pnpm install --frozen-lockfile --ignore-scripts` applies it reproducibly.

Only `dist/htmx.esm.js`, the pinned package's imported ESM entry, changes:
`canAccessLocalStorage()` returns false without probing sessionStorage. Upstream
initialization otherwise probes with setItem/removeItem, then stores the history
path, before application code can disable history. The capability gate also
prevents the associated history-cache accesses. Other distributed entry points
are not patched and must not be substituted without review.

This is a maintained offline variant, **not an unmodified upstream pass**. No
Storage API monkeypatch or cleanup-after-write ships in the app. Existing
`historyEnabled=false`, zero history cache, no evaluation/script injection and
local-fragment-only configuration remain. htmx history persistence is unavailable
in this variant; it is not suitable for testing that feature. The original failed
evidence stays in the validation record. Review/remove the patch when upgrading.

The production browser regression observer is installed before page scripts and
records `Storage.prototype.setItem` calls, including transient probes, in addition
to checking empty storage at completion. This test instrumentation is not shipped
in the frontend and is not a complete OS storage or direct-property-write audit.
Native-host smoke, fragment loading, keyboard/control behavior and the workload
suite must also pass before updating acceptance. Keep the patched htmx label in
results and rebuild asset/lock manifests; its bytes differ from the old baseline.
