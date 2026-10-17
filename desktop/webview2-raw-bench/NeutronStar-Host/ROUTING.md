# Routing decision for the local frontend benchmarks

Researched 2026-10-16. **Keep the native host unchanged: no router for the basic
two-button workload; hash routing for a separately labeled navigation scenario.**
Hash routing is supported modern functionality, not a universal best practice
for every website. It fits this desktop host because there is no route rewrite
service, public URL/SEO requirement or server runtime. Keep route names synthetic;
never put messages, passwords, private-key contents or sensitive paths in URLs.

## The choices

| Approach | Behavior | Fit here |
| --- | --- | --- |
| Component state / tabs, no router | Swaps views without changing the URL | Simplest baseline; avoids measuring different routing stacks unintentionally |
| Hash router | `/index.html#/stress` still loads `index.html`; JS interprets the fragment | Recommended navigation variant; refresh does not require a native route rewrite |
| Memory router | Router history stays in JS memory | Valid if refresh/deep-link restoration is deliberately unnecessary; label separately |
| History/pathname router | JS can navigate to `/stress`; refresh requests that pathname | Requires actual matching files or an explicit host document mapping/fallback |
| Static multiple HTML pages | Navigation requests each built HTML file | Supported with explicit paths; this is a different full-document navigation workload |

Hash routing and root-relative asset paths solve different problems. Assets live
under the document origin/path, not under the fragment route. Vite `base: '/'`
fits the current root-mounted origin; `base: './'` is also reasonable for a
root-level entry with hash routes. Neither adds history fallback. Nested physical
entry pages require checking their relative paths. See [Vite public base paths](https://vite.dev/guide/build#public-base-path).

## Framework distinctions

| Technology | Current documented capability | Benchmark recommendation |
| --- | --- | --- |
| React + React Router | v8 documentation provides `HashRouter` and `createHashRouter`, as well as browser/memory routers | Plain React state first; use a supported hash API if testing navigation. Do not add Framework Mode/SSR just for two buttons |
| Svelte + Vite | Svelte components and Vite build tooling do not by themselves select a router | Plain Svelte 5 state first; a frontend hash adapter can be chosen later if needed |
| SvelteKit | `kit.router.type: 'hash'` is documented; pathname is the default. Hash mode disables SSR/prerendering and requires `#/` links | Optional separate Kit variant; do not turn the baseline Svelte test into a Kit test accidentally |
| Astro | File-based static pages, with configurable HTML output format | Not one of the eight component baselines; explicit generated HTML paths need no SPA router |
| Tauri v2 | Hosts frontend output; frontend routing remains a frontend/build choice | Match the same route/workload when comparing hosts; Tauri is not a routing library to reproduce in C++ |

React Router's inspected current documentation identifies **8.4.0**; both hash
APIs remain documented. Pin the actual chosen package/lockfile at implementation,
rather than treating this research version as an installation instruction.
Sources: [React Router changelog](https://reactrouter.com/changelog),
[HashRouter](https://reactrouter.com/api/declarative-routers/HashRouter),
[createHashRouter](https://reactrouter.com/api/data-routers/createHashRouter).

SvelteKit's documented hash mode is available since 2.14.0; that is distinct from
plain Svelte. Tauri's SvelteKit guide instead illustrates a static adapter with
an `index.html` fallback and SSR disabled. Creating that file does not configure
our raw host to return it for arbitrary URLs. Sources:
[SvelteKit router configuration](https://svelte.dev/docs/kit/@sveltejs-kit-vite#router),
[Tauri's SvelteKit guide](https://v2.tauri.app/start/frontend/sveltekit/).

Astro's default directory output can emit `/about/index.html`; file output can
emit `/about.html`. Our host serves those **explicit filenames**, but does not
expand `/about` or `/about/` into them. Generated links and inline bootstraps/styles
still need CSP checks. Do not change the hosted Zodiac Astro architecture based
on this separate desktop benchmark. See [Astro output formats](https://docs.astro.build/en/reference/configuration-reference/#buildformat).

## Exact current resource behavior

| Request | Result under the current host |
| --- | --- |
| `/` | Maps to root `index.html`, if present |
| `/index.html#/basic` | Loads that HTML; fragment is for the frontend |
| `/about.html` or `/about/index.html` | 200 if the allowed file exists; otherwise 404 |
| `/about` | 403: no allowed MIME extension, even if `about/index.html` exists |
| `/about/` | 403: trailing empty path segment; no directory-index expansion |
| Missing `/assets/chunk.js` | 404; never substituted with HTML |
| Disallowed extension, method, foreign origin or invalid path | 403 where handled by the resource policy; navigation may be canceled before a request |

`history.pushState()` can appear to work because it does not itself request a
document. That is not proof that refresh, direct navigation or reconstruction
works. Hash routing avoids that native mapping dependency. Hashes do not add
authorization or secrecy; the frontend must handle unknown route names safely.

## Passing state between routes

Prefer a **shared in-memory store above the routed views**. A hash navigation
usually keeps the document alive, but component-local state can still disappear
when the component unmounts. Use an application-root/provider or document-scoped
module whose lifetime spans the views. Framework-native state and a common vanilla
store are both options; the proposed cross-frontend contract is in
[STATE-MANAGEMENT.md](STATE-MANAGEMENT.md).

| Mechanism | Lifetime / role | Benchmark policy |
| --- | --- | --- |
| Shared JS memory | Same document, provided the owner survives component replacement | Default for synthetic selections, step, status and bounded fixture data |
| Hash route / parameters | Part of the URL, retained on reload and visible to page code/history/tools | Allowlisted synthetic view names/flags only; no sensitive filenames/paths, content, keys, passwords or real operation identifiers |
| Router history state | Browser-managed navigation state, not a framework store | Do not serialize sensitive selections or payloads here; unnecessary for the baseline |
| `sessionStorage` | Origin plus top-level browsing-context page session; normally survives reloads | Only a separately labeled future non-sensitive recovery experiment |
| `localStorage` | Normally origin-persistent, with different private-mode retention | Optional future non-sensitive preferences after explicit persistence design; not baseline storage |

**"Soft navigation" and "reload" are different.** A route/component update may
preserve the store. `location.reload()` or browser refresh starts a new JS
application, even when resources are cached, and loses the store. Minimize/restore
does not ordinarily replace the document and requires no storage recovery.

`sessionStorage` has page-session semantics, not a guaranteed native-process
lifetime or a promise that bytes always live in a specific profile file. Logical
clearing is not secure disk/memory erasure; reads/writes can also fail. See
[sessionStorage scope and lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).

The current host explicitly selects **InPrivate**. Do not promise restart-persistent
preferences through its `localStorage`; a named profile directory does not make
it a normal persistent session. Browser/OS metadata may still be written.
References: [localStorage private-mode behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
and [WebView2 user-data folders](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/user-data-folder).
Persistent theme/language settings would be a separate, narrowly defined feature,
not a reason to change private mode for a route test.

### Route guards, reload and Finish/reset

- Treat the hash as a requested view, not authority or an operation receipt.
  `#/result?status=ok` must not manufacture success. Even an opaque `id` can carry
  context or capability; do not put real operation handles in URL examples.
- Missing in-memory prerequisites after refresh/direct entry should return the
  UI to the synthetic start/choose step with an explanation. History navigation,
  re-entering a view and reload must not automatically execute an action.
- A later native Go operation may outlive a renderer document. Resetting JS does
  not cancel it or release the native busy gate. Reconnection, operation IDs,
  cancellation and stale completions belong to the separately reviewed future
  protocol; the current fixed-token bridge does not implement recovery.
- Finish/reset should release owned selections, transient state, subscriptions
  and timers; clear owned byte buffers where appropriate. Reset references and
  closing a window do not guarantee erasure of JS strings or browser/OS copies.
- If a separately enabled recovery experiment uses storage, remove its own
  namespaced keys on Finish, rather than indiscriminately clearing unrelated
  preferences. Replacing the current hash does not erase all prior history.
- Test route changes/unmounts, back/forward after Finish, minimize/restore, full
  reload and unknown/stale direct routes. Keep automatic Web Storage, IndexedDB
  and history snapshots out of the baseline; all fixture data remains synthetic.

These are requirements for future frontends, not implemented stores, route guards
or persistence. The existing routing smoke reloads using a synthetic hash marker
and no storage.

## When to add pathname support

Only if a later real application needs it. Define a separate, explicit option
and test a bounded route manifest or equivalent document-only mapping. Preserve
origin/method/path validation, prioritize real assets, and never return the entry
HTML for missing JS/CSS/JSON, fragment fetches or malformed paths. Distinguish full
document navigations from subresource requests. Test direct entry, reload,
back/forward, nested chunks, unknown routes and failure statuses before use.
An explicit static route-to-HTML mapping is also possible without catch-all SPA
fallback. None of those features is implemented by this decision.

Do not relax the host per frontend. If pathname support is later added, freeze a
new common host version and rerun the affected compatibility/benchmark evidence.

## Routing smoke coverage

`tests/fixtures/smoke/routing.html` and `routing.mjs` exercise the existing host,
not React Router or SvelteKit: local CSS/dynamic import, hash changes, back/forward,
full reload with fragment reconstruction, explicit-file GETs and no-fallback
statuses. They also show that `pushState` does not create a document resource.
There is no storage, real crypto or Go integration. The case is included in
`Test-Host.ps1`; executed outcomes belong in [VALIDATION.md](VALIDATION.md).
