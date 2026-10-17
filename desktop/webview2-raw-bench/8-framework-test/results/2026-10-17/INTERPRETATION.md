# What the measurements change

**Svelte 5 remains a sensible default for this repository's small/medium local
tool, primarily because of its clean implementation, Ark integration and small
bundle. The measurements support keeping Solid and Preact on the shortlist, but
do not establish that those three win every important metric. Vue is equally
credible. React's actual cost is substantially more nuanced than its JS bytes.**

Read the [key tables](RESULTS.md) alongside the [source comparison](../../CODE-COMPARISON.md).
These are stock integrations in one WebView2 host, not universal framework scores.

## React's measured premium

| Endpoint | Vanilla | Svelte | React | React minus vanilla |
| --- | ---: | ---: | ---: | ---: |
| Fresh-path Ready median, ms | 2279.8 | 2245.5 | 1998.5 | −281.3 |
| Retained-path Ready median, ms | 545.5 | 529.2 | 685.1 | +139.6 |
| Visible-idle private resident, MiB | 104.27 | 101.52 | 102.15 | −2.12 |
| Visible-idle private commit, MiB | 227.01 | 226.44 | 243.51 | +16.50 |

React's retained-path median was about 26% above vanilla's and 29% above Svelte's.
The median **paired-round** React-minus-vanilla difference was +133.5 ms; the
conditional bootstrap 95% interval was +89.9 to +177.3 ms. This is a clearer
retained-startup cost than the small differences among Svelte, Solid, Vue and
Preact. Their roughly 524–574 ms medians are close to the UIA observation scale;
most corresponding paired intervals include zero.

React was nevertheless fastest on the fresh-path median in this cohort, at
about 2.00 seconds. Its paired-round median difference was −317.0 ms, with an
interval of −462.5 to −51.3 ms. Differences of medians and medians of paired
differences are distinct statistics; their numerical values need not match.
Do not discard this result because it conflicts with a byte-based prediction.
Also do not infer that React intrinsically initializes faster: total startup
includes runtime/profile setup, assets, UI readiness and provider observation.
The exact cause of the fresh-path result has not been isolated.

Tails also complicate the shortlist: Svelte's fresh-path p95 was 4.03 s versus
React's 2.57 s. Retained-path p95 was 0.64 s for Svelte and 0.75 s for React,
while Preact/Vue were about 0.86/0.84 s. With 20 samples, nearest-rank p95 is
tail-sensitive; these outliers deserve follow-up rather than a blanket claim
that smaller bundles consistently start faster or have better tails.

There was **no large private-resident RAM premium** for React in the idle run.
All nine were about 101–107 MiB. React's commit was about 16.5 MiB above vanilla,
but Preact's commit was slightly higher again. This is one lifetime per app,
not replicated memory experiments; the 60 samples are correlated. Small
resident differences cannot establish a memory-efficiency ranking. Shared
pages and GPU allocations are excluded from private resident memory.

The source comparison's extra ~214 KB of React production JS is real. It did
not translate into hundreds of additional MiB or a consistent startup penalty.
The WebView2/process/runtime floor matters much more in this small screen.

## Svelte, Solid, Preact and Vue: a mixed measured shortlist

Svelte, Solid and Vue had similar retained-path medians: 529, 524 and 527 ms.
Preact was 574 ms. Svelte/Solid/Preact opened About in approximately 12 ms of
semantic response, Vue in 13 ms, React in 28 ms and vanilla in 39 ms. This supports
the practical value of their integrations; handwritten DOM code is not
automatically the lowest-latency implementation.

The large-list results do **not** reproduce a single source-level ordering:

- Creating 10,000 rows: Vue/Svelte were about 2.09/2.13 s, Preact/Solid about
  2.44/2.46 s, React 2.59 s, Alpine 2.96 s. Patched htmx's explicit client
  controller was about 2.08 s, close to vanilla's 2.10 s.
- Replacing those 10,000 with 1,000 new rows: Preact and React were about
  1.43/1.58 s, Solid 1.65 s, while Svelte/Vue/vanilla were about 2.25–2.30 s.
  Lit was fastest in that condition at about 1.01 s.
- Filter-during-requested-30-Hz medians were mostly 254–261 ms; Lit was 214 ms
  and Alpine 289 ms. This is a bounded interrupted burst, not measured 30 FPS.

Those numbers include real input and Windows accessibility/provider observation.
Tree construction, deletion and text-node granularity can affect that endpoint.
They are **not** browser scripting time, physical paint, INP or throughput.
In particular, the slow 10,000-to-1,000 transition is not a clean 1,000-row mount.
Use a separately recorded trace/optimized lane before attributing these costs to
reconciler or signal internals. Do not impose these unvirtualized stress cases on
the normal two-panel workflow or claim they predict every larger desktop app.

My product shortlist remains Svelte first for this repository's development
fit; Solid if TSX is preferred; Preact for the smallest declarative bundle when
its direct-Zag adapter ownership is acceptable; and Vue as a strong alternative.
React remains reasonable when a concrete ecosystem/team benefit outweighs the
measured retained-startup and some interaction costs. These results do not
justify banning React or calling it unsuitable for professional WebView2 apps.

## Lifecycle and accessibility observations

All 1,110 accepted attempts passed normal run-owned host/helper shutdown checks.
No new accepted helper-leak failure was demonstrated. The older early-init-close
concern remains open: closing after Ready is a different lifecycle scenario.

There were 21 recovered primary UIA query gaps: Alpine nine, patched htmx seven,
vanilla five; none in the other six apps. All were retained in traces, and no
worker error remained. These three bootstrap paths use explicit HTML replacement
([vanilla](../../apps/vanilla/src/main.ts), [Alpine](../../apps/alpine/src/main.ts),
[htmx](../../apps/htmx/src/main.ts)). That is a useful integration-level lead,
not proof that replacement caused the gaps or that a framework is inaccessible.

React's split supplemental summary text required aggregation under the existing
`workload-summary` ID. The collector was corrected identically for all apps;
frontends were not changed to win the test. Provider/tree differences are real
integration work, but these probes are not a Narrator/NVDA or usability audit.
Actual IME, high contrast, multi-monitor and physical DPI acceptance remain open.

The rejected pre-cohorts exposed two collector bugs: an unhandled UIA detach and
stale parent-PID attribution. Neither was counted as a framework failure. No
unrelated process was terminated. Regression cases cover the ancestry error.

## Review of follow-up feedback (2026-10-18)

The supplied feedback largely agrees with these observations. It is a review of
the same cohort, not an independent replication or additional measurement.
Keep the following distinctions when using its recommendation:

- **Svelte remains the practical first candidate**, based on repository fit,
  implementation clarity, Ark integration, bundle size and competitive results.
  Solid and Vue remain strong alternatives; Preact trades a small declarative
  bundle for more direct Zag adapter ownership. This is a conditional product
  shortlist, not a measured overall league table.
- **React's cost is conditional.** Its retained-path Ready median was about
  140 ms above vanilla, while its fresh-path median was about 281 ms lower.
  Both results belong in the decision. Fresh-path does not mean post-reboot
  OS-cold, and neither result isolates JavaScript initialization cost.
- **No large resident-memory premium was observed** is supported; equivalent
  memory use is not established. There was one idle lifetime per app, with
  correlated samples and a fixed state order. Private commit and private
  resident memory are different endpoints; the approximately 16.5 MiB React
  commit increase is not an additional 16.5 MiB of resident RAM.
- **The dialog result does not establish a rendering-model cause.** The roughly
  12 ms versus 39 ms observations include input dispatch, integration and UIA
  provider work. React is also reactive. A browser/native trace is needed before
  attributing the difference to compiler output, signals or manual DOM work.
- **Similar startup medians are not proof of equivalence.** Svelte/Solid/Vue
  cluster around 524–529 ms retained; Preact was 574 ms. Observation resolution
  and uncertainty limit fine rankings. Solid and Svelte also differ materially
  in the measured list operations, so they are not interchangeable winners.
- **Tails and workload reversals remain part of the recommendation.** Svelte's
  fresh-path p95 was worse in this cohort; React/Preact were faster than Svelte
  when shrinking the list, while Svelte/Vue were faster creating it. The n=20
  tails and unvirtualized UIA-observed workloads warrant targeted follow-up.
- **Accepted lifecycle passes are scoped to the exercised path.** All 1,110
  accepted attempts passed normal shutdown checks; this does not close the
  earlier early-initialization shutdown concern or the physical accessibility
  matrix. The 21 recovered UIA query gaps are retained as observations, not
  assigned as proven framework defects.

This feedback requires no change to the shared nine-app contract or host.
The next selection evidence is the outstanding lifecycle/accessibility work and,
where product needs justify it, trace attribution and replicated memory runs.

## Additional source-model feedback review (2026-10-18)

The further recommendation reinforces Svelte as our practical default, but its
claims about concurrency and exclusive peer status go beyond the evidence:

- **Concurrency addresses work within one UI, not the number of users.** React
  transitions can keep typing responsive while a chart, tab or slow list updates
  in a single-user desktop app. They are interruptible scheduling, not parallel
  execution of arbitrary JavaScript. Our small normal workflow has not
  demonstrated a need for them; that is different from their being inherently
  useless in WebView2. See the official [startTransition reference](https://react.dev/reference/react/startTransition)
  and [deferred-rendering examples](https://react.dev/reference/react/useDeferredValue).
- **These stock integrations do not isolate concurrency's cost or benefit.**
  The measured React bundle/startup delta cannot be assigned specifically to
  lanes or time-slicing. A separately labeled optimized experiment would need
  to preserve correctness and measure input responsiveness as well as final
  completion; it must not replace this frozen shared-contract cohort.
- **Solid is not the only credible peer.** Vue had similarly competitive
  retained startup and dialog response, and strong list creation. Preact had
  the smallest declarative bundle and faster list shrinking than Svelte. Their
  integration and maintenance tradeoffs differ; neither is categorically a
  step down. Nor do nearby retained medians prove Solid/Svelte equivalence.
- **The priority assigned to retained startup is a product choice.** It matters
  for repeated use, but first-use startup, tails, accessibility and lifecycle
  remain selection criteria. React was not the slowest on every relevant
  endpoint. No broad runtime-overhead ranking follows from one small fixture.

Keep Svelte as the first product candidate without a blanket React prohibition.
A concrete ecosystem, maintainability or team benefit can justify React; a
React-only dependency or hiring requirement is not the only acceptable reason.
This remains a repository-specific recommendation, not a universal verdict for
small/medium WebView2 applications.

## What still needs measurement

There were no near-uniform-after-accent regressions under the pixel classifier
in 720 measured launches. Median capture intervals per launch were approximately
85.5–105.1 ms, so short flashes and physical display timing remain unresolved.
This is not proof of a flash-free startup.

Before product selection, complete physical accessibility/IME/DPI tests and the
known early-close lifecycle investigation. If large data views matter, collect
browser/native trace attribution, frame pacing and longer remount/heap trends.
Post-reboot OS-cold, GPU, I/O/energy and distribution-footprint studies remain
separate. Equivalent Electron and Avalonia apps plus launch/UIA adapters are
required before comparing renderer families; the nine frontend results alone
cannot answer WebView2 versus Skia versus Electron.
