# Tauri starter compatibility inspection

Follow-up implementation: [NeutronStar Example](../NeutronStar-Example/README.md)
now provides a dependency-free adaptation of this UI and records Release/Debug
host checks. It replaces Tauri invocation with local JS and uses original local
drawings; the archived app itself is still not built/run unchanged. The inspection
and adaptation have distinct evidence scopes.

Inspected 2026-10-16: `../tauri-v2-app-template.zip`, read directly without
executing or changing the archive. Archive SHA-256:

```text
5C07535BA03E389E53165F1461FC73B8AD8A578EF53B9500CE121AA38EABBBA6
```

## Finding

**The host supports this class of simple local web interface. The Tauri starter
is not a drop-in app for this host.** Its rendering requirements fit the existing
resource/MIME policy; its Rust command integration must be adapted deliberately.
No host API expansion or general-purpose framework is justified by this example.

**TypeScript is supported as the frontend source language:** its compiled JS,
CSS and other production assets belong in the directory passed to `--assets`.
This is the intended contract for later TypeScript-based variants, not a reason
to execute raw `.ts` files in the browser or embed a compiler in C++. See the
[TypeScript build and dist contract](README.md#typescript-frontend-support).

This archive is a Vite + vanilla TypeScript starter, not one of the eight
framework implementations. Its `index.html` contains SVG logos, external links,
a name input, a submit button and a result paragraph. `src/main.ts` calls
`invoke("greet", { name })`; Rust formats the reply. CSS supplies flex layout,
hover effects, a transition and a dark-mode media query. Vite builds to `dist`.

| Template feature | NeutronStar support / required adaptation |
| --- | --- |
| HTML, external CSS, flex layout, hover and dark-mode query | Supported by the hosted WebView2 renderer; template CSS uses no inline style attributes or remote fonts |
| Root-relative SVG image URLs | SVG MIME and root-relative local paths are supported; retain the built assets in the output directory |
| TypeScript and bare `@tauri-apps/api/core` import | Build first; raw `.ts` is deliberately not served. Do not point `--assets` at the source folder |
| Built JS modules/chunks and stylesheet assets | Supported local resource types; load the production `dist` directory, not the Vite development server |
| Form submit handler with `preventDefault()` and `textContent` update | Compatible; native form submission is prohibited by CSP. Keep `preventDefault()` and use external script listeners |
| Rust `greet` / Tauri `invoke` | Tauri API is not emulated. The Vite/TypeScript NeutronStar Example uses a separately enabled bounded C++ test-greeting capability; encrypt/decrypt retain their fixed action/status protocol |
| Tauri global API and opener plugin | Not provided or required. Remove Tauri-only dependencies from each raw-host frontend |
| External documentation links with `target="_blank"` | Intentionally blocked. Remove them or keep equivalent inert content in every benchmark variant |
| Vite HMR / localhost port 1420 | Not part of measured execution. Build offline static output and run it through the host |
| Template `csp: null` | Does not match our enforced CSP. Keep our policy; align policy when comparing Tauri with the raw host |
| Template 800x600 window vs host 960x640 client defaults | Normalize physical client area, DPI, zoom, content and window state before comparison |

The starter CSS removes input/button outlines without supplying a keyboard focus
replacement. Do not copy that into the benchmark: retain a clear `:focus-visible`
indicator. Keep its viewport metadata and explicit labels/accessibility semantics
when designing the real fixtures; its placeholder alone is not a label.

## Boundary for the later eight tests

Use one compiled native runner and one runtime version across Svelte, React,
Vue, Solid, Lit, Preact, Alpine.js and htmx. Each variant supplies an equivalent
production static asset tree with local dependencies and external styles. The
host does not need to know which frontend generated those files.

1. First test rendering and local UI interaction with web messaging disabled.
   Make both buttons perform the same synthetic DOM/state update in each frontend.
2. If testing the native round trip, enable the same synthetic native callback
   and status handling for all variants, and measure it separately. The library
   supports `on_action`; the current runner enables acknowledgements only in its
   **automated bridge smoke mode**, not as a general interactive demo mode. Add a
   clearly labeled synthetic-action runner mode when building that scenario.
3. Remove `invoke("greet")`. The example now tests C++ with a separate opt-in
   greeting protocol (120-unit names, bounded replies, one request in flight).
   It preserves whitespace and empty input, replacing the Rust suffix with C++.
   Do not use that example-only capability to broaden encrypt/decrypt or transport
   passwords. Keep it disabled in the frontend rendering baseline.
4. Use production CSS extraction and inspect actual DOM/CSP violations. Runtime
   style injection, generated style attributes, eval, inline handlers and workers
   need explicit compatibility checks. In particular, verify Svelte/Vue build
   output, Lit style delivery, Alpine's CSP build/directives, and htmx's configured
   behavior with static same-origin GET fragments. Do not relax policy per variant.
5. Keep fonts, layout, row counts, animations, synthetic delays and completion
   criteria equivalent. The starter's decorative hover filters and `will-change`
   are workload choices, not mandatory host features or fair performance baselines.

Later Go work will sit behind the native callback and must remain asynchronous;
no Go CLI or password handling is needed to validate these frontends now.

## Evidence and limits

Inspection covered the archive's HTML, TypeScript, CSS, package/build config,
Tauri config, capabilities and Rust command registration. Existing executed host
checks cover modules, stylesheet application, local fragment requests, Unicode,
CSP enforcement and the optional native action/status bridge; see
[VALIDATION.md](VALIDATION.md). The inspected MIME allowlist includes the starter's
HTML, compiled JS, CSS and SVG asset types; the exact starter output was not tested.

**The archived app was not installed, built or run, and its exact logo rendering,
hover effects, native form interaction and eight-framework output were not
validated by this inspection.** There is no Tauri API compatibility claim. The
finding is that no missing host primitive was identified for the proposed simple
two-button experiment, subject to production-output/CSP and UI checks when each
frontend is implemented. Keep the original archive unchanged as reference.
