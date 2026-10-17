# Styling and recipes for the nine frontend implementations

Implementation update, 2026-10-17: the [workspace](../8-framework-test/README.md)
now builds one common Tailwind v4 stylesheet with local font/icon assets and
finite progress-size rules. No second CSS engine was added. The user approved
only bounded Zag dialog metadata and `pointer-events: auto` on the dialog content;
all other style restrictions remain. The notes below retain the design rationale.

Research/decision notes: 2026-10-16. The user selected **Tailwind + Ark** for the
UI direction. Ark is used where its framework implementation fits; tested
Zag-based integrations carry the same behavior to the other renderers. Native
HTML remains the semantic substrate and a deliberate fallback, not the primary
control strategy. All nine implementations should share the chosen UI behavior
and visual contract, subject to validation.

**Recommended styling baseline: Tailwind CSS v4, ordinary CSS custom properties
and shared class recipes, using CVA when typed/compound variants justify it.**
Use `clsx` where conditional class joining is needed; do not introduce a second
CSS generator just to obtain a recipe API. All of this remains frontend-side.
No package, stylesheet or recipe implementation is installed by these notes.

## Separate the responsibilities

| Layer | Responsibility | Proposed choice |
| --- | --- | --- |
| Control behavior | Focus, keys, open/checked state, dismissal and ARIA wiring | Ark packages where supported; Zag-based adapters elsewhere; native fallback only as specified in UI-DESIGN.md |
| Theme | Colors, typography, radii and other semantic tokens | External CSS custom properties and Tailwind v4 theme mappings |
| CSS generation | Produce styles used by markup | Tailwind v4 build-time output, plus small ordinary CSS rules where clearer |
| Component variants | Map `size`, `intent`, state and compound choices to classes | Shared typed maps initially; CVA for structured reusable recipes |
| Conditional class joining | Combine class names | `clsx` if needed; no style generation or behavior engine |

`clsx` is not a recipe/CSS compiler and does not resolve conflicting Tailwind
utilities. A recipe can return ordinary class strings in React, Svelte, Vue,
Solid, Lit, Preact, Alpine's external JS or an htmx/vanilla controller. Each app
still needs correct class binding and lifecycle behavior. Sources:
[Tailwind theme variables](https://tailwindcss.com/docs/theme),
[CVA](https://cva.style/), [clsx](https://github.com/lukeed/clsx).

## Comparison for this project

| Option | Framework independence / output | Fit for the current nine-implementation plan |
| --- | --- | --- |
| **Tailwind v4 + CSS variables + CVA/typed maps** | Generated CSS plus ordinary JS class selection; templates bind the resulting classes | **Recommended:** fits the selected visual system and avoids another extractor |
| **vanilla-extract + Recipes** | Framework-neutral CSS authoring in `.css.ts`, build-time CSS generation, typed runtime class selection | Strong alternative for a CSS-in-TypeScript design system; use instead of substantial Tailwind styling, or as a clearly bounded exception |
| **Panda CSS** | Static analysis generates CSS; typed tokens/recipes with framework-neutral output | Credible alternative to Tailwind, not required alongside it. Extraction configuration/static analyzability still matters |
| **StyleX** | Framework-agnostic core with compiler integration and class/style application APIs; custom-format frameworks may need configuration | Valid alternative with more integration work here; dynamic style-object paths need special attention under our DOM policy |
| **Pigment CSS** | Extracted CSS-in-JS; upstream currently describes alpha/on-hold status | Do not select as this new benchmark's styling foundation at the inspected status |
| **SCSS Modules + CSS variables** | Sass emits CSS; CSS Modules provides scoped names through tooling | Valid alternative; another compilation/scoping layer is unnecessary alongside Tailwind unless a concrete need appears |
| **Modern plain CSS + variables** | Direct browser CSS; no recipe/extractor required | Excellent common foundation and useful for rules that are clearer than utilities; more manual conventions/type checking than typed recipes |

There is no measured speed/RAM winner in this table. These are integration and
maintenance judgments for the already-selected Tailwind approach. Do not multiply
nine frontend implementations by seven styling stacks; a styling comparison would be a
separately controlled experiment with equivalent output/behavior.

Sources: [Panda architecture](https://panda-css.com/docs/get-started/why-panda),
[StyleX framework support](https://stylexjs.com/docs/learn/),
[Pigment upstream status](https://github.com/mui/pigment-css),
[Vite CSS Modules/preprocessors](https://vite.dev/guide/features#css-modules),
[Sass](https://sass-lang.com/documentation/).

## Are vanilla-extract Recipes agnostic?

**Yes.** `@vanilla-extract/recipes` defines base/variant/compound/default styles.
Styles are generated at build time; the resulting recipe function selects class
names at runtime. It does not require React and is distinct from CVA: Recipes
participates in vanilla-extract's CSS generation; CVA selects classes supplied by
the author. The runtime selector is not a runtime CSS-in-JS engine.
See [Recipes documentation](https://vanilla-extract.style/documentation/packages/recipes/).

For all eight frontends, its feasibility depends on the common **build output**:
compile `.css.ts` and distribute the CSS plus its class-selection JS; consume that
JS through each frontend's normal binding rather than expecting the browser or
C++ host to execute `.css.ts`. Static htmx fragments can contain the selected
classes generated at build time, or their external controller can select classes.
Shadow-root styling in Lit still requires explicit CSS delivery.

If building each frontend as an application, vanilla-extract supplies a Vite
plugin. If publishing/building UI Lite as a reusable compiled library, that
plugin's current docs explicitly say library builds are unsupported and direct
users to the Rollup integration. Prebuilding a shared package is therefore a
separate task from adding the Vite plugin to eight applications. See
[Vite integration and library-build caveat](https://vanilla-extract.style/documentation/integrations/vite/).

## CSP and benchmark requirements

- "Build-time/zero-runtime CSS generation" is not an automatic no-inline-style
  guarantee. For example, vanilla-extract's separate Dynamic package explicitly
  supports inline variable assignment; that is outside our baseline DOM policy.
  See [vanilla-extract Dynamic](https://vanilla-extract.style/documentation/packages/dynamic/).
- Choose finite class/data-attribute states for theme, size, intent, busy and error.
  Keep token definitions in external CSS; do not set per-element style variables
  from runtime values just because the styling tool supports it.
- Keep complete literal Tailwind class strings in scanned shared recipes. A
  runtime class selector cannot make Tailwind discover dynamically assembled
  utilities. Freeze the shared CSS inventory/hash for the controlled comparison.
- Define variants to avoid contradictory utilities; `clsx` is a joiner, not a
  Tailwind cascade/conflict resolver. Add a merge library only for an actual
  override requirement and include its cost consistently.
- Target Ark/Zag state attributes through shared selectors/classes. Inspect
  actual portal, positioning, scroll-lock and animation paths: a headless
  component can mutate styles independently of the chosen CSS generator.
- Confirm all component states, theme switching, fonts, RTL, high contrast and
  focus behavior. Preserve the current CSP and do not add a compiler/CDN/runtime
  style injector to the C++ host. Framework-specific build variants must extract
  production CSS; dev-HMR style behavior is not acceptance evidence.

## Implementation boundary

Keep one shared token file, class-recipe module, font/icon assets and agreed CSS
build artifact. Select exact packages/versions and retain licenses when the
frontend implementation starts. CVA/clsx remain proposed helpers, not installed
dependencies or performance claims. A tiny finite class map is sufficient until
compound variants make a helper useful.

Vanilla-extract Recipes is a good framework-neutral alternative; it is not
necessary to combine it, Panda, StyleX, Sass and Tailwind in this small project.
The native host and its existing lifecycle validation status are unchanged.
