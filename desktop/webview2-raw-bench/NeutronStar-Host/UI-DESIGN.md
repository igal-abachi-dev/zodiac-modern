# Shared UI design for the nine frontend tests

Implementation update, 2026-10-17: see the [nine-app workspace](../8-framework-test/README.md).
Ark public hooks/props and Zag adapters now implement the shared dialog/progress
composition. Actual spikes required the user-approved three-declaration dialog
CSSOM exception documented there; host CSP remains unchanged. All nine candidates
pass current checks with the documented htmx no-storage patch. Earlier unimplemented
statements below describe the original design stage, not current workspace status.

Decision: 2026-10-16. Per the user's direction, all nine implementations should have a
modern shadcn-style interface. **Share the visual system through Tailwind CSS v4
and framework-neutral assets; where shadcn React components cannot run, implement
equivalent controls with the same Tailwind design.** Do not embed React inside
the other tests to obtain the look. No UI or dependency is implemented here yet.

## Selected baseline

| Choice | Selection | Reason / constraint |
| --- | --- | --- |
| Component style | **Nova** | Compact spacing suits a small desktop utility; retain comfortable controls and visible focus rather than maximizing density |
| Base palette | **Neutral** | A quiet surface palette shared across light/dark themes |
| Accent theme | **Emerald** | Clear action emphasis against neutral surfaces; actual foreground/background and focus contrast must be verified |
| Primary font | **Inter**, local WOFF2 | Readable UI typography; identical font files, weights and sizes across variants |
| Script coverage | Local **Noto Sans Hebrew** where needed; fixed recorded emoji fallback | The multilingual fixture must not depend on different accidental system fallback per frontend; confirm exact font coverage and shaping |
| Icons | **Lucide**, one pinned icon set | Same SVG geometry, viewBox, size and stroke width across variants |
| Styling | **Tailwind CSS v4**, build-time only | Shared semantic tokens and extracted local CSS; no browser CDN compiler |
| UI behavior | **Ark UI + Zag-based integrations** across the cohort; native HTML as the semantic substrate/fallback where no suitable Ark/Zag control exists | Keep the chosen controls, visuals, keyboard/focus behavior and accessibility contract equivalent |
| Window | Existing standard native chrome, 960x640 DIP baseline | Keep desktop behavior/viewport fixed; no Mica/blur or custom title-bar cost in just one frontend |

These are our design selections, not claims that Nova or Emerald benchmarks faster.
New York, Lyra, Mira, Zinc, Mist, Green, Cyan, Indigo, Geist and Noto Sans as a
primary family remain alternative designs, not extra factors in the initial
nine-implementation matrix. Freeze one design before measurement; if evaluating another,
apply it to all variants in a separately labeled run.

Shadcn's official style announcement describes Nova as reduced padding/margins,
Lyra as sharp/boxy and Mira as dense. Its theming docs use semantic CSS variables
and include a `base-nova`/Neutral configuration example. We adopt a common design
contract, not that React-specific configuration file in every app. Sources:
[shadcn styles and component bases](https://ui.shadcn.com/docs/changelog/2025-12-shadcn-create),
[theme tokens/base colors](https://ui.shadcn.com/docs/theming).

## Framework-neutral implementation contract

The user confirmed **Tailwind + Ark** as the primary UI direction across all
nine tests. Use Ark's supported framework packages where available and tested
Zag-based integrations for renderers without an Ark package; native HTML supplies
the semantic substrate and is a deliberate fallback where no suitable Ark/Zag
control exists or native behavior is the better fit. Do not treat native-only
controls as the default UI strategy. The
[styling comparison](STYLING.md) recommends Tailwind v4 + CSS variables with shared
class recipes (CVA when useful), and explains vanilla-extract Recipes' portable
alternative. No second CSS generator or package is installed by that decision.

1. Define shared semantic CSS tokens for background/foreground, card, muted,
   primary/foreground, destructive, border, input, focus ring and radii. Keep
   light/dark values in external CSS selectors; theme switching changes a class,
   not inline styles or persisted preferences. Exact token values remain to be
   reviewed and frozen during frontend implementation.
2. Use shared Tailwind class recipes and component dimensions: same Ark/Zag-backed
   control inventory, fields, status area, cards, spacing and typography.
   Components may use each framework's syntax while rendering equivalent
   semantics/content. Complex dialogs need matching focus trapping/restoration,
   Escape and keyboard behavior.
3. Build the shared CSS from the common recipes/static class inventory for the
   controlled baseline, with its hash and byte count recorded. If per-framework
   CSS generation is measured instead, label that variant and disclose size
   differences. Ensure Tailwind scans shared code and HTML fragments; avoid
   dynamically assembled class names that the build cannot detect.
4. Use the same pinned local font/icon assets in every output. Import only used
   icons, or distribute the same trusted SVG assets to every variant. Do not add
   framework-specific icon runtime costs silently. Decorative icons get suitable
   hiding; icon-only buttons still need accessible names. External SVGs avoid
   injecting styles, remote references or untrusted artwork.
5. Keep logic in the proposed common state/action contract and rendering in each
   frontend. For Lit, handle external stylesheet delivery into shadow roots or
   explicitly document a light-DOM strategy; document-level Tailwind CSS does not
   automatically style inside a shadow root. Account for duplicated sheet bytes
   and loading if used.
6. No Go CLI, actual crypto, real secrets, persistence, telemetry, network assets
   or host changes are needed for this visual system. Preserve the existing
   left Decrypt/right Encrypt layout and equivalent synthetic workloads.

Tailwind documents generating static CSS from source/templates and offers Vite,
PostCSS and CLI integration, so it is not limited to React. Inter and Noto fonts
must be packaged with their applicable licenses, versions and hashes. Sources:
[Tailwind installation/build options](https://tailwindcss.com/docs/installation/framework-guides),
[Inter](https://rsms.me/inter/), [Noto font sources](https://github.com/notofonts/noto-fonts),
[Lucide vanilla support](https://lucide.dev/guide/lucide).

## Base UI, Radix UI or Headless UI?

These are behavior implementations, distinct from the common visual theme. They
are not a universal runtime for all eight frameworks.

| Candidate | Scope / role | Decision for this project |
| --- | --- | --- |
| **Base UI** (`@base-ui/react`) | Unstyled React components, compatible with Tailwind; distinct from styled Material UI and legacy `@mui/base` | Preferred reference if a later React product/explicit React component-library variant uses shadcn primitives. Exact used components still need CSP/DOM/AT checks |
| **Radix Primitives** | React primitives; another supported shadcn base | Valid alternative when its exact APIs/components fit better; no need to compare two React bases in the initial eight-renderer test |
| **Headless UI** | React/Vue implementations | Useful where its particular component fits, but not a mandatory common base and not a shadcn style preset |
| Framework-specific ports | Separate implementations; e.g. shadcn-svelte documents Bits UI, and Vue has its own ecosystem | Optional component-library/DX variants; do not assume identical preset availability, dependency cost or CSP behavior |
| Tailwind + Ark/Zag behavior integrations | Shared control intent and appearance, framework-specific rendering/adapters | **Primary direction across all nine**; use Ark wrappers where supported and tested Zag integrations elsewhere |
| Native HTML semantics | Ubiquitous accessible substrate and fallback | Use when a suitable Ark/Zag behavior is absent or native behavior is the deliberate better fit |

Sources: [Base UI](https://base-ui.com/react/overview/about),
[Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction),
[Headless UI](https://headlessui.com/),
[shadcn-svelte/Bits UI](https://www.shadcn-svelte.com/docs),
[shadcn/vue](https://www.shadcn-vue.com/docs/introduction).
Framework-specific wrappers are not "the same component library" merely because
they share branding or appearance. If using them, report renderer + UI dependency
stack, rather than attributing the whole result to the renderer alone.

No headless library is automatically accepted under this host's policy. Portals,
positioners, scroll locks, animation utilities and CSS variables may write styles
at runtime. Check all open/closed/disabled/error/loading states, not just imports.
Adapt the selected components while preserving behavior, or use simpler semantic
controls; never loosen CSP for only one frontend.

## Shared control behavior: proposed UI Lite scope

Base UI remains a **React-specific product/extra-variant reference**, not the
behavior engine for all eight. If "Aria UI" means Adobe's React Aria, that is
React-specific too; ARIA itself is a web accessibility standard, not an engine.
See [React Aria](https://react-aria.adobe.com/).

**Direction: use Ark UI as the primary component layer and Zag machines/adapters
to carry the shared control behavior across all nine renderers. Use native HTML
as the semantic substrate and for deliberate fallback cases. Do not extract and
combine internals from multiple framework component libraries.**
Extraction creates a fork whose keyboard/focus, event, accessibility and lifecycle
behavior we must maintain. Retain licenses/notices and source provenance if any
code is reused; upstream accessibility claims do not validate our modifications.

| Option | Cross-framework fit | Decision |
| --- | --- | --- |
| Base UI / Radix / React Aria | React implementations | References or separately measured React stacks |
| Headless UI | React/Vue implementations | Not a common dependency for all eight |
| Zag.js | Interaction machines with framework adapter architecture | Behavior layer for the cohort where Ark has no package; each adapter still needs validation |
| Ark UI | Zag-based React, Vue, Solid and Svelte components | Preferred component layer where supported; pair with tested Zag integrations for remaining renderers |
| Native HTML | Available in every frontend | Semantic substrate and deliberate fallback, not the primary shared control strategy |

Zag documents per-control machines and building framework adapters. Ark documents
four framework implementations. Lit, Preact, Alpine and htmx integration still
requires deliberate adapter/lifecycle work and tests. Sources:
[Zag overview](https://zagjs.com/overview/introduction),
[adapter guide](https://zagjs.com/guides/framework-adapters),
[Ark upstream](https://github.com/chakra-ui/ark).

### Fit versus implementation quality and production maturity

"Framework-agnostic" and "styling-agnostic/headless" are different. Base UI's
official overview explicitly identifies a React library; Radix Primitives documents
React packages. Their absence of default CSS does not make those components usable
unchanged in Svelte/Lit. The styling tokens can be portable while behavior wiring
depends on React. Zag deliberately exposes a framework-neutral machine layer.

**No source audit, comparative defect study or performance/accessibility trial
establishes that Zag has better internals than Base UI or Radix. No replacement
of an existing working Base UI/Radix app is recommended.** The reason to evaluate
Zag here is the unusual requirement to reuse behavior across eight frontends,
not superiority of state machines over other implementation techniques.

Zag is a credible production-use candidate: the inspected docs show a 1.x line,
the upstream repository describes Playwright behavior tests, and Ark UI identifies
it as its underlying machines and lists Chakra UI v3 among downstream users.
These are upstream ecosystem/testing claims, not independent certification. Some
Zag components are explicitly marked Beta; readiness must be assessed per chosen
control/version. Sources: [Zag source/adapter inventory](https://github.com/chakra-ui/zag),
[Zag documentation](https://zagjs.com/overview/introduction),
[Ark architecture and ecosystem](https://github.com/chakra-ui/ark).

The current Zag upstream README also lists **Preact and vanilla adapters** in
addition to React/Vue/Solid/Svelte. Use those supported entry points when present
in the pinned release instead of assuming every adapter must be written locally.
The README's moving `main` inventory is not a pinned-package verification. Lit,
Alpine and htmx still need their actual integration/cleanup tested; adopting a
production library does not automatically validate our adapters or strict DOM policy.

For a React-only product, Base UI or Radix may require substantially less custom
integration than a shared eight-framework layer. Keep that product decision open.
For NeutronStar, **Ark/Zag is the primary shared-control direction in the
benchmark**, not only a later complex-control option. The exact initial component
inventory remains to be frozen; this does not select all 20 candidate controls
or claim they are installed or validated under the host CSP. Verify each chosen
control, framework integration and pinned package before use.

### Ark + Tailwind versus direct Zag and Chakra

For each selected control, **prefer Ark's ready component API with Tailwind** in
React, Vue, Solid and Svelte before writing a custom Zag wrapper. For Preact, Lit,
Alpine, htmx and vanilla, use a pinned Zag machine with a deliberately tested
adapter/integration that preserves the same behavior. Ark does not provide those
framework component packages directly. See [Ark UI](https://ark-ui.com/).

Use the Ark/Zag path in the common benchmark for the frozen control inventory;
native controls are used where the inventory assigns them as a fallback. Prefer
Ark's ready component APIs where supported and use Zag integrations where Ark
lacks a suitable framework package. Align machine versions/configuration and behavior traces where possible, inspect
resolved dependencies, and count the different adapter/wrapper costs. The same
underlying machine does not imply identical bundle size, scheduling, markup or
measured performance. If host policy cannot be met without losing behavior,
leave that variant unaccepted rather than loosening CSP for one implementation.
The direction is selected; no dependency is installed and no component has yet
passed the host compatibility checks.

**Correction to the supplied Chakra styling claim:** current Chakra UI v3 is not
already a Panda CSS zero-runtime implementation. Its inspected 3.37.0 installation
guide explicitly states that it uses Emotion at runtime and describes a
Panda-inspired zero-runtime model as a longer-term direction. Its package manifest
requires `@emotion/react`, and its style factory uses Emotion serialization/cache
insertion. A Panda-related utility dependency or similar recipe API does not make
the styling engine Panda CSS. Sources checked 2026-10-16:
[Chakra installation/styling roadmap](https://chakra-ui.com/docs/get-started/installation),
[package manifest](https://github.com/chakra-ui/chakra-ui/blob/main/packages/react/package.json),
[style factory](https://github.com/chakra-ui/chakra-ui/blob/main/packages/react/src/styled-system/factory.tsx).

Chakra remains a useful composition/product reference, but importing its styling
runtime alongside the shared Tailwind system has no demonstrated benefit for
this experiment. Ark is unstyled, not an automatic accessibility or CSP pass;
validate the selected controls and adapter behavior in the actual host.

### Reference strategy for shared Zag integration

The user's agreed strategy is to learn usage/composition from **Ark/Chakra** and
cross-check behavior/API expectations against **Base UI, Radix and WAI-ARIA APG**.
This is reference-driven integration, not extracting and merging their engines.
Zag remains subject to the compatibility spike before adoption for complex controls.

The precise modern relationship, demonstrated by the inspected dialog source, is
**Chakra's styled React component -> Ark UI -> Zag machine + framework adapter**.
Chakra's dialog imports Ark's dialog and adds styled composition; Ark's hook
creates a Zag dialog machine and connects it through its React adapter. This is
evidence for that component/version path, not a claim about every historical
Chakra component. Sources read 2026-10-16 on moving `main`:
[Chakra dialog composition](https://github.com/chakra-ui/chakra-ui/blob/main/packages/react/src/components/dialog/dialog.tsx),
[Ark dialog machine wiring](https://github.com/chakra-ui/ark/blob/main/packages/react/src/components/dialog/use-dialog.ts).
Pin exact commits/packages before implementation reuse; no source was copied here.

| Reference | What to learn / retain |
| --- | --- |
| Zag machine docs and supported adapters | Version-correct props/events, machine lifecycle, connect/normalize APIs and supported integration points |
| Ark UI | Thin adapters, controlled/uncontrolled props, stable IDs, root-node/direction context, refs, cleanup and compound control composition |
| Chakra UI | Ergonomic product-facing wrappers, slot anatomy, variants and composition; translate appearance to our external Tailwind recipes rather than importing its styled runtime |
| Base UI / Radix | Independent behavioral references for focus, keyboard, dismissal, disabled states and event composition; document differences rather than assuming interchangeable APIs |
| WAI-ARIA APG and native HTML | Baseline semantics, expected keyboard patterns and accessible relationships; resolve choices into one explicit control specification |
| Our WebView2 checks | Actual CSP/DOM, Windows keyboard/AT, DPI/RTL and lifecycle evidence for the chosen implementation |

Use [Zag's adapter guide](https://zagjs.com/guides/framework-adapters) and supported
release adapters first. A reference's default lazy mounting, unmount-on-close,
portal or animation policy is a choice to normalize, not a setting to copy into
only one frontend. Account for shadow roots and htmx fragment replacement without
leaking handlers or sharing mutable control instances between app roots.

For each adopted complex control:

1. Write a small behavior specification and common interaction trace: initial
   state, focus entry/exit, keys, pointer activation, dismissal, busy/disabled
   behavior, labels, RTL and controlled updates. Use synthetic data only.
2. Map that contract to one pinned Zag machine and the appropriate adapter. Keep
   framework render ownership, event/ref semantics and disposal explicit; do not
   strip accessibility effects merely to make props easier to spread.
3. Apply the shared Tailwind tokens/recipes and equivalent DOM semantics. Verify
   actual style mutations, portals and scroll locking under the host policy.
4. Run the same behavioral/AT/remount checks in all nine variants. Compare
   Base UI/Radix behavior as a useful reference, not proof of identical defaults
   or a requirement to duplicate framework-specific implementation details.
5. Record adaptations, source/license provenance, dependencies and unresolved
   differences before benchmarking. Missing behavior is not a performance win.

This plan adds no React/Chakra runtime to other frontends and no native host API.
It does not claim all nine integrations, accessibility or CSP compatibility have
passed. Native-semantic fallbacks remain available where specified.

### Practical 20-control roadmap

This is a project shortlist, not a measured popularity ranking or a requirement
to build 20 controls before the benchmark. Include only exercised controls in the
baseline bundle; add others incrementally when needed.

| # | Control / pattern | Initial behavior direction |
| --- | --- | --- |
| 1 | Button / icon-button | Native button, explicit type, disabled state and accessible name |
| 2 | Labeled input / validation field | Native input, label/help/error associations |
| 3 | Textarea | Native editing, selection, IME and bidi |
| 4 | Checkbox | Native checked/indeterminate state |
| 5 | Radio group | Native same-name inputs and fieldset/legend |
| 6 | Simple select | Native select; searchable listbox is a separate feature |
| 7 | Progress | Native progress semantics and equivalent accessible state |
| 8 | Status / alert | Accessible text/status region, without unnecessary focus changes |
| 9 | Card / separator | Semantic layout and CSS; no interaction engine |
| 10 | Modal dialog | Evaluate native dialog; test focus, Escape, dismissal and return focus |
| 11 | Tabs | Shared interaction contract; evaluate existing machine if needed |
| 12 | Disclosure / accordion | Native details/summary where requirements fit |
| 13 | Switch | Explicitly choose/test checkbox versus switch semantics |
| 14 | Tooltip | Existing behavior candidate; keyboard/hover/dismissal tests required |
| 15 | Popover | Browser primitive or machine; verify focus, dismissal and CSS placement |
| 16 | Dropdown menu | Machine candidate; distinguish action menus from navigation links |
| 17 | Searchable combobox | Machine candidate; IME, selection, keyboard and AT require substantial testing |
| 18 | Slider | Native range first; custom behavior only for needed capabilities |
| 19 | Toast | Optional bounded queue, status semantics and timer cleanup |
| 20 | Table / stress list | Semantic table/list; document virtualization separately; no editable grid scope |

Native semantics still need real WebView2 testing. For custom patterns, follow
[WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/) and validate actual behavior;
adding roles alone does not establish accessibility.

### Shared logic and renderer ownership

- **Shared:** tokens/recipes/icons, small state/action schemas, control contracts,
  ID/ARIA relationships, interaction test traces and optionally pinned per-control
  machines. Application state remains separate from transient control state.
- **Framework-owned:** DOM rendering, property/event/ref mapping, subscriptions,
  mount/unmount cleanup, portal/shadow-root integration and focus effects.
- **Host:** unchanged. UI Lite would be browser-side code, without a native widget
  API, generic bridge, process execution or persistence.

Do not render every control through one shared imperative DOM/Web Component engine
and then claim to measure eight independent frontend renderers. A shared-engine
integration test is valid, but answers a different question.

Start with the existing button/form/status fixture. Before choosing a complex
behavior engine, spike **tabs and dialog** against the real host and compare
dependency cost, adapter cleanup, keyboard/AT and CSP/DOM behavior. Framework-neutral
does not mean CSP-compatible: placement, scroll locking and animation may write
styles. Do not weaken policy or silently drop behavior to make a library pass.

Add controls only with relevant focus/keyboard, disabled/busy, IME/bidi,
Narrator/NVDA, high contrast/DPI and repeated-remount tests. Record package/source
versions and notices. No extraction, dependency, adapter or 20-control library is
implemented by this design note.

## Acceptance before measurement

- Same CSS token values, effective spacing/dimensions, font files/weights,
  icon geometry, text and synthetic states in all nine outputs.
- Fonts settled before timed interaction/render tests; report first-use font
  loading separately in startup. Verify actual Hebrew shaping and emoji
  fallback on the reference machine.
- External local CSS/fonts/SVG only, no inline style attributes, unreviewed runtime
  styles, eval, remote assets or workers. Inspect actual DOM as well as CSP events.
- Verify contrast, focus, disabled/busy/error states, high contrast/reduced motion,
  light/dark themes, RTL and Windows scaling. Color and icons never supply the
  sole operation/status meaning. No accessibility acceptance is claimed yet.
- No library-specific animation, backdrop, chart, router or icon wrapper added
  to just one baseline. Any adaptation/dependency/feature discrepancy is recorded.
- Distinguish the common-style/shared-core renderer scenario from optional
  idiomatic component-library/DX scenarios. No final framework/product is selected.

The C++ host remains a loader of production assets. It neither installs Tailwind,
selects a palette, renders shadcn controls nor needs a new native styling API.
