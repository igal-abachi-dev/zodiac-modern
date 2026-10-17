# NeutronStar Example

A **Vite + strict TypeScript** adaptation of the supplied Tauri starter. Greet
calls **C++**, replacing Rust/Tauri invoke. Vite and TypeScript are build tools;
the shipped assets contain local HTML, compiled JavaScript, extracted CSS and
SVG. No Tauri, Rust, Node runtime, frontend framework, server or Go CLI runs here.

## Build and run

Use Node **24.21.x LTS** on PATH. This example pins Vite **8.3.4**, TypeScript
**7.0.2** and its own package-lock.json, without changing the parent website.

```powershell
npm ci --ignore-scripts --cache .cache/npm
npm run build
.\Run.ps1
```

Build the C++ host separately using its scripts/Build.ps1. Select Debug with
-Configuration Debug on the host build and example scripts. An installed
compatible WebView2 Runtime and the host's pinned SDK/WIL packages remain needed.
There is no automatic runtime download or execution-policy bypass.
The host now defaults to clang-cl + CMake/Ninja Multi-Config, C++20 x64.
`Run.ps1` and `Test.ps1` select `out/clang-cl-ninja-x64`; pass `-RunnerPath`
explicitly to use an alternative MSVC or matrix runner. Old MSVC binaries are
not selected automatically.

Run.ps1 uses dist, a separate .cache/interactive-profile, and the explicit
**--test-greet** capability. Equivalent native arguments:

```powershell
..\NeutronStar-Host\out\clang-cl-ninja-x64\Release\neutronstar_host_runner.exe `
  --assets "$PWD\dist" --profile "$PWD\.cache\interactive-profile" --test-greet
```

Close the window to exit. Browser profiles can contain metadata; this is not a
no-disk-writes claim. Use synthetic names. npm run dev provides optional loopback
browser styling preview, without native greeting support. Dev/HMR is not evidence
of compatibility with the host's enforced production CSP.

## Native behavior and differences from the ZIP

The form passes input.value unchanged through src/native-bridge.ts. The host
validates the bounded versioned message, queues a callback on the STA, and C++
formats the greeting. A matching response resolves a Promise, then textContent
renders it. There is no local greeting fallback.

| Supplied name | C++ result |
|---|---|
| Ada | Hello, Ada! You've been greeted from C++! |
| empty string | Hello, ! You've been greeted from C++! |
| leading/trailing spaces | Preserved exactly, including whitespace-only input |

This matches the original Rust format semantics: **no trim and no World fallback**,
with the language suffix changed to C++. Names are bounded to 120 UTF-16 units;
lone surrogates are rejected. Valid Unicode, quotes and embedded NUL round-trip
through direct bridge calls. The original starter did not have this native limit.

One request may be pending. Greet is disabled while waiting; the client has a
five-second timeout. Timeout does not cancel native work or reset its busy gate.
Hash routing retains document memory across About/Back; reload loses it. Names
and greetings are not put in storage, URLs or diagnostic reports.

This remains **an adaptation, not a pixel-exact replica**: it keeps the earlier
example's original HTML/star/JavaScript marks, NeutronStar wording and local About
link. It does not reproduce Tauri logos, invoke APIs, remote documentation links,
packaging or Rust dependencies. The original ZIP remains unchanged, SHA-256:
5C07535BA03E389E53165F1461FC73B8AD8A578EF53B9500CE121AA38EABBBA6.

The greeting capability is separately opt-in; the default and action-only host
reject it. Encrypt/decrypt tokens are unchanged. See the
[host protocol](../NeutronStar-Host/README.md#optional-synthetic-greeting-capability).
This is not general RPC, a password channel or the future Go integration.

## Source and generated assets

- index.html, src/main.ts, src/native-bridge.ts and src/styles.css are source.
- public/assets contains the local original SVG drawings.
- vite.config.ts sets relative asset URLs, no asset inlining and no source maps.
- dist is ignored generated production output; recreate it with npm run build.
- tests/self-test.ts is compiled into a separate ignored dist-test build.
- .cache contains ignored profiles, npm cache, isolated test copies and reports.

The host loads **compiled JS, never raw TypeScript**. Built assets fit the current
MIME policy, with external scripts/CSS and unchanged CSP. The test-only module is
injected into Vite's input only in test mode, then bundled; it is absent from the
normal production build.

## Executed validation — 2026-10-16

```powershell
npm run build
npm run build:test
.\Test.ps1 -Configuration Release
.\Test.ps1 -Configuration Debug
```

Production/test builds and strict type checks passed. Both real WebView2 browser
tests passed with MSVC x64 and Evergreen 155.0.4283.45. Each recorded **9 native
greetings, 6 rejected requests, 3 blocked resources and 1 blocked navigation**,
and checked helper exit within the 30-second shutdown deadline.

Coverage: empty/whitespace names, multilingual/emoji text, markup as text, maximum
length, embedded NUL, quotes/newline, malformed/oversized wire messages, native
and client busy gates, external CSS/SVG, hash-state retention, missing assets,
and enforced CSP (eval, inline styles, remote requests/navigation). No names or
reply contents are logged. Ignored report locations:

- Release: .cache/test-71f38e8ef56d4b1ba588b84cfaa46c02/report.jsonl
- Debug: .cache/test-c7a4e2043f5a4d0bb9bbf952517bec47/report.jsonl

These supersede the old plain-JS/local-greeting example's evidence. They do not
prove all eight frontends work, establish performance or resolve the previously
observed intermittent initialization-close issue in the
[host validation record](../NeutronStar-Host/VALIDATION.md).

Visible manual checks remain: keyboard/focus/Enter, Narrator/NVDA, Unicode/bidi
layout, high contrast, light/dark and reduced motion, resize, 100/150/200% DPI,
and multi-monitor changes. Hidden tests are not visual or physical keyboard QA.
No full product or independent review is claimed.

References: [Vite](https://vite.dev/guide/) and
[WebView2 messaging](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/communicate-btwn-web-native).
