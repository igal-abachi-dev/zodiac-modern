# Opt-in browser diagnostics

The production `dist` remains uninstrumented. This collector is a separate lab
lane, not the desktop startup clock, a field Core Web Vitals assessment, or a
performance ranking. Collection adds overhead and separate bundle bytes.

Separate external collection has now completed the initial nine-app cohorts:
[tables and raw metadata](results/2026-10-17/RESULTS.md). That does not turn these
browser diagnostics into official INP/Lighthouse scores or physical presentation
timestamps; their export/attribution limits below still apply.

| Command | Output / purpose |
| --- | --- |
| `pnpm build:diagnostics` | `apps/<app>/dist-diagnostic`: original screen plus collector |
| `pnpm build:workload-diagnostics` | `apps/<app>/dist-workload-diagnostic`: supplemental workload plus collector |
| `pnpm test:diagnostics` | Installed-Edge collector correctness probes under the common CSP |
| `pnpm build:workload-tests` | `dist-workload-test`: supplemental native correctness build |
| `pnpm build:diagnostic-tests` | `dist-diagnostic-test`: supplemental native correctness plus collector assertions |

Run the native correctness lanes with
`powershell -NoProfile -File scripts/Test-Frontends.ps1 -Lane workload` or
`-Lane diagnostic`. They use isolated assets/profiles, the frozen Release host,
the existing PASS/CSP contract and helper-exit checks. These scripted inputs
verify DOM/framework behavior; browser keyboard tests and physical IME/AT trials
are distinct. Production `Run.ps1` continues to launch `dist`.

For a browser-only manual diagnostic session, serve built assets on loopback with
`node scripts/serve.mjs --diagnostic`; add `--workload` for the supplemental lane.
The browser's console/automation can read these **explicit** APIs:

```ts
const ongoing = window.neutronstarDiagnostics.snapshot();
const final = window.neutronstarDiagnostics.stop();
```

Snapshots remain in memory unless the caller explicitly exports them. There is
no auto-download, storage, network, telemetry or native bridge. The native host
still disables DevTools and has no metric-export command: native correctness
checks exercise the API inside the page and report pass/fail, not full timing
JSON. A synchronized native collector/export path remains future work; do not
enable remote-debugging flags or generic IPC to obtain it implicitly.

## What is recorded

`packages/test-support/src/diagnostics.ts` registers separate buffered observers
for paint, largest-contentful-paint, layout-shift, longtask, event and first-input,
only when the runtime advertises support. Event Timing requests a 16 ms threshold;
this is not a guarantee of capturing every fast interaction. Unsupported or failed
registrations remain explicit. See [PerformanceObserver options](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe).

The `neutronstar.browser-diagnostics.v1` snapshot contains page `timeOrigin`,
collector start/sample/stop timestamps, initial/current visibility, configured
observer outcomes, fixed capacity, drop counters and sanitized raw entries.
`observerStatus` describes registration outcome; `stoppedAt`/`stopReason` describe
whether collection is still live. `browserDroppedEntriesLatestReport` is null
when the runtime has not reported that information, not an invented zero.

The default capacity is 512 entries, retaining the first entries and counting
subsequent local drops. No DOM nodes, URLs, text, filenames, resource timing or
typed characters are retained. Only numeric timing/size/shift fields, fixed event
names and a small known-element-ID allowlist survive. Callback-reported browser
drops mark potential incompleteness too. Even zero known drops does not prove
every interaction was observed; thresholding and runtime buffers still apply.

Snapshots drain queued records and copy data. Stop drains/disconnects every
observer, removes lifetime listeners and is idempotent. A hidden document or
pagehide also stops collection. A new document creates a fresh collector; no
BFCache/soft-navigation/cross-document aggregation is implemented. Discard a
hidden-start sample from a visible-startup comparison.

## Interpretation

- FCP and LCP candidates use browser document-relative timestamps. LCP remains
  a candidate, not a guarantee of full-screen content, Ready, or physical scan-out.
- Layout-shift diagnostics exclude recent-input shifts and compute the maximum
  session-window sum (less than a one-second gap, at most the defined five-second
  window). [CLS definition](https://web.dev/articles/cls). Buffer loss can make
  this incomplete; it is not a field score.
- Long-task blocking is clipped to the explicit collector-start/stop interval,
  counting the task portion beyond 50 ms. It is deliberately labeled
  `recordedBlockingMsSinceCollectorStart`, **not Lighthouse TBT**.
- Event Timing is raw diagnostic evidence. There is no homegrown INP calculation,
  Lighthouse score, TTI estimate, GC forcing, process RAM counter or GPU-frame
  attribution in this collector.

Native launch/presentation capture, UIA Ready, process-tree memory/CPU, exact
environment metadata and randomized repeated samples still belong to the
[measurement protocol](BENCHMARKING.md). Correctness probes collect entries to
verify the API, but do not publish their wall times or entries as comparative
performance results. Before actual runs, freeze separate asset manifests for
each instrumented lane and quantify instrumentation overhead.
