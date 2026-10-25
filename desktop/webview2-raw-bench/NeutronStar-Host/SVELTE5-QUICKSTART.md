# A new Svelte 5 app in NeutronStar Host

The host accepts any compatible production asset tree. It has no dependency on
an example project, Svelte state library or UI kit.

## 1. Create the frontend

```powershell
pnpm create vite@latest my-svelte-app --template svelte-ts
cd my-svelte-app
pnpm install
```

Use supported Node/pnpm versions, confirm Svelte 5 and commit the lockfile. In
`vite.config.ts`, keep the Svelte plugin and these production settings:

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
export default defineConfig({
  base: './',
  plugins: [svelte({ compilerOptions: { css: 'external' } })],
  build: { target: 'chrome120', assetsInlineLimit: 0, sourcemap: false },
});
```

A first `src/App.svelte` can be this local counter:

```svelte
<script lang="ts">
  let count = $state(0);
</script>
<main>
  <h1>My desktop app</h1>
  <button onclick={() => count++}>Count: {count}</button>
</main>
<style>
  :global(html) { background: #f8faf9; color: #171a18; font-family: system-ui; }
  main { padding: 28px; }
  button { padding: 8px 16px; }
  button:focus-visible { outline: 2px solid #047857; outline-offset: 3px; }
</style>
```

These source blocks compile to external JS/CSS; the host never loads raw
`.svelte`/`.ts` files. Remove template CDN/external navigation dependencies.

## 2. Build, embed and run

Prepare the host's C++ toolchain and pinned WebView2/WIL dependencies as described
in its README. Default compilation uses CMake/Ninja/clang-cl with Microsoft's
SDK/STL/linker. From your frontend directory:

```powershell
pnpm build
$hostRoot = 'D:\Tools\NeutronStar-Host' # Your checkout/location
$projectDist = (Resolve-Path .\dist).Path
& "$hostRoot\scripts\Build.ps1" -AssetsDirectory $projectDist -BuildTag my-svelte-app
& "$hostRoot\Run.ps1" -BuildTag my-svelte-app -BackgroundRgb F8FAF9 `
  -ProfilePath "$PWD\.cache\desktop-profile"
```

Embedding is the default: `neutronstar_embedded_runner.exe` contains the complete
dist snapshot. Run requires installed WebView2 Runtime, but no Node, external
dist or local server. Rebuild the native executable after asset changes. Keep
the profile outside dist. Light mode is default; a dark app can select
`-ColorScheme dark` and a matching `-BackgroundRgb`.

For file-backed development/research, explicitly build with `-FileAssets` and
run with `-FileAssets -AssetsDirectory $projectDist`. This mode requires the
files at runtime. The host does not load Vite HMR: edit with `pnpm dev` in a
browser, then test the production build in the host under its real CSP.

## 3. Optional app libraries

- **State:** Svelte 5 runes handle local state. Nano Stores is an optional plain
  TypeScript shared-state core; Svelte supports its store contract. Keep native
  commands separate and do not persist sensitive data automatically.
- **Controls:** Ark UI's free Svelte adapters provide headless controls. Use
  external CSS; check keyboard, focus, Escape and production CSP behavior.
  Runtime style delivery must be verified for each component.
- **Styles:** Tailwind CSS v4 with its Vite plugin, CSS modules or plain CSS with
  variables can all work. Keep fonts/icons local and disable asset inlining.
- **Routing:** use hashes (`#/settings`) or real HTML files; missing routes have
  no SPA fallback. Share in-memory state outside route components only when
  required. Never put secrets in URLs.

The CSP disallows remote content, eval/inline executable HTML, inline style
attributes, workers and frames. Inspect generated production DOM, not just
source. Embedded assets retain canonical path/MIME checks and bounds of 4,096
files, 32 MiB per file and 128 MiB total, with no filesystem fallback.

The app runner keeps native loading visible until successful navigation. Use
`--show-browser-immediately` for raw rendering experiments or frontends whose
top-level load waits for visible animation frames. This is loading polish, not
proof of faster startup or zero physical flashes. No general filesystem or Go
CLI API is added by creating the frontend.

See [host details](README.md), [lifecycle/loading behavior](STARTUP-AND-LIFECYCLE.md)
and [validation](VALIDATION.md).
