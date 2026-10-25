# Startup, asset delivery and lifecycle follow-up

This work follows the 2026-10-24 six-host cohort. It changes the C++ implementation
in isolated build trees; it does not replace that cohort's native binaries,
metrics or hashes. Tauri v2 + Svelte 5 remains our feature-rich product default.
`Tauri-v2-Svelte5` is the later cross-toolkit UI/behavior reference; each other
toolkit, including Electron, will implement it independently.

## Lifecycle correction

Previously, browser creation started inside `create_window()`, before the owning
`HostWindow` had been returned. Shutdown could destroy its parent HWND and end
the STA pump while asynchronous creation was still outstanding. Weak completion
callbacks prevented some use-after-free paths, but did not ensure late
initialization could finish its cleanup before process exit.

The host now posts initialization to its own window after creation returns,
tracks outstanding environment/controller requests, and retains state/apartment
ownership until those completions arrive. A close request hides a pending
window; it preserves the HWND until a late controller can be explicitly closed,
then destroys it. `run()` drains initialization on the STA at shutdown, with a
30-second failure deadline. It does not terminate browser processes. A timeout
is failure, never successful cleanup. WM_QUIT is preserved without continuously
reposting it inside the drain loop. Repeated internal start messages cannot start
a second environment.

Application callbacks are detached during owner destruction. Embedders should
use `close()`, keep the owner and STA pump alive until `closed`, and avoid directly
destroying the library-owned HWND or destroying an owner while its `run()` member
is executing. No nested drain loop is entered inside tracked WebView2 callbacks.
This follows Microsoft's [STA/message-pump and reentrancy guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/threading-model).
Normal controller shutdown is asynchronous at the process level; helper exit
remains externally verified. See Microsoft's [process-related events](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/process-related-events).

The first partial correction still reproduced one helper leak, associated with
`close-before-ready-0`, in `.cache/test-5070dcbf21fd4ae5890224c892c9de09`.
That failed attempt and its targeted forced-cleanup record remain preserved and
do not count as successful shutdown. Deferring initialization and retaining the
parent during pending controller creation were added after that observation.
Subsequent stress/regression evidence is recorded in `VALIDATION.md`. This
addresses the reproduced path; it is not proof against every runtime failure or
independent production lifecycle approval.

## Embedded application default

By user selection, new application builds use embedded assets. The CMake build
generates a trusted byte snapshot and a separate embedded runner; the original
file-backed runner remains available for controlled experiments. The library
does not compile or execute TypeScript/Svelte source: embed the production Vite
output, including its JS/CSS/fonts/icons and entry HTML.

The snapshot is owned and immutable after validation. It permits at most 4,096
assets, 32 MiB per asset and 128 MiB aggregate. Names retain canonical path and
MIME restrictions, with ASCII build-time names and Windows-style ASCII case
collision rejection. Missing embedded assets return the existing blocked/missing
response; no filesystem fallback exists. Embedded mode needs no external dist
directory at runtime. If an asset path is explicitly provided, profile/asset
separation checks still apply. The default file mode's handle confinement and
reparse checks remain intact.

Embedding is a packaging/ownership choice and removes repeated file reads. It
does not imply lower total RAM or remove WebView2's browser processes. Executable
assets must be rebuilt when frontend content changes. Build-time asset inputs
are trusted code inputs, not an arbitrary user-file import facility.

## Initial phase experiment

`scripts/probe_startup.py` performs randomized file-versus-embedded rounds with
the same Svelte assets and explicit numeric tracing. The first exploratory run
is `.cache/startup-delivery-20261024-145738`: two warmup rounds and ten measured
rounds per delivery/profile condition, **48 attempts** in total, with runtime
155.0.4283.62 and helper-exit checks between attempts.

| Native traced median | Files, fresh | Embedded, fresh | Files, retained | Embedded, retained |
| --- | --- | --- | --- | --- |
| Environment creation | 4.52 ms | 4.63 ms | 4.85 ms | 4.46 ms |
| Controller creation | 375.34 ms | 371.99 ms | 233.68 ms | 222.69 ms |
| Navigation interval | 1290.86 ms | 1368.39 ms | 111.75 ms | 115.21 ms |
| Total asset reads/copies | 3.82 ms | 0.15 ms | 3.96 ms | 0.15 ms |
| Runner start to NavigationCompleted | 1857.82 ms | 1824.33 ms | 374.16 ms | 357.35 ms |

Separate medians do not add to the total median. These endpoints are native
NavigationCompleted and include opt-in tracing overhead; they are not the older
UIA Ready, first meaningful paint, physical scan-out or OS-cold startup metric.
This was an initial implementation iteration, before the final standalone-asset
and callback-close validation changes; do not assign its timings to the final
artifact hashes. Raw traces, samples and input hashes remain preserved. Future
runs of the script also copy native binaries and sources into their run folder.

The key finding is that eliminating file reads removes a few milliseconds,
while substantial fresh-profile delay remains before/within navigation. In one
sample, Navigate was requested at 497 ms and the first resource callback was
observed at 1251 ms; its file read took 0.392 ms. This does not identify the cause
of that earlier wait. It does not isolate IPC dispatch, protocol/origin behavior,
runtime initialization, reputation checks or other internal work. In particular,
it does not prove that embedding explains Tauri's previous 739 ms advantage.
Microsoft documents [host-side WebResourceRequested overhead](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/working-with-local-content);
our file and embedded modes both retain that interception path. A targeted
runtime/ETW or origin/protocol experiment would be needed to isolate the remainder.
No browser security checks, CSP or confinement rules were disabled for speed.

## Loading continuity and diagnostics

Native WM_ERASEBKGND/WM_PAINT and WebView2's opaque DefaultBackgroundColor now use
the same caller-selected background. The runner accepts `--background-rgb F8FAF9`
to match the light Svelte surface. Native loading text is cleared after successful
navigation. Explicit browser light/dark/system preference is also available through
`--color-scheme` (light by default). The system-versus-light probe did not establish
that this alone removes dark intermediate captures.

The embedded application runner now keeps its native loading surface visible
until successful NavigationCompleted, then reveals WebView2. This is a loading
UX policy, not a faster startup claim: external timing still begins at launch,
and UIA Ready must become visible/enabled after reveal. There is no arbitrary
delay timer. `--show-browser-immediately` restores immediate display;
`--reveal-after-navigation` opts the file-backed runner into this policy. The
library option remains false by default for raw rendering experiments. A frontend
whose top-level load completion waits for visible animation frames must use
immediate display; our Svelte page's readiness waits asynchronously after mount.
Existing custom chrome and memory-target behavior are unchanged.

The initial matched-background probe still captured dark intermediates. The
subsequent system/light probe also retained them. In the later eight-attempt
immediate/held probe (`.cache/visual-continuity-20261024-154533`), all four held
attempts had one near-black sample each, compared with 2-11 for immediate display.
All attempts reached visible Ready and exited cleanly. This is a small sampled
observation, not physical flash elimination, an FPS result or a universal latency
improvement. Keep the raw evidence from all iterations.

Use `--report <path>` for numeric environment/controller/navigation boundaries;
`--trace-assets` additionally records per-request byte counts/read durations.
Trace records do not serialize filenames, URLs, titles or user inputs. Keep
traces disabled for normal application use and hold their setting constant in
comparisons. Closing from a diagnostic callback is covered by a dedicated
regression case; resource handling stops before using closed COM objects.

`scripts/probe_visuals.py` uses the external accepted collector for immediate/held
file and embedded fresh profiles. Its sampled GDI frames and UIA
Ready checks can demonstrate observed loading/content transitions, not guarantee
the absence of every physical flash. Exact evidence and remaining physical
accessibility/DPI/GPU/energy gates belong to `VALIDATION.md`.
