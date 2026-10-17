# Frontend compatibility and benchmark checklist

Prepared 2026-10-16 from the supplied feedback, checked against host source and
upstream documentation. This is an **uncompleted acceptance template** for each
future frontend, not evidence that all nine planned builds work. The cohort is
eight framework frontends plus a vanilla HTML/CSS/TypeScript baseline.
See [the pre-implementation gate](FRONTEND-IMPLEMENTATION-PLAN.md) before starting.

Record frontend/version/lockfile, source revision, host executable hash, assets
hash inventory, compiler/SDK, actual runtime version/distribution, OS/hardware,
DPI/zoom, scenario and profile policy. Keep the native host, policy and bridge
contract identical across the compared variants. Praise or rankings in external
feedback do not establish independent review, strongest security or a winner.

## Host contract

The authoritative policy lives in `src/asset_policy.hpp` and resource handling in
`src/host_window.cpp`. Current response CSP:

```text
default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none';
img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'none';
frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

- Local external JS/modules and CSS; no inline executable scripts/handlers,
  eval/Function-based evaluation, data/CDN scripts, workers or remote UI assets.
- Use external CSS and class changes. Inspect generated DOM for `style`
  attributes and injected styles. **CSP is not a universal DOM-style detector:**
  direct JS assignments to individual `element.style` properties can behave
  differently from `setAttribute('style', ...)`. Project DOM policy still applies
  even if the browser emits no violation. See [style-src-attr behavior](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr).
- Same-origin GET of static files only, capped at 32 MiB per file. `connect-src`
  does not turn this resource handler into an API/WebSocket/EventSource service.
- Allowed served extensions: `.html`, `.js`, `.mjs`, `.css`, `.json`, `.txt`,
  `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.ico`, `.woff`, `.woff2`. Raw source,
  `.map`, WASM and other extensions are not served. This is a request allowlist;
  the host does not reject a whole directory just because it contains another file.
- Keep profile and asset trees separate, assets trusted/immutable, and no
  `WEBVIEW2_*` environment overrides. Record policy/runtime overrides outside the
  process too. No runtime bootstrap/download is performed by the host.
- Start with no router. Use hash routing for navigation tests, or explicit
  existing HTML files for a separately labeled multipage test. See [ROUTING.md](ROUTING.md).
- Native messaging is off by default. With `on_action` enabled, only exact
  encrypt/decrypt tokens and fixed statuses exist; no paths, secrets or general
  command payloads. The runner currently provides automated bridge smoke mode,
  not a general interactive synthetic-action switch.

## Production asset checks

- [ ] Follow [the shared UI design](UI-DESIGN.md): same Nova-style geometry,
  Neutral/Emerald tokens, local fonts and Lucide SVGs. No React compatibility
  runtime required just to obtain the look in another framework. Record any
  framework-specific primitive library as part of the measured stack.
- [ ] Shared Tailwind v4 recipes/classes are included in CSS generation; no
  missing dynamically assembled classes. For shadow DOM, verify style delivery.
- [ ] Font loading, script-specific fallback and icon geometry match; check text
  contrast, readable busy/error states and visible focus before performance runs.
- [ ] For each selected shared Ark/Zag control, follow the
  [Ark/Chakra and Base UI/Radix reference strategy](UI-DESIGN.md#reference-strategy-for-shared-zag-integration).
  Pin the machine/adapter, run the common behavior trace and record adaptations;
  no missing accessibility behavior or CSP relaxation in just one variant.
- [ ] Type-check independently of transpilation; compile framework/TypeScript
  source into browser JS and external CSS. Pin dependencies and retain notices.
- [ ] Root `index.html` and all referenced production chunks/assets exist. No
  reliance on Vite dev URLs, HMR, Node APIs or unresolved bare package imports.
- [ ] No CDN/remote/data assets required by the workload. With Vite, consider
  `build.assetsInlineLimit: 0` and `build.sourcemap: false`; inspect actual output
  because those settings do not remove manually embedded data URLs/inline code.
- [ ] CSS is extracted and emitted HTML has no executable inline bootstraps,
  inline handlers, style attributes or required injected `<style>` blocks.
- [ ] Exclude source/maps/node_modules/secrets from the deliverable asset tree.
  Maps may be retained separately for local development; disabling them is a
  packaging choice, not a requirement to make JavaScript execute.
- [ ] Check URL base against the actual entry path. Both root and relative Vite
  bases can work for root hash pages; neither provides a routing fallback.

## Runtime checks under the real host

- [ ] Page, modules, images/fonts, themes, conditional views and lazy chunks work.
- [ ] Exercise all states, not only startup; inspect DOM and collect bounded
  synthetic `securitypolicyviolation` evidence from an external fixture script.
  Production devtools are disabled, and numeric host events are **not** a complete
  CSP console. Do not widen the native bridge just to stream diagnostic content.
- [ ] Keyboard labels, visible `:focus-visible`, tab order, activation and dialog
  focus work. Test high contrast, reduced motion, Unicode/bidi and 100/150/200%
  scaling; expand to Narrator/NVDA and multi-monitor checks.
- [ ] Forms prevent native submission where relevant; use registered JS listeners.
- [ ] Navigation tests cover initial route, unknown hash, back/forward, reload,
  lazy-route assets and focus after view change. Verify missing `.js` stays 404;
  extensionless routes stay 403. Do not mistake `pushState` for reload support.
- [ ] Shared state survives route component replacement; a full reload safely
  returns to start when prerequisites are absent. Minimize/restore needs no storage.
- [ ] URL/history data cannot manufacture operation success or select sensitive
  files. Refresh/back/forward never automatically submits an action. Finish/reset
  prevents stale results from reappearing; no automatic storage/history snapshots.
- [ ] Record shared-core versus framework-native state variant. Initialize adapters
  correctly, unsubscribe on disposal and verify listener counts after remounts.
  See [state design](STATE-MANAGEMENT.md) and [route-state policy](ROUTING.md#passing-state-between-routes).
- [ ] Observe process-aware network and storage behavior separately. Blocking page
  requests is not proof of absent browser/OS traffic; a profile can still be written.
- [ ] Synthetic malformed/unknown/oversized/duplicate action tests pass where
  bridge testing is enabled; no operation starts when the busy gate is held.

## Framework-specific checks

| Frontend | Check before acceptance |
| --- | --- |
| Svelte 5 + Vite | Use normal production CSS extraction; compiler `css: 'external'` concerns component stylesheet output, not whether transitions, `style:` directives or other runtime code write style attributes. Inspect actual states |
| React | Prefer plain/extracted CSS or CSS Modules; `style` props and runtime CSS-in-JS need DOM/CSP assessment. Add React Router only for the navigation variant |
| Vue | Production SFC/scoped CSS can be extracted; inspect `:style`, transitions and conditional rendering. A passing dev server is not evidence |
| Solid | Inspect style bindings and component dependencies; prefer external CSS/classes |
| Lit | `static styles = css\`...\`` does not automatically emit an external file. Constructed/adopted sheets and fallback `<style>` paths need testing; explicit local stylesheet delivery is an option. Do not assume all runtime styling is rejected or all tagged CSS is safe |
| Preact | Same DOM/CSP checks as React; record whether compat or extra routing packages are included |
| Alpine.js | Use the separately supplied CSP build; ordinary Alpine 3 is not automatically eval-free. Inspect `x-show`, transitions and bindings for style mutation; avoid untrusted HTML insertion |
| htmx | Use static local GET fragments; plan `allowEval: false`, `allowScriptTags: false`, `includeIndicatorStyles: false`, external indicator CSS, `historyEnabled: false` and `historyCacheSize: 0`. Review style-settling attributes; avoid `hx-on`/JS-valued attributes and pathname pushes without a supported document mapping |

Sources: [Svelte compiler options](https://svelte.dev/docs/svelte/svelte-compiler#CompileOptions),
[Lit styling and external sheets](https://lit.dev/docs/components/styles/),
[Alpine CSP distribution](https://alpinejs.dev/advanced/csp),
[htmx security/configuration](https://htmx.org/docs/#configuration).
The htmx settings are requirements to implement/verify in the later fixture,
not claims of an already-tested configuration. Configure before initial processing;
do not introduce an inline configuration script that conflicts with this CSP.

## Comparable scenarios and profile policy

1. **Baseline:** same two buttons, same pure DOM/state response, messaging off;
   no router or native acknowledgment delay in just one variant.
2. **Optional navigation:** same views and hash route semantics; record router
   packages, retained/recreated views, route chunking and preloading strategy.
3. **Optional bridge:** same synthetic native callback and acknowledgment timing
   for every variant, separately labeled; no Go CLI/crypto.
4. **Failures:** missing allowed assets, disallowed MIME, invalid paths, external
   navigation, inline style/eval and malformed bridge messages where enabled.

Measure launch-to-visible/usable separately, interaction/render latency, whole-tree
memory/CPU/GPU, background states and exit. Internal native timestamps do not
establish first paint/input readiness. Hidden smoke windows are not rendering
performance trials. Use the detailed scenario protocol in `desktop-gui.md`.

**Do not use a fresh profile for every warm-start trial.** Fresh profiles belong
to the defined first-use scenario; cold machine/page-cache and fresh browser
profile are different variables. Warm-start scenarios deliberately retain the
initialized profile. Use per-variant isolated profiles, reset/clone state according
to the scenario, randomize order and record browser shutdown. Never persist real
messages or secrets as benchmark data.

| Sign-off item | Status / evidence |
| --- | --- |
| Production assets/type checks/dependency pins | Not run for this frontend |
| Runtime DOM/CSP, full exercised states | Not run |
| Single-page/hash route behavior | Not run for this frontend |
| Keyboard/AT/DPI | Not run |
| Optional bridge and failure cases | Not run |
| Process-tree timing/resources/network/storage | Not run |
| Same host/runtime/workload/profile policy | Record hashes/configuration |
