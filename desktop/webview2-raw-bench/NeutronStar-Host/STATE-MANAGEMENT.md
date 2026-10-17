# Shared frontend state for the nine GUI tests

Implementation update, 2026-10-17: the [workspace](../8-framework-test/README.md)
implements the Nano Stores contract and pure transitions, with nine shared unit
tests and per-renderer subscriptions. Svelte uses its compatible store contract
directly; no `@nanostores/svelte` package is required. Shared source does not
guarantee identical CPU cycles or renderer scheduling. See the workspace
[validation record](../8-framework-test/VALIDATION.md); earlier notes below are
design history. htmx now passes the no-storage checks with an explicit pinned
offline patch; the original upstream failure is retained. Supplemental renderer
workloads use fresh store instances on panel remount, while the primary screen
retains its original singleton contract.

Design decision, 2026-10-16; the selected library has not yet been installed or
implemented. This concerns browser-side synthetic benchmark state, not a native
C++ store or the future Go operation protocol.

**Use Nano Stores as the shared state core for the controlled nine-frontend
lane**, subject to a small compatibility spike and exact version pinning. Its
vanilla atom/subscription API and upstream adapters cover most of this cohort;
htmx and vanilla can subscribe directly. Each app gets its own instance;
"shared" means common source/contract, not cross-window, cross-process or
cross-app memory. No host change is required. Keep the package to the core and
only the adapters each frontend needs; do not add persistence, router, async or
other optional packages.

The selection is based on adapter coverage and a small, composable API, not on
an assumed universal bundle-size win. Published size estimates vary with package
version, adapter choice, tree-shaking, minifier and gzip/brotli settings. Record
actual production bytes for the exact pinned builds; do not use approximate
upstream KB figures as benchmark results. Keep Zustand as a credible later
alternative when React ecosystem convenience matters more than broad framework
coverage.

### Signals and framework-neutral stores

Nano Stores and signals share the idea of small reactive values that can be
created outside view components. Their semantics are not interchangeable:
signals commonly track reads through framework/runtime effects, while Nano Stores
exposes explicit stores and subscriptions that framework adapters connect to
rendering. Preact Signals, Solid signals and other signal systems are useful
within their own renderers, but adopting each one in this nine-way controlled
lane would change the state/reactivity substrate between variants. Keep Nano
Stores for the shared lane; signals may be a separately labeled native-reactivity
comparison, not a replacement in only one app.

The Astro-islands example is relevant because Nano Stores can share state between
separate framework roots, but the current benchmark is nine separately built
single-framework apps. The decision here rests mainly on one common API and
available integrations across the candidate renderers, not on an assumption that
these apps themselves are Astro islands. Nano Stores documents adapters and its
store contract in the [upstream README](https://github.com/nanostores/nanostores).

Nano Stores is the best fit as a third option for this particular matrix: it has
official integration packages for React, Preact, Vue, Solid, Lit and Alpine, a
Svelte-compatible store contract, and direct vanilla use. The htmx case can use
the same direct subscription API with explicit swap cleanup. Adapter availability
and lifecycle behavior must still be verified for pinned releases. Sources:
[Nano Stores](https://github.com/nanostores/nanostores),
[Svelte store contract](https://svelte.dev/docs/svelte/stores#Store-contract).

Zustand's `createStore` vanilla API is sound and useful when React is the main
consumer, but it does not provide the same ready adapter coverage for this full
cohort. TanStack Store has a broad adapter model, but its current documentation
labels the project alpha; do not make it the controlled baseline while that is
the case. Revisit either only in a separately labeled store comparison or if a
Nano Stores compatibility spike finds a concrete blocker. Sources:
[Zustand vanilla API](https://github.com/pmndrs/zustand/blob/main/docs/reference/apis/create-store.md),
[TanStack Store status and adapters](https://tanstack.com/store/v0).

### Atomic stores: product guidance versus benchmark design

Nano Stores is designed around small atomic stores, derived `computed` stores,
explicit `batch()` updates and subscriber lifecycle hooks. Those features can
fit a real app with independent state domains and derived views; lifecycle hooks
can start/stop work while a store has listeners. The core source also has a
notification queue and batching logic. Zustand's vanilla core is a simpler
single object-store API with synchronous listener notification and immutable
replacement/merge behavior; describing it as a mutable store can be misleading.
Sources: [Nano Stores core README](https://github.com/nanostores/nanostores),
[Nano Stores atom implementation](https://github.com/nanostores/nanostores/blob/main/atom/index.js),
[Zustand vanilla implementation](https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts).

For the **controlled nine-frontend benchmark**, retain one immutable `BenchState`
snapshot in one Nano Stores atom, with named transitions in the shared domain
module. The workload changes related operation fields together, so splitting it
into several atoms would introduce cross-store batching and notification behavior
as another variable. Do not use `batch()`, `computed`, `effect`, `onMount` or
persistence in the baseline unless a fixture requires them; if introduced, declare
and measure them as part of the scenario. This keeps one shared state/action trace
and avoids overstating Nano Stores' atomic/fine-grained advantages from a test that
does not exercise them.

For a later **product application**, revisit state decomposition by domain:
independent preferences, view state, operation state and derived selectors may
deserve separate atoms. Keep side effects out of render components and attach
resource lifetimes deliberately. Store lifecycle hooks are not automatically the
same as desktop-window lifecycle, and should not start native work merely because
a view subscribed. Middleware/devtools/persistence are excluded from the current
offline benchmark; Zustand remains a reasonable choice if React-centric ergonomics
and its middleware ecosystem outweigh cross-framework adapter uniformity.

Nano Stores' upstream README publishes a minified-and-brotli size range and claims
tree-shaking, but actual output depends on imported core/adapters, build settings
and shared chunking. Treat those as upstream claims, not measurements here; report
the pinned production artifact's raw bytes and compressed-size estimate separately.

### Form state is a separate decision

Do not add a form-state library to the current nine-app baseline. Its input is a
read-only synthetic preview; the measured interactions are Ark/Zag control
behavior and simulated actions, not form validation or submission. If a later
product or separately labeled form scenario adds editable fields, evaluate
TanStack Form as a headless form-state option alongside the chosen Ark/Zag field
components; keep it distinct from Nano Stores, which owns app-level benchmark
state.

TanStack Form currently documents adapters for React, Preact, Vue, Angular,
Solid, Svelte and Lit. Alpine, htmx and vanilla would need direct `form-core`
integration or a project adapter, so it does not provide ready equal coverage
for all nine. The current `@tanstack/form-core` manifest also depends on
`@tanstack/store`; inspect and pin the resolved dependency/version and measure its
actual bundled cost before adoption. Thus the supplied recommendation is useful
for apps with real form workflows, but does not justify adding a second state
system to this UI-only comparison. Sources:
[TanStack Form framework adapters](https://tanstack.com/form/latest/docs/framework),
[TanStack Form core manifest](https://github.com/TanStack/form/blob/main/packages/form-core/package.json).

Statecharts are a separate modeling technique, not a competing everyday store.
If a later workflow has enough states and guarded transitions to justify a
formal machine, it could sit above the store or own that workflow explicitly;
the small synthetic ready/running/success/canceled flow does not need another
state-machine dependency. nanoUI is not selected: the proposed need is a state
core, not a bundled router/directive toolkit, and its maturity/compatibility
would need separate evidence before consideration.

Ark UI remains the selected direction for higher-level accessible controls where
Ark has a supported integration; Zag is the underlying state-machine layer and
a reference/integration path where Ark is unavailable. This is a separate layer
from application workflow state. Do not store dialog focus, combobox navigation
or menu dismissal in Nano Stores. The nine-test UI is intended to use Ark/Zag as
its primary shared control-behavior direction. Use Ark packages where supported
and a tested Zag adapter for other renderers; native HTML is the semantic
substrate and fallback where the selected inventory has no suitable Ark/Zag
control. These per-control states remain separate from Nano Stores' application
workflow snapshot.

## Minimal common contract to design later

This application/benchmark state core is distinct from control behavior such as
tab focus, menu selection or dialog dismissal. The proposed
[UI Lite behavior scope](UI-DESIGN.md#shared-control-behavior-proposed-ui-lite-scope)
uses Ark/Zag as the shared behavior direction with native semantic fallback; do
not turn one shared application store into a generic replacement for accessible
widgets.

```typescript
// Proposed interface only; not a shipped implementation.
interface BenchStore {
  getSnapshot(): Readonly<BenchState>;
  subscribe(onChange: () => void): () => void;
  dispatch(action: BenchAction): void;
}
```

`BenchState` and `BenchAction` should be small typed synthetic schemas: view,
counter, selected fixture ID and simulated operation state, with explicit reset.
Keep fixture generation, legal state transitions and action sequences identical.
Place transition rules and selectors in a small domain module above Nano Stores;
components dispatch named actions and do not mutate the underlying atom directly.
Use one immutable state snapshot/atom for this small workload unless the spike
shows a measured need for finer-grained atoms. Avoid duplicated derived state.
Keep route parsing and the optional WebView2 action transport in separate modules.
Do not add generic native calls, JSON serialization, persistence, devtools/history
recording, deep cloning of large fixtures or a general middleware ecosystem.

Define and test these semantics before implementation:

- One stable snapshot reference until state changes; new immutable snapshots on
  actual changes. TypeScript `Readonly` alone is not runtime/deep immutability.
- Defined no-op/equality behavior, listener order, notification timing and
  unsubscribe behavior. The controlled action trace must not rely on implicit
  batching; characterize the pinned library's actual notification timing and do
  not use explicit batch helpers in the baseline unless the same semantics are
  guaranteed and documented for every frontend adapter. No polling or hidden timers.
- Defined behavior for dispatch during notification and listeners added/removed
  during dispatch; prevent accidental unbounded recursive notifications.
- One document-level owner surviving route remounts, with reset/disposal and
  subscriber counts checked during repeated view cycles.
- Keep large fixture data stable across unrelated counter/view changes. Record
  selector granularity so only one adapter is not refreshing a large subtree for
  every action. Treat additional batching/selector experiments as labeled variants.

## Thin frontend adapters

| Frontend | Integration requirement |
| --- | --- |
| React | Use its external-store subscription API, stable subscribe/getSnapshot functions and cached immutable snapshots; do not invent a render-time subscription |
| Svelte 5 | Bridge to reactive component state or its store contract. A generic change-only subscription is not automatically a Svelte readable: its store contract supplies the current value immediately on subscribe |
| Vue / Solid | Bridge notifications to the framework's reactive primitive; initialize immediately and unsubscribe on disposal |
| Lit | Request component updates on notifications and release subscriptions on disconnection; handle reconnection without duplicate listeners |
| Preact | Use its supported external-store mechanism or an explicitly tested lifecycle adapter; do not assume every React API is available from every Preact entry point |
| Alpine CSP build | Use CSP-compatible external integration and component lifecycle cleanup, without eval or duplicated Alpine/core state owners |
| htmx / vanilla DOM | Use a small external JS controller to bind/store/render synthetic state; keep static fragment GET behavior separate and rebind after swaps without leaking listeners |

React documents stable/cached snapshots and cleanup requirements in
[useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore).
Svelte documents immediate subscription delivery in its
[store contract](https://svelte.dev/docs/svelte/stores#Store-contract).
The other rows are adapter requirements to implement and verify later, not claims
that a particular third-party adapter/package was tested here.

## What the experiment measures

| Variant | Question answered | Limit |
| --- | --- | --- |
| Common state core, thin adapters | How do these frontends render/respond to the same state/action stream? | Includes each adapter and a shared notification model; not a universal ranking of native reactivity |
| Framework-native state, same workload | What does an idiomatic small app in each framework cost to build/run? | State engines/scheduling differ as well as renderer code |

Use the common core as the controlled state scenario if adopted. Keep an optional
framework-native scenario separately labeled for DX/reactivity comparison; do not
mix the two in one results table or double-update through both state owners.
Declare the chosen scenario before measuring. The first simple DOM benchmark
does not require implementing both variants.

Before implementation, pin the Nano Stores core and the needed adapters, inspect
licenses/transitive dependencies and record their production bytes per frontend.
Do not claim that the shared-store lane measures native state-engine performance:
it measures each renderer plus its adapter against a common notification model.
Keep reset, subscription/lifecycle checks and identical action traces as
acceptance checks. If an adapter materially changes the contract or cannot satisfy
the strict CSP/lifecycle rules, record that as a compatibility result rather than
silently substituting another store in one frontend.

All of this state is in-memory by default, with no persistence middleware or
secret handling. Follow [ROUTING.md](ROUTING.md#passing-state-between-routes) for
reload, URL-state limits and Finish/reset. No cross-document recovery is provided.
