# Default WebView2 product stack

Decision recorded 2026-10-24, following the six-host comparison and the user's
explicit selection: **Tauri v2 + Svelte 5 is our default WebView2 stack for
feature-rich desktop products.**

The user selected **`Tauri-v2-Svelte5` as the reference UI and behavior
implementation** for the later desktop-stack comparison. Every candidate,
including Electron, will own an independent implementation: no imported Tauri
frontend, shared runtime UI package or shared `dist`. Each stack should implement
the same screen copy, fixtures, actions, state transitions, control names,
keyboard/focus behavior, logical dimensions and design tokens into their own
toolkit. Non-web renderers do not embed the HTML or pretend to use Ark controls. Disclose
renderer/control differences. Freeze the actual Release benchmark artifact only
after the planned short parity/configuration check. `Tauri-v2-Test` remains the
unchanged historical control, not the future cross-toolkit app template.

This selects a stack within the WebView2 family. The overall desktop GUI choice
remains open until equivalent non-WebView2 candidates are implemented and tested.
It does not change the static Astro/Svelte website architecture or authorize a
desktop product implementation, Go CLI integration or release.

## Why we selected it

The [six-host results](host-test-support/results/2026-10-24/RESULTS.md) compare
the same production Svelte assets under C++, raw Rust, Tauri, Wails, packaged
pywebview and WinUI 3 / C# hosts. Tauri combines competitive measured costs with
framework infrastructure that a growing product would otherwise need to own.

| Measured endpoint | NeutronStar C++ | Tauri v2 |
| --- | --- | --- |
| Direct fresh-profile Ready median | 2,174 ms | 1,435 ms |
| Direct retained-profile Ready median | 482 ms | 501 ms |
| Visible-idle process-tree private resident | 101.0 MiB | 98.4 MiB |
| Visible-idle process-tree private commit | 227.3 MiB | 214.6 MiB |

Startup has 20 samples per cell; memory summarizes five independent lifetimes.
Fresh/retained refers to profile-directory paths, not post-reboot cold starts.
These are the tested configurations on one machine. The fresh-profile advantage
is observed, but its cause has not been isolated. The small resident-memory
difference does not establish an inherently more efficient browser engine.

The product rationale is the combination of those measurements and Tauri's
window/lifecycle APIs, capability/permission model, plugins, packaging and signing/
update tooling. These reduce the amount of custom application infrastructure to
maintain. They still require application-specific configuration, restricted
permissions, dependency maintenance and validation; our minimal test app did not
exercise or enable a complete product feature set. See the official
[security guidance](https://v2.tauri.app/security/) and
[distribution guidance](https://v2.tauri.app/distribute/).

Svelte 5 remains the selected frontend from the earlier nine-renderer assessment.
Reuse the current TypeScript, local assets, external CSS and shared workflow/state
contract when comparing hosts. Changing the state library or frontend architecture
would be a separate experiment. Keep Svelte compiled assets independent of the
native shell so that later host/toolkit comparisons remain reviewable.

## Where NeutronStar C++ remains the choice

### Window creation and asset delivery decisions - 2026-10-24

Keep explicit `WebviewWindowBuilder` creation in our Tauri app. The template ZIP
uses a declarative `app.windows` entry in `tauri.conf.json`; Tauri creates that
window internally. Both are standard approaches and both load the app entry page.
Our explicit builder attaches navigation, popup, download and permission callbacks
at creation. Keep static build/CSP/distribution configuration in `tauri.conf.json`
and its `windows` list empty to avoid a duplicate window. This choice is about
behavior and ownership, not a measured rendering or RAM advantage.

**Embedded production assets are the default for Tauri and, by user selection,
for new NeutronStar C++ application builds.** Svelte/Vite compiles source into
`index.html`, JavaScript, external CSS, fonts and icons; embedding includes that
whole asset set, not raw TypeScript/Svelte source or just HTML. The existing
`Tauri-v2-Test` already embeds the compiled baseline. `Tauri-v2-Svelte5` instead
owns its local frontend source, Vite/TypeScript build and native project together.
Both use the same fundamental production rendering architecture. Retain an
explicit file-backed C++ runner for development and controlled experiments.

The first isolated C++ file/embedded probe used identical Svelte assets and ten
measured rounds per mode/profile condition (plus two warmup rounds). It observed
about 3.8 ms total file-backed asset reads versus 0.15 ms embedded reads. Fresh
native NavigationCompleted medians were about 1,858 ms and 1,824 ms respectively;
retained medians were about 374 ms and 357 ms. These traced native endpoints are
not the earlier UIA Ready metric, physical paint or OS-cold starts. They do not
prove embedding explains Tauri's earlier 739 ms fresh-profile advantage: most
fresh-profile time remained in controller creation/navigation, including a delay
before the first resource callback. Do not infer a DNS/reputation-check cause
without a separate controlled trace or experiment.

Use embedding for coherent, versioned application delivery and reduced runtime
file reads. It is not a universal fastest-WebView2 or lower-RAM claim. Preserve
the synthetic origin, CSP, MIME/path bounds and absence of filesystem fallback
for missing embedded assets. Rebuild the native executable after asset changes;
keep Vite's loopback development server out of production measurements.

Keep **NeutronStar C++ + Svelte** as the controlled minimal benchmark baseline
and as an option for small, tightly scoped offline utilities with a narrow native
surface. Do not expand it into a general desktop framework merely to reproduce
Tauri's surrounding product infrastructure. An existing C++ application or an
unusual Win32/WebView2 requirement can still justify that ownership.

The results do not reveal a fundamental C++ performance problem: retained Ready
was slightly lower than Tauri, and raw Rust showed no decisive advantage over
C++. Before changing C++ for performance, trace environment creation, controller
creation, navigation and frontend readiness. Investigate asset-delivery and
profile-initialization differences one at a time; do not treat them as proven
causes or weaken content/path/privacy policy to chase a benchmark number.
Resolve the known intermittent early-initialization helper-shutdown concern
before treating the custom host as production-ready.

## Boundaries and next comparison

- Tauri is our selected WebView2 product default, not a universal winner or a
  release/security approval. No host won every measured interaction.
- The same Chromium-based WebView2 engine remains underneath Tauri/WRY and the
  raw hosts. Framework selection does not eliminate its multiprocess footprint.
- No Go CLI, real cryptographic work, native IPC throughput, download manager,
  updater or full product workload was benchmarked. Feature-rich product costs
  must be validated when those features exist.
- Preserve NeutronStar's applicable principles in the product: local assets,
  restrictive CSP, explicit native permissions, narrow validated commands and
  appropriate profile/persistence policy. Do not assume policy parity between
  the six test hosts or automatically enable plugins.
- Physical accessibility/IME/high contrast/DPI/multi-monitor, GPU/energy,
  physical presentation, clean-machine deployment and broader lifecycle/security
  gates remain open. Original failures and the authorized interference retry
  remain in the measured report.
- Next, use **Tauri v2 + Svelte 5 as the selected WebView2 representative** against
  non-WebView2 desktop GUIs such as Avalonia/Skia, Flutter, Qt/QML and native
  WinUI 3 controls. WinUI 3 hosting WebView2 was already measured; native WinUI 3
  is a distinct candidate. Preserve equivalent workflows, geometry, assets and
  external measurement definitions, and disclose renderer/control differences.

The frozen benchmark evidence remains unchanged. This document records the
subsequent product-stack decision and its limits.
