# Comparing the nine implementations

2026-10-17 source inspection and production-artifact comparison. Reviewed findings
precede the archived external feedback below; that feedback includes hypotheses
and errors addressed in the review. This is not a
startup, RAM, CPU, frame-time or accessibility ranking. The actual performance
benchmark runs were previously deferred. The user has now authorized them:
the [external Windows collector](measurement/README.md) passed its revised
18-attempt pilot and completed 900 primary plus 210 supplemental attempts. Keep the source/byte
findings below separate from the [measured tables](results/2026-10-17/RESULTS.md)
and [interpretation](results/2026-10-17/INTERPRETATION.md). Semantic UIA
responses include accessibility/provider cost; captured client frames are not
physical presentation timestamps. These nine apps cannot establish WebView2
versus Electron versus Avalonia/Skia performance without equivalent host apps
and additional GPU/energy/native-accessibility evidence.

Measured continuation: Svelte/Solid/Vue had similar retained-startup medians;
Preact retained its bundle-size advantage but did not win every response metric.
React's retained median was 685 ms versus vanilla's 546 ms, but its fresh-path
median was faster (1999 versus 2280 ms). Visible-idle private resident memory was
similar across all nine (about 101–107 MiB); React's private commit was about
16.5 MiB above vanilla in the single idle lifetime. Large-list ordering changed
between creation and shrinking. These observations reject a simple bytes-to-RAM
or universal signal-versus-VDOM ranking. Svelte remains a practical repository
default on combined DX/integration/size evidence, not a proven winner in every
workload. See the linked interpretation for uncertainty and UIA costs.

The [2026-10-18 feedback review](results/2026-10-17/INTERPRETATION.md#review-of-follow-up-feedback-2026-10-18)
keeps that shortlist while distinguishing observed dialog latency from a proven
rendering-model cause, similar RAM observations from memory equivalence, and
normal shutdown passes from the still-open early-initialization lifecycle gate.
It reviews the existing cohort; no new benchmark observations were added.

## What the implementations share

Acceptance finding after the requested fix: all nine pass current native/browser
checks, with **htmx 2.0.11 + an explicit offline no-storage patch**. Unmodified
htmx failed the original contract; the patch and regression evidence are recorded
in [VALIDATION.md](VALIDATION.md) and [patch notes](patches/README.md).

The same pure TypeScript fixture/transitions, Nano Stores snapshot, elapsed-time
timer, external stylesheet, fonts/icons and host policy are used by every app.
Each app owns its render tree and lifecycle. No shared imperative renderer or
React component is embedded inside the other framework implementations.

The source plan prefers Ark controls where supported. The actual implementation
uses Ark's public **hooks and prop APIs**, with framework-owned markup, rather
than its ready styled wrappers. Ark is unstyled, but its default prop output
still includes inline styles. Keeping the public behavior hooks while composing
external CSS allows equivalent semantics under the host policy. The remaining
five use the same pinned Zag machine version through supported adapters.
The approved three-declaration dialog-style exception is identical everywhere.

## Source-level tradeoffs

| App | Main implementation | Relative to vanilla | Relative to React / professional-app implications |
| --- | --- | --- | --- |
| **Vanilla** | Trusted static HTML; explicit DOM/event binding and teardown; direct Nano Stores subscription; Zag vanilla services | Reference implementation, but not zero dependencies: state/control behavior still ships | Most DOM synchronization is our responsibility. Good for a tightly bounded tool; complex conditional views/forms increase manual maintenance |
| **Svelte 5** | Svelte template; `$snapshot` follows the compatible store contract; Ark rune-backed hooks; `onMount` cleanup | Compiler handles reactive DOM updates instead of our manual text/disabled/ARIA synchronization | Concise markup and little application adapter code; useful fit with this repository's Svelte familiarity. Store auto-subscription is not a separate copied `$state` owner. Compiler-specific tooling and Svelte integration expertise remain necessary |
| **React** | TSX; Nano Stores `useStore`; Ark hooks; effect cleanup; normal production root | Declarative ownership replaces manual DOM synchronization; larger runtime/control integration bundle here | Strong choice when the team's component ecosystem and complex-editor needs justify it. Hooks, dependency/lifecycle rules and render scheduling need discipline. The small sample cannot validate a large product architecture |
| **Vue** | SFC template; Nano Stores ref; computed Ark progress props; mount/unmount hooks | Template compiler and reactive bindings replace imperative updates | Readable separation of template and TypeScript; good general desktop-workflow candidate. Ref/computed boundaries and Vue-specific component checking add tooling, but avoid much custom glue |
| **Solid** | Compiled TSX; accessor-based Nano Stores/Ark APIs; explicit mount/cleanup | Reactive bindings replace manual DOM work | Attractive for teams wanting TSX with fine-grained reactive composition. Accessor/reactivity rules differ from React despite similar syntax; React components are not directly interchangeable |
| **Preact** | Compact TSX renderer; Nano Stores adapter; direct Zag Preact machine hooks | Declarative rendering with a small additional bundle cost in this fixture | Familiar JSX/hooks, but Ark has no Preact package here. We own more control composition than React. The upstream Zag adapter uses Preact's compatibility APIs; that does not import the React runtime |
| **Lit** | TypeScript custom element; tagged HTML; light DOM; subscriptions call `requestUpdate`; local prop/ref binding cleanup | Adds a component lifecycle/template system but retains substantial integration glue | Good for reusable Web Components or mixed applications. Light DOM deliberately shares the document CSS; it is not a shadow-DOM isolation comparison. Our Zag prop-binding adapter is additional code to maintain |
| **Alpine CSP** | Trusted HTML directives; externally registered methods; reactive projections of the common snapshot; direct Zag services | Retains an HTML/controller structure while adding directive reactivity | Pleasant for light enhancement. CSP-build restrictions and avoiding `x-show`/runtime styles constrain idioms. This fixture needs more control integration than its initially small HTML surface suggests |
| **htmx** | Static local fragment GET; explicit hardened configuration; vanilla-like state/control controller after the swap | Adds htmx plus fragment initialization to essentially the same operation controller | htmx's server/hypermedia strengths are not exercised by an offline GUI without a backend. Viable for static-fragment experiments; weaker default for a highly stateful client-only desktop UI. The extra fragment request is disclosed, not hidden |

Relevant sources are the actual `apps/<name>/src/` implementations and pinned
installed public APIs. Upstream reference points: [Svelte store contract](https://svelte.dev/docs/svelte/stores#Store-contract),
[Nano Stores integrations](https://github.com/nanostores/nanostores),
[Ark](https://ark-ui.com/), [Zag adapters](https://zagjs.com/guides/framework-adapters),
[Alpine CSP](https://alpinejs.dev/advanced/csp), and [htmx configuration](https://htmx.org/docs/#configuration).

## Actual production bytes

Raw, uncompressed JavaScript bytes across each app's production `dist`; total
includes HTML, the identical CSS/fonts/icons and any app-specific fragment.
These exclude the native EXE, WebView2 Runtime, build tools and profiles.
These are the implemented stacks' artifacts, not bare-framework package sizes.

| App | JS bytes | Extra JS versus vanilla | Total asset bytes |
| --- | ---: | ---: | ---: |
| Vanilla | 70,898 | 0 | 217,205 |
| Svelte | 102,679 | 31,781 | 248,986 |
| React | 284,832 | 213,934 | 431,139 |
| Vue | 126,872 | 55,974 | 273,179 |
| Solid | 100,351 | 29,453 | 246,658 |
| Lit | 89,030 | 18,132 | 235,337 |
| Preact | 79,721 | 8,823 | 226,028 |
| Alpine | 142,173 | 71,275 | 288,480 |
| htmx (patched) | 140,553 | 69,655 | 290,232 |

Refreshed after the htmx patch and explicit production-only Tailwind source
discovery. Common CSS is 55 bytes smaller than the initial snapshot; all other
eight JS bundles are unchanged. Supplemental workloads are excluded from these
production bytes and must be measured as a separate build/manifest condition.

Manifests under `.cache/manifests/` contain file/source/lock/host hashes and
dependency versions. Rebuild and regenerate when source or dependencies change;
the numbers above are a snapshot. Source lines/bytes are not ranked: formatting,
templates versus strings, generated markup and declarations make raw counts a
poor measure of DX or maintainability. No conclusion about RAM or latency follows
from this byte table, and every candidate still pays WebView2's browser baseline.

## Lifecycle, safety and comparison limits

- State transitions and stale-generation rejection are common, with unit tests.
  Framework subscriptions, control services and view cleanup remain per-app
  responsibilities and are exercised by integration checks. The absence of a
  router avoids conflating router/remount costs with this primary screen.
- Safe text bindings preserve the exact multilingual fixture; formatting source
  HTML must not alter its text. The vanilla/htmx controllers write that fixture
  once with `textContent`; the other renderers bind the same shared string.
- External CSS progress sizing and the approved dialog-only style allowlist are
  compatibility adaptations, not a claim that headless components never style
  the DOM. Focus trapping and inert background behavior must remain equivalent.
- Shared code does not execute in exactly the same CPU cycles. Different bundles,
  JIT context, adapters, wrapper code, render scheduling, event binding and layout
  still matter. The controlled lane includes those integration costs.
- Same WebView2/runtime and stylesheet reduce environment variation. They do not
  eliminate OS scheduling, cache, font decode/shaping, layout or presentation
  variance. TypeScript/Node versions do not guarantee browser optimization.
- Correctness tests and package popularity are not security audits or full Windows
  accessibility acceptance. Small bundle size is not proof of safety either.

## Practical recommendation before timing measurements

For this repository's **small/medium, local WebView2 tool**, Svelte 5 is a sensible
first product candidate: it fits existing skills and expresses this stateful UI
with little custom synchronization. Vue is another balanced template-oriented
candidate; Solid and Preact are credible TSX alternatives worth retaining in the
measured shortlist. This is an engineering judgment from the implemented screen,
not a measured winner.

Choose React when existing team expertise and required React-only components
outweigh the additional runtime/control-stack bytes. This screen's byte difference
alone does not justify rejecting React for a professional application. Rich
editors and visualizations can also run inside other web renderers; verify the
specific component's integration rather than assuming it is React-only.

Use vanilla for a deliberately small interface whose DOM/lifecycle code you are
willing to own, and Lit when Web Component reuse is central. Alpine is more
natural for incremental HTML enhancement than a growing desktop application
shell. htmx would become more compelling with a separately justified hypermedia
backend, which this offline benchmark deliberately does not have.

The professional-app decision should combine these maintenance/ecosystem findings
with the later startup, whole-process-tree memory, active rendering, accessibility
and packaging evidence. No framework selection for the real Go recipient or
launcher-scale app is finalized here.

## Review of the additional feedback

The useful conclusion survives: **Svelte is the first product candidate for this
repository's skills and workflow**, with Solid, Preact and Vue retained in the
shortlist. This is a preference to test, not a reliability or latency ranking.
Keep all nine in the documented experiment. Preserve htmx's original failure
and label the now-passing patched variant explicitly.

- The ascending byte order is vanilla, Preact, Lit, Solid, Svelte, Vue, **htmx,
  Alpine**, React. The archived feedback reverses the last two small stacks.
  These are whole integration bundles, not isolated framework overhead. React's
  213,934 extra bytes include its control/adapter stack relative to ours.
- No CPU, allocation or scalability ranking follows from signals versus VDOM.
  The claims of universally lowest reconciliation cost, almost no intermediate
  allocations, or fresh Fiber allocation on every boolean update are not
  established by this inspection. Frameworks have reuse/optimization paths;
  application structure, update fan-out and DOM/layout work matter.
- React concurrency prioritizes work for **one renderer and one user's input**.
  It is not driven by how many people use a service. A desktop search field,
  chart or large list can benefit; transitions do not move arbitrary computation
  to another thread. Use them when a relevant workload warrants them, without
  disabling modern React behavior or forcing synchronous rendering as a handicap.
  See [React transitions](https://react.dev/reference/react/useTransition).
- Our React app uses `createRoot`, without StrictMode, an explicit transition or
  React Compiler configuration. Nano Stores uses the external-store path.
  React documents that external-store mutations cannot be made non-blocking
  simply by wrapping them in a transition. An optimized React experiment must
  separate urgent input from deferred rendering rather than wrap `bench.start`.
  See [external-store caveats](https://react.dev/reference/react/useSyncExternalStore).
- Preact 11.0.1's installed `src/component.js` schedules its render queue with
  `options.debounceRendering || queueMicrotask`. Do not confuse effect scheduling
  via requestAnimationFrame with the default update queue, or copy a different
  release's default from docs. Solid's synchronous reactivity also has batching;
  "pure push-only" is an unnecessarily absolute model. See
  [Solid batching](https://docs.solidjs.com/reference/reactive-utilities/batch).
- Svelte's compatible subscription avoids a separate adapter package, not all
  runtime work. All nine consume **one whole immutable snapshot atom**, not a
  graph of field-level atoms. The primary lane measures our integration pattern;
  it does not exhaust any framework's native reactivity or selector performance.
- Astro islands/static generation are a different delivery experiment. These
  Vite apps mount a client screen; none tests Astro hydration or Next.js. Do not
  introduce SSR/server features into the offline host to reproduce a web stack.
- Workers remain prohibited by `worker-src 'none'`. The generic recommendation
  to move work to Web Workers is outside this experiment. Future native work
  must keep the UI/STA responsive, but Go/IPC is deliberately not measured here.
- Community reverse-engineering can inform a hypothesis about Epic's stack;
  it does not establish Epic's internal hiring priorities or why its bake-off
  chose a winner. The [official preview announcement](https://store.epicgames.com/news/epic-games-launcher-preview)
  is not evidence for those inferred reasons. Record binary/hash/source
  provenance before treating a reverse-engineered stack as a confirmed reference.

### Implementation fitness and remaining checks

The inspected entry points use framework-owned rendering and supported state/
control APIs: Svelte `$snapshot`, Solid accessors, Vue refs/computed, React and
Preact hooks, Lit subscriptions, Alpine CSP methods, and htmx static fragments.
The production configurations use the relevant Vite plugins and external CSS;
the test-only entry is separate. There is no basis here for replacing the shared
state contract or adding concurrency APIs just to make a feature checklist.

The sample does have deliberate limitations. React/Preact subscribe at the App
root; Lit requests an element update, while other renderers retain their own
binding granularity. Ark hooks versus direct Zag adapters contribute different
costs. Full snapshot updates and the two-second/10 Hz simulation are too small
to assess large-app scaling. Those differences must be disclosed, not erased by
rewriting every frontend around a shared imperative renderer.

Existing tests cover core transitions, stale callbacks, dialog interactions,
reload, common assets and policy behavior. They do not establish repeated
unmount/remount safety, retained-heap trends, input latency under sustained
updates, visual parity of every state, or large-control inventories. The
module-level bench has a terminal `dispose()`; a future remount lane needs a
fresh bench instance per app lifetime, not reuse of the disposed singleton.
No current reload pass should be described as remount acceptance.

Follow-up: all nine supplemental panels now pass five fresh-store remounts and
stale-timer checks in both Edge and the native host. All nine diagnostic builds
also pass collector correctness in both environments. This adds bounded lifetime
coverage, not long-soak/retained-heap proof or primary-screen singleton remount
acceptance. No new comparative performance results are inferred; see
[the validation record](VALIDATION.md) and [diagnostic limits](DIAGNOSTICS.md).

See the [expanded measurement matrix](BENCHMARKING.md#additional-workloads-and-interpretation-gates)
for planned coverage, optimization rules and the distinction between the frozen
small-screen lane and future representative workloads. No new benchmark or
full upstream runtime audit was performed by this review.

## Lessons from the six supplied benchmark references

Reviewed 2026-10-17: the linked project documentation and available paper text,
including the paper's methodology/version tables. No third-party benchmark was
installed or run, and no outside ranking is imported into NeutronStar. Repository
default branches are mutable; pin an inspected commit if adapting their code.

| Reference | Relevant evidence / method | Application to our experiment |
| --- | --- | --- |
| [krausest/js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) | Distinct create, replace, partial-update, selection, swap/removal, append/clear and memory cases; separates keyed/non-keyed behavior; includes rendering in timing and warns about hidden-window paint omissions | Closest reference for the supplemental list lane. Keep DOM-identity correctness checks, visible-window traces and operation-specific warmups. Our reverse/splice cases are not identical to its swap/remove tests, and our shared state/control dependencies make its rankings non-transferable |
| [eknkc/ssr-benchmark](https://github.com/eknkc/ssr-benchmark) | Server-rendering experiment explicitly disclaims being comprehensive/scientific; reports response body size and duplicated hydration data alongside throughput | Inspect what bytes/work are being produced before comparing speed. SSR serialization and hydration payloads are a separate question from a client-mounted local WebView; do not add a server or infer React-versus-Svelte DOM speed from its operations/sec |
| [lissy93/framework-benchmarks](https://github.com/lissy93/framework-benchmarks) | Same weather app with common tests/assets and mocked benchmark data; distinguishes load/resource/build/DX metrics and states its limited scale/scope | Supports our shared contract and synthetic fixtures, plus functional/visual parity before measuring. Unlike its framework-only dependency policy, our experiment intentionally includes Nano Stores and Ark/Zag integration. Its location/storage/network product requirements do not transfer to the offline host |
| [Gieda & Miłosz, Next.js/Astro study](https://www.researchgate.net/publication/403279114_Comparative_analysis_of_Nextjs_and_Astro_frameworks) | Compares SSG/SSR/CSR using common React components, randomized URL order over 100 iterations, saved Lighthouse reports; Astro 5.1.5 and Next 15.1.4 on macOS/Chrome 132 | Good model for version tables, randomized rounds and raw reports. Published in 2026 does not make its tested versions our versions. Vercel/Supabase, images, network and rendering strategy differ from local Windows CSR; it is not evidence that Svelte beats React |
| [TechEmpower FrameworkBenchmarks](https://github.com/TechEmpower/FrameworkBenchmarks), [test definitions](https://github.com/TechEmpower/FrameworkBenchmarks/wiki/Project-Information-Framework-Tests-Overview) | Defines distinct server tasks and supports verification before benchmark execution; includes JSON, database, template/fortune and plaintext scenarios | Borrow verification gates and scenario-specific reporting. Database/request throughput and server concurrency do not measure native window startup, typing, browser memory or GPU presentation; its Docker/load-generator infrastructure is unnecessary here |
| [the-benchmarker/web-frameworks](https://github.com/the-benchmarker/web-frameworks) | Minimal HTTP route contract verified before measurement; records runtime/configuration and latency distributions; cautions against interpreting noise or extrapolating to full applications | Borrow explicit input/output contracts, versioned conditions and raw distributions. Its current documented generator uses `oha`; do not assume an older `wrk` recipe. Requests/sec and connection concurrency are outside our local GUI workload |

### Changes to the measurement design

Our interpretation of these references is to use **two complementary views**:
the representative small-tool screen and a separately labeled renderer stress
lane. A microbenchmark exposes mechanisms; it does not establish product fit.
The new supplemental implementations exercise 1,000/10,000 rows, reorder/splice,
partial updates, filtering under bursts and fresh-store view remounts, alongside
short existing-control soaks. They are not ports of any external benchmark.

Further useful scenarios, still pending, are single-row selection retaining
focus, swapping two distant rows, isolated single-row removal, append-without-
replacement, repeated clear/recreate, and a larger realistic Ark control/form
flow. They should have explicit expected IDs, text and focus outcomes rather
than reuse a superficially similar operation. Do not silently rename our reverse
or splice numbers to match someone else's operation labels.

For each scenario predefine whether initial execution or warmed execution is the
question. Keep first-use samples, initial row creation and repeat replacements
separate. Record event dispatch, state notification, scripting, style/layout,
paint and captured complete-frame endpoints separately where available. A
Playwright click duration or state setter return is not render latency. Frame
budgets depend on the actual display refresh rate; counts of animation callbacks
are not counts of presented frames. A useful first paint can precede Ready, and
the largest-content element can render before controls become usable.

Keep native/whole-process resource sampling separate from renderer heap
diagnostics: before the operation, after it, and after a fixed idle recovery.
Forced-GC heap samples, if used, need a distinct diagnostic lane; they cannot
replace normal idle RAM or create an impression of zero allocations. Run one
performance sample at a time; simultaneous correctness tests are allowed but
their wall times are not comparison data.

Preserve raw samples and rejected attempts with reasons, randomized round/order,
environment/manifest hashes, implementation variant, launch condition, row count,
update rate, timer counts, viewport and collector configuration. Show absolute
times plus paired differences to vanilla, variability and uncertainty. With only
20 samples p95 is coarse; do not publish a convincing-looking p99. Increase a
predeclared sample budget when necessary instead of rerunning until a favorite
wins. Avoid a single composite score; any future geometric aggregate must
declare direction, baseline, weights and missing/failed-case handling first.

Lighthouse/web metrics may be optional diagnostic evidence for a separate browser
lane. They are not the desktop launch clock, Windows UIA acceptance or a
replacement for the visible loading/black-frame timeline. Cold-start capture,
process teardown, accessibility, policy adherence, update responsiveness and
maintenance effort remain required even if a renderer wins a list test. See
[BENCHMARKING.md](BENCHMARKING.md) for current implemented/pending boundaries.

### Lighthouse and Core Web Vitals: useful diagnostics, not framework scores

Add these measurements as a declared diagnostic lane, alongside desktop launch,
input and process-tree metrics. An [opt-in collector](DIAGNOSTICS.md) now has
correctness probes, but no comparative performance cohort has run. The
provided ranges such as "Astro 95–100" or "React 45–85" are not reproducible
framework guarantees. Astro's own [2023 report](https://astro.build/blog/2023-web-framework-performance-report/)
uses observational public-site datasets, notes confounders and reports that none
of its compared frameworks reached a median Lighthouse score of 90. It is not a
controlled Svelte-versus-React experiment or evidence about today's nine builds.

| Metric | Definition / useful question | How to apply here |
| --- | --- | --- |
| FCP | First contentful paint in the document; may only be loading text | Record buffered paint entries when supported, from navigation start. Keep the native window/blank timeline and host-process clock separately |
| [LCP](https://web.dev/articles/lcp) | Largest eligible content paint in the viewport during initial loading | Record candidate element/size/time and finalization condition. A fixture card can be painted while buttons remain unavailable; LCP is not Ready |
| [INP](https://web.dev/articles/inp) | Page-lifetime responsiveness metric based on eligible interactions and their next paints | A short scripted session is lab evidence, not CrUX/field CWV. Keep per-action Event Timing/input-to-present data; use a pinned validated implementation for an actual INP calculation rather than call the mean click duration INP |
| [CLS](https://web.dev/articles/cls) | Unexpected layout shifts grouped into session windows | Observe layout-shift entries, retain sources/recent-input flags and use the defined session-window aggregation. Check loading fonts, progress/control visibility and viewport changes; raw sum of all shifts is not CLS |
| [TBT](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time) | Blocking portions beyond 50 ms of long tasks in the specified loading interval | Use a declared Lighthouse version/configuration for its reported TBT. If we instead analyze a fixed startup or action interval, label it long-task blocking time for that interval, not Lighthouse TBT |
| Main-thread breakdown | Parse/compile/evaluate, handlers, style/layout, paint, GC | Separate trace attribution from end-to-end responsiveness. This tests whether JS bytes or DOM/layout work dominate our actual case |
| Visual completion | Captured content progress and stability | Retain complete-frame/Ready checks and blank regressions; an early FCP or good aggregate Lighthouse score must not conceal a black flash |

Record observer support, dropped entries, visibility, navigation ID, capture
window and instrumentation overhead. Browser performance entries use the page's
time origin; correlate that clock explicitly with OS launch traces. Browser
timestamps are not physical screen scan-out. Keep forced throttling, simulated
mobile/network and standalone Edge Lighthouse results in separate labeled lanes
from unthrottled Windows WebView2. TBT/FCP are not themselves the three current
CWV (LCP, INP, CLS), and a laboratory score is not a field assessment.

Architectures influence cost, but assets, fonts, CSS, data, third parties, build
settings, hardware and application code also matter. Astro can hydrate React or
Svelte islands; Svelte 5 still has a runtime, and React need not be CSR-only.
Our nine Vite builds all mount client-side content, so compare those equivalent
conditions first. Any future static/islands/hydrated version is a distinct
delivery experiment, not a tenth renderer inserted into the current table.

## Archived external feedback — hypotheses, not measured findings

The supplied text below is preserved as received. Its scores, runtime-cost
rankings, Epic motivations and concurrency claims are not adopted study results;
use the reviewed qualifications above when quoting or propagating it.

---

It is one of the more careful, honest framework comparisons I’ve seen for a constrained desktop WebView2 use-case. Here is my assessment and recommendation.

### What the comparison gets right

1. **Controlled experiment is clean**  
   Same domain logic, same Nano Stores snapshot, same timer, same CSS/fonts/icons, same host. This is the only way a byte or source-level comparison is meaningful.

2. **Byte table is useful but correctly caveated**  
   The production JS sizes are honest:

   | Rank (smallest → largest) | App     | Extra JS vs vanilla |
   |---------------------------|---------|---------------------|
   | 1                         | Vanilla | 0                   |
   | 2                         | Preact  | +8.8 KB             |
   | 3                         | Lit     | +18 KB              |
   | 4                         | Solid   | +29 KB              |
   | 5                         | Svelte  | +32 KB              |
   | 6                         | Vue     | +56 KB              |
   | 7                         | Alpine  | +71 KB              |
   | 8                         | htmx    | +70 KB              |
   | 9                         | React   | +214 KB             |

   React’s cost is real in this fixture; the document correctly refuses to treat it as a reason to ban React from larger professional apps.

3. **Source-level observations match reality**  
   - Svelte 5 + store contract + Ark hooks is genuinely low-glue.  
   - Solid and Preact give you TSX with much less runtime than React.  
   - Lit still requires noticeable integration work for Zag props + light DOM.  
   - Alpine CSP and htmx are honest about their limited fit for a growing client-side stateful shell.

4. **Recommendation is appropriately scoped**  
   “Svelte 5 is a sensible first product candidate for this repository’s small/medium local WebView2 tool” is the right level of claim. It does not pretend to be a universal ranking.

### My refined recommendation for *your* project

Given everything we have discussed (Tauri/WebView2 history, Astro/Svelte recipe site, NeutronStar constraints, your existing Svelte familiarity):

**Primary recommendation → Svelte 5**

Reasons that still hold after looking at the numbers and the source comparison:

- Lowest practical friction for the exact screen you built.
- Excellent fit with the existing Astro/Svelte content site and the repository’s skills.
- Store contract works cleanly with Nano Stores (no second owner).
- Compiler does the DOM synchronization work that vanilla/Lit still do by hand.
- Bundle penalty vs vanilla is modest (~32 KB JS).
- Ark Svelte integration is first-class.

**Strong shortlist to keep measuring**

| Priority | Framework | Why keep it |
|----------|-----------|-------------|
| 1        | **Svelte 5** | Best overall fit for this tool |
| 2        | **Solid**    | Very close size + fine-grained reactivity + TSX |
| 3        | **Preact**   | Smallest declarative option; good if you want JSX familiarity with minimal cost |
| 4        | **Vue**      | Excellent template ergonomics; still reasonable size |

**Use only if a concrete need appears**

- **React** — when you need a specific React-only component library or the team’s existing expertise outweighs the ~214 KB premium.
- **Vanilla** — for an ultra-minimal permanent tool where you are happy to own every DOM update.
- **Lit** — if you later want real Web Component distribution.
- **Alpine / htmx** — only for light progressive-enhancement experiments, not the main desktop shell.

### Bottom line

The comparison.md is solid engineering judgment, not marketing.  

For the NeutronStar-style small/medium offline WebView2 tool you are building, **start with Svelte 5**. Keep Solid and Preact in the measured shortlist; treat React as a justified exception rather than the default.

You already have the hardest part done (shared contract + nine working implementations). The next useful step is the real timing / process-tree / accessibility runs, not more framework philosophy.






**Deep source-level comparison of the five frameworks**  
(Svelte 5 · Solid · Preact · Vue 3 · React)

I inspected the actual source trees you provided (Svelte 5 client runtime, Solid reactive/signal + render, Preact diff/component, Vue core, React fiber/reconciler/scheduler). Below is a focused analysis of the internal mechanisms that matter for a WebView2 host and for an Astro-style host, plus how they interact with Ark/Zag, Nano Stores, and the DOM.

---

### 1. Core reactivity & update model

| Framework | Primary mechanism | How updates are scheduled | Fine-grained? | Notes from source |
|-----------|-------------------|---------------------------|---------------|-------------------|
| **Svelte 5** | Signals + sources/effects (runes) | Microtask + effect batching (`runtime.js`, `reactivity/`) | Yes | Compiler turns `$state` / `$derived` into signal reads/writes. Effects are tracked and scheduled. Very little runtime bookkeeping compared with React. |
| **Solid** | Explicit signals + computations | Synchronous by default, with a small scheduler (`reactive/signal.ts`, `scheduler.ts`) | Extremely fine-grained | Pure push-based. No virtual DOM. Components are just functions that create reactive graphs. Closest to “just signals”. |
| **Preact** | Virtual DOM + hooks | Synchronous diff + optional `requestAnimationFrame` batching | Coarse (component) | Classic VDOM diff (`diff/index.js`, `diff/children.js`). Much smaller and simpler than React’s fiber. |
| **Vue 3** | Proxy-based reactivity + dependency tracking | Microtask queue + scheduler | Fine-grained (with compiler) | Reactive proxies track getters. Compiler optimizes templates into block tree + patch flags. Very mature. |
| **React** | Fiber tree + hooks | Concurrent scheduler, lanes, priorities | Coarse by default (component) | Most complex. Fiber, lanes, time-slicing, suspense, transitions. Highest overhead for simple UIs. |

**Impact on complex apps (Epic / Codex style)**  
- Solid and Svelte 5 scale better when you have many independent pieces of state (panels, lists, status indicators).  
- React’s concurrent features become valuable only when you have heavy CPU work or need to interrupt rendering. For a desktop launcher they are usually overkill and add complexity.  
- Vue sits in the middle: good fine-grained updates + excellent tooling.

---

### 2. DOM interaction & rendering strategy

| Framework | DOM strategy | Reconciliation cost | Interaction with Ark/Zag |
|-----------|--------------|---------------------|---------------------------|
| **Svelte 5** | Compiler emits direct DOM operations | Lowest | Excellent – Ark Svelte uses runes; very little glue |
| **Solid** | Direct DOM (no VDOM) | Extremely low | Excellent – Solid has first-class Ark support |
| **Preact** | Lightweight VDOM | Low | Good – uses Zag Preact adapter (or Preact compat) |
| **Vue** | Optimized VDOM + block tree | Low–medium | Excellent – Ark Vue is mature |
| **React** | Full Fiber VDOM | Highest | Excellent – Ark React is the most used, but also the heaviest |

**Key source observation**  
Svelte 5 and Solid almost never create intermediate objects for simple updates. React creates fibers, effect lists, and update queues even for a single boolean flip. Preact is much closer to Svelte/Solid in cost than to React.

---

### 3. Store / external state integration (Nano Stores)

| Framework | Integration style | Extra runtime cost | Notes |
|-----------|-------------------|--------------------|-------|
| **Svelte 5** | Native store contract (`$store`) | Near zero | `$snapshot` just works. No extra adapter needed. |
| **Solid** | `@nanostores/solid` or manual `createSignal` bridge | Very low | Accessors map cleanly to Solid signals. |
| **Preact** | `@nanostores/preact` | Low | Uses Preact’s external store pattern. |
| **Vue** | `@nanostores/vue` or `ref` + `watch` | Low | Clean. |
| **React** | `useStore` + `useSyncExternalStore` | Medium | Correct but adds a subscription layer and potential tearing concerns (already solved by `useSyncExternalStore`). |

Svelte wins here for the controlled Nano Stores lane you already built.

---

### 4. Markup format & DX for large codebases

| Framework | Primary syntax | Large-app maintainability | Compiler / tooling maturity |
|-----------|----------------|---------------------------|-----------------------------|
| **Svelte 5** | `.svelte` (HTML-first + runes) | Very high for UI-heavy apps | Excellent (Svelte 5 is production-ready) |
| **Solid** | TSX / JSX | High if team likes React-style | Good, still smaller ecosystem |
| **Preact** | TSX / JSX | High | Smaller ecosystem than React |
| **Vue** | SFC (template + script) | Extremely high | Best-in-class tooling |
| **React** | TSX / JSX | Highest ecosystem, but more boilerplate | Highest maturity + ecosystem |

**Myth vs reality (2026)**  
The old “large apps use React/Vue, small apps use Svelte/Solid” is outdated.  
- Svelte 5 and Solid are now used in production apps with millions of users.  
- The limiting factor is no longer runtime size or reliability — it is **ecosystem depth** (component libraries, hiring, existing code).

For a new desktop tool (Epic-launcher / Codex style) that is mostly UI + local state + a few native bridges, Svelte 5 or Solid are often *better* than React today.

---

### 5. Ranking for your two hosts

#### A. WebView2 host (NeutronStar / Tauri-like, offline, size + reliability matter)

| Rank | Framework | Score | Why |
|------|-----------|-------|-----|
| 1 | **Svelte 5** | ★★★★★ | Lowest glue, best Nano Stores fit, excellent Ark, small runtime, compiler does the hard work |
| 2 | **Solid** | ★★★★☆ | Almost as small, pure signals, TSX if you want it, superb fine-grained updates |
| 3 | **Preact** | ★★★★ | Smallest declarative option, familiar JSX, good enough for most tools |
| 4 | **Vue** | ★★★☆ | Excellent DX and reliability, slightly larger than the top three |
| 5 | **React** | ★★☆☆ | Only if you need specific React-only libraries or existing team expertise |

#### B. Astro.js host (islands, partial hydration, content + light interactivity)

| Rank | Framework | Score | Why |
|------|-----------|-------|-----|
| 1 | **Svelte 5** | ★★★★★ | Perfect island citizen, tiny hydrated islands, official Astro integration is first-class |
| 2 | **Solid** | ★★★★☆ | Extremely good islands story, fine-grained |
| 3 | **Preact** | ★★★★ | Very common in Astro islands, small |
| 4 | **Vue** | ★★★☆ | Solid Astro support, but larger islands |
| 5 | **React** | ★★☆☆ | Works, but the heaviest island you can choose |

---

### 6. Final recommendation for your context

**For the NeutronStar-style WebView2 tool and for future Astro content sites:**

1. **Default / first choice → Svelte 5**  
   Best combination of size, reliability, Ark/Zag integration, Nano Stores fit, and existing team familiarity.

2. **Strong alternative → Solid**  
   If you prefer TSX and want the purest signal model. Extremely close to Svelte 5 for this use case.

3. **Keep Preact in the shortlist**  
   When you want maximum JSX familiarity with almost no cost.

4. **Vue** is still excellent and very safe for larger teams, but no longer the automatic winner over Svelte 5 / Solid for new desktop tools.

5. **React** only when a concrete React-only dependency or team constraint appears. The 200+ KB premium and extra complexity are real for a WebView2 host.

**Bottom line for production apps with many users (1 host per PC)**  
Svelte 5 and Solid are no longer “small-app only”. Their reliability and performance characteristics are production-grade. The old React/Vue default for “serious” apps is largely historical at this point for UI-heavy desktop tools.


**Short answer**

For **your** project (NeutronStar-style WebView2 tool + Astro content sites):  
**Svelte 5 remains the best default.**

For a large commercial product like Epic Launcher or a Codex-scale app with many engineers and heavy third-party integrations:  
**React (or Next.js) is usually the pragmatic choice** — and that is almost certainly why Epic picked it.

---

### Why Epic almost certainly chose React for Tauri

From public statements (Oct 2026):

- The new Epic Games Launcher v2 is **Rust + Tauri + React + WebView2**.
- Daniel Vogel (Epic) said the team did a **bake-off** of several frameworks and then picked the winner.
- They did **not** pick the technically lightest option. They picked the one that best matched their constraints.

Most likely reasons (ranked by probability):

1. **Team familiarity & hiring**  
   Epic is a large company. React developers are abundant. Svelte/Solid talent is much rarer.

2. **Existing component libraries / design system**  
   They almost certainly already had (or wanted) mature React component libraries, data grids, complex dialogs, charts, etc.

3. **Risk management**  
   React has the largest battle-tested ecosystem. For a product used by tens of millions of users, “we can hire more people next quarter” matters more than 150 KB of JavaScript.

4. **Bake-off winner under *their* criteria**  
   The bake-off almost certainly weighted maintainability, existing skills, and library availability higher than pure bundle size.

This is normal and rational for a company of Epic’s size. It does **not** mean React is technically superior for a small/medium tool.

---

### Svelte 5 / Solid vs React / Next.js — decision matrix (2026)

| Factor                        | Svelte 5 / Solid                  | React / Next.js                          | Winner for *your* tool | Winner for Epic-scale app |
|-------------------------------|-----------------------------------|------------------------------------------|------------------------|---------------------------|
| Runtime size & update cost    | Excellent                         | Good (but heavier)                       | Svelte/Solid           | React (acceptable)        |
| Fine-grained reactivity       | Native                            | Component-level (improving with Compiler)| Svelte/Solid           | Tie                       |
| Ecosystem depth               | Growing, covers essentials        | Vast                                     | React                  | **React**                 |
| Hiring / team scale           | Harder                            | Easy                                     | React                  | **React**                 |
| Complex component libraries   | Good but thinner                  | Best-in-class                            | React                  | **React**                 |
| Ark / Zag / headless UI       | Excellent                         | Excellent                                | Tie                    | Tie                       |
| Nano Stores / external state  | Cleaner                           | Good (`useSyncExternalStore`)            | Svelte                 | Tie                       |
| Astro islands                 | Outstanding                       | Heavier                                  | **Svelte/Solid**       | Less relevant             |
| WebView2 / Tauri fit          | Excellent                         | Good                                     | **Svelte/Solid**       | React (still fine)        |
| Long-term reliability         | Production-proven                 | Extremely proven                         | Tie                    | React (safer perception)  |

---

### Practical recommendation for you

**Keep Svelte 5 as the default** for:

- NeutronStar / Zodiac-style tools
- Any new Astro content + light interactive islands site
- Small-to-medium desktop apps where *you* (or a small team) own the code

**Switch to React only when one of these becomes true:**

1. You need a specific high-quality React-only library that has no good Svelte/Solid equivalent.
2. The team grows and hiring React developers becomes significantly easier than hiring Svelte/Solid developers.
3. You start sharing a large internal component library with other React projects.

**Solid** stays the strong #2 if you prefer TSX and pure signals.

---

### Bottom line

Epic choosing React for their Tauri launcher is **not** evidence that React is technically better for a WebView2 tool.  
It is evidence that **ecosystem + hiring + existing skills** still dominate at large company scale.

For the kind of application you are actually building right now, **Svelte 5 is still the right default**.


**Short answer:**  
For almost every WebView2 / Tauri v2 desktop app (including launchers), **React’s concurrent features are overkill and you should not design around them**.

They matter primarily for the biggest, most interactive *public web* applications that have:

- Thousands of concurrent users on the same page
- Heavy JavaScript main-thread work that must stay responsive
- Complex, continuously updating UIs (feeds, real-time collaboration, large virtualized lists with frequent updates)

A desktop launcher or tool running in WebView2 is a completely different environment.

### Why concurrent React is rarely useful in WebView2 / Tauri

| Factor | Public web (Facebook, Instagram, X…) | WebView2 / Tauri desktop app |
|--------|--------------------------------------|------------------------------|
| Number of users on the page | Thousands simultaneously | 1 user |
| Main-thread pressure | High (ads, tracking, many components, network) | Usually low–moderate |
| Need to interrupt rendering | Critical (keep typing/scrolling smooth) | Almost never critical |
| Background work | Lots of concurrent network + JS | Mostly local, controlled |
| User expectation | “Feels like a native app despite being a website” | “Feels like a native app” (and you control the whole process) |
| Cost of concurrent machinery | Acceptable because the alternative is jank | Extra complexity + larger runtime for little gain |

React’s concurrent model (lanes, time-slicing, `startTransition`, `useTransition`, Suspense for data, etc.) was designed to keep the browser responsive when the JavaScript thread is under heavy load from *many* competing updates. In a desktop WebView2 app you usually control almost everything that runs, so you can simply avoid creating that heavy load in the first place.

### Practical guidance for your stack

1. **Do not enable or rely on concurrent features** just because they exist.  
   Use normal synchronous updates unless you measure a real problem.

2. **If you ever hit jank** in a WebView2 app, the usual fixes are simpler and more effective:
   - Move heavy work off the main thread (Web Workers)
   - Virtualize long lists
   - Avoid unnecessary re-renders (Solid/Svelte do this more automatically)
   - Reduce the size of the component tree
   - Use `requestAnimationFrame` or simple batching yourself

3. **Tauri / WebView2 already gives you advantages** that make concurrent React less necessary:
   - You own the process
   - You can keep the UI simple
   - Native side can do heavy work
   - You are not fighting ads, third-party scripts, or unknown page weight

### When concurrent React *would* start to matter in a desktop app

Only in quite extreme cases, for example:

- A desktop app that embeds a full real-time collaborative editor with hundreds of live cursors and continuous presence updates
- A monitoring dashboard that receives thousands of data points per second and must keep the UI interactive
- Something that deliberately tries to feel like a heavy web SPA inside the desktop shell

Even then, Solid or Svelte 5 often handle the fine-grained updates with less ceremony than React’s concurrent model.

### Bottom line

For NeutronStar, Zodiac, a launcher, a Codex-style tool, or almost any normal Tauri v2 / WebView2 application:

- React concurrent features = **usually unnecessary complexity**
- They were built for the scale of Facebook/Instagram/X, not for a single-user desktop WebView
- Prefer simpler update models (Svelte 5 runes, Solid signals, or even plain React without concurrent patterns)

You can safely ignore the concurrent machinery unless profiling shows you actually need it.






Tauri v2 combined with Svelte (or SvelteKit) is an excellent and modern choice for building lightweight, fast, and resource-efficient Windows 11 desktop applications.

Key Advantages

• Tiny Bundle Sizes: Unlike Electron, which bundles its own Chromium browser and Node.js runtime (often 100 MB to 150 MB+), Tauri uses the system-native WebView2 built into Windows 11. This results in installers and app footprints as small as a few megabytes.
• Low Memory Footprint: Idle RAM usage typically sits around 20 MB to 100 MB, making it far more lightweight than web-tech alternatives.
• High Performance UI: Svelte’s reactive, compile-time architecture pairs smoothly with Tauri's high-speed Rust backend, which communicates safely with the operating system via a typed command bridge.
• Tauri v2 Features: Tauri v2 provides a mature, stable plugin system, fine-grained security capabilities, and support for multi-platform targets if you ever expand beyond Windows. You can find starter setups like the Tauri Svelte Template on GitHub or community-driven project scaffolds like the Tauri 2 + Svelte 5 + Shadcn Boilerplate.
https://github.com/frostybee/tauri-svelte-template

Considerations for Windows 11

• Styling & Fluent Design: Because WebView2 renders web code rather than native WinUI controls by default, matching Windows 11's Fluent Design (mica effects, custom window titlebars, scrollbars, and system theme integration) takes a bit of extra CSS/Tailwind work or specific styling libraries.
• Prerequisites: Development requires installing Rust, Node.js, and the Microsoft Visual Studio C++ Build Tools (Desktop development with C++) for compilation.
• Learning Curve: While writing the UI in Svelte is straightforward, writing native system logic or plugins requires basic familiarity with Rust.