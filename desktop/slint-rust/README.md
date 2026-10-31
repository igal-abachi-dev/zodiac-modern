# NeutronStar — Slint / Rust

Independent Windows 11 replica of the complete
[Tauri/Svelte reference](../Tauri-v2-Svelte5/FEATURE-PARITY.md), written in
declarative Slint and Rust. Includes both simulation cards, progress/cancel/reset,
About and the complete list/filter/update workbench. No web engine, sibling UI
imports, Go CLI, cryptography, real files or runtime networking.

## Build and run

Requires Visual Studio C++ build tools/Windows SDK, rustup and Python 3 for notices.
`rust-toolchain.toml` selects **Rust 1.99.1**, including rustfmt/Clippy. It does not
change the machine's default Rust toolchain. **Slint 1.18.1** and slint-build are
exactly pinned; transitive dependencies are locked by Cargo.lock. Slint's minimum
Rust version is 1.92; the older machine default 1.91 is insufficient.

Run `Init.cmd` to build/test/publish, then right-click `Run.ps1` → **Run with
PowerShell**, or launch `out/win-x64/neutronstar-slint.exe`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Build.ps1
.\Run.ps1
```

First build downloads Cargo dependencies and may acquire matching Skia prebuilt
libraries. Later builds are incremental. No SDK/dependency download happens in
the running application. Build runs Release model tests, rustfmt and Clippy with
warnings denied, then generates notices and `.cache/build-receipt.json` hashes.

## Implementation choices

Rust 2024, MSVC target, **Winit + Skia** explicitly selected. Slint compiles the UI
and embeds local TTF fonts/SVG images. Standard free Fluent widgets supply input,
buttons, progress and scrolling. The client uses a light palette; native caption
and stock accent appearance can still follow Windows settings.

Workflow and list models are owned Rust values, with weak callback references,
monotonic elapsed-time progress and generation checks. Timers stop on Stop, Back,
remount and close. The ordinary repeated list eagerly instantiates all rows:
there is no virtualized ListView. VecModel notifications update changed rows;
stable data IDs do **not** imply keyed widget moves: Slint repetition reuses
instances by position. This must be disclosed in later list benchmarks.

Semantic Ready is published after `show()` and an event-loop turn. This selected
Skia build does not deliver the graphics API AfterRendering notifier used by GL;
the WGPU notifier is feature-gated upstream. Ready means actions are usable, **not** that pixels
have reached the display. Calibrate physical presentation separately.

Accessibility is explicitly enabled through AccessKit. About is a focus-contained
in-window overlay with Escape/Close and trigger restoration; Slint 1.18's public
AccessibleRole has no Dialog value, so the panel exposes a named group. Do not
equate this with complete native dialog/screen-reader parity.

## Licensing and validation

This candidate selects **Slint Royalty-free Applications License 2.0** for desktop
use. Its required standard AboutSlint attribution is visible in About; external
link activation is blocked for this offline fixture. The additional attribution
content is an intentional difference from the canonical About panel. No paid UI
controls are needed; Slint is not simply an MIT dependency. Asset and resolved
Cargo attributions accompany the published folder. Distribution/license review,
including the Skia binary notices, remains a release gate.

See [VALIDATION.md](VALIDATION.md) for actual checks and remaining limitations.
No comparative performance result is claimed here.
