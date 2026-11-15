# Desktop cross-toolkit benchmark results

Cohort `desktop-cohort-3`, collected 2026-11-14 on one machine: Windows 11 Pro for Workstations 10.0.26200, 3840x2160 at 200% scaling (192 DPI), NVIDIA GeForce RTX 2070 SUPER (driver 610.88), .NET SDK 10.0.404. Eleven stacks, twelve variants (Dear ImGui DX12 and DX11 separately). **557 attempts, 0 failed.** Measured: 20 startup rounds per lane (14 lanes, 3 warmups), 3 idle lifetimes per variant (1 warmup), 8 interaction lifetimes per variant (1 warmup). All numbers are medians (p95 where stated) over independent process lifetimes. With n of 3 to 8 for idle and interaction, treat differences under about 20-30% as unresolved. No composite score is computed.

Protocol, clocks and limits: [PROTOCOL.md](../../desktop-measurement/PROTOCOL.md). Everything below measures the same synthetic NeutronStar reference screen and workbench, not application-level work.

## What the numbers are, and are not

- Pixel times are **compositor present times** from DXGI Desktop Duplication (QPC), cropped to the client area. They are not photon scan-out. The pipeline floor measured with a synthetic WinForms window is **26.5 ms median (p95 36-41 ms)** from input to first presented frame (two repeats of 30 samples). It is a floor for the capture path, not a toolkit result; do not subtract it silently.
- Startup "visual ready" is the first frame matching *that variant's own* settled Ready reference (at most 1% of 64x40 grid cells differing) that then stays matched for 500 ms. It shows each variant reached its own ready state, not that all toolkits render identical pixels (see DESKTOP-VISUAL-PARITY.md).
- Interaction "first change" is the first presented frame after button **release** (the pressed-style frame is excluded). "Settled" is the last change before 300-500 ms of silence and **includes toolkit-standard animations** (WinUI and Flutter control transitions are about 400 ms), so it is not pure work time.
- UIA "ready" is a secondary endpoint (10 UIA-capable apps) and includes provider and polling cost; it is not comparable with pixel times. Dear ImGui has no UIA provider.
- Other applications kept running and were not controlled. The collector reads back pixels and moves the pointer; the machine was left untouched.

## Startup (ms, median / p95, n = 20)

Direct launch only. Fresh versus retained profile applies only to Tauri and Electron (browser user-data directory).

| Variant | Window visible | First content | **Visual ready** | UIA ready |
| --- | --- | --- | --- | --- |
| React Native Windows | 60 / 68 | 348 / 357 | **349 / 374** | 342 / 399 |
| wxWidgets | 95 / 101 | 286 / 327 | **369 / 427** | 220 / 232 |
| Electron (fresh) | 132 / 139 | 499 / 522 | **501 / 522** | 415 / 530 |
| Electron (retained) | 129 / 137 | 493 / 522 | **501 / 522** | 391 / 433 |
| Dear ImGui DX11 | 226 / 233 | 361 / 370 | **506 / 518** | - |
| Tauri v2 + Svelte 5 (retained) | 44 / 49 | 518 / 531 | **520 / 533** | 486 / 581 |
| Dear ImGui DX12 | 281 / 290 | 416 / 429 | **565 / 575** | - |
| WinUI 3 MVVM | 307 / 316 | 462 / 473 | **580 / 600** | 445 / 459 |
| Slint | 371 / 388 | 544 / 555 | **644 / 656** | 427 / 444 |
| WinUI 3 Reactor | 384 / 395 | 520 / 530 | **657 / 672** | 527 / 543 |
| Qt Quick | 434 / 452 | 631 / 656 | **703 / 720** | 639 / 663 |
| Avalonia | 1014 / 1028 | 1218 / 1240 | **1282 / 1312** | 1276 / 1310 |
| Tauri v2 + Svelte 5 (fresh) | 40 / 49 | 998 / 1306 | **1393 / 1609** | 1383 / 1586 |
| Flutter | 1339 / 1353 | 1453 / 1475 | **1603 / 1625** | 1493 / 1511 |

Reading it: a **fresh WebView2 profile costs Tauri about 870 ms** (1393 versus 520 ms median); Electron shows no fresh/retained difference. Tauri's window appears first (about 40 ms) but shows an incomplete page until the web content is ready, so "window visible" does not mean "usable". Avalonia (1282 ms) and Flutter (1603 ms) are the slowest to a settled UI. The cause for Avalonia was not investigated (no ReadyToRun/AOT check was made), so do not read it as inherent to the toolkit. React Native Windows (349 ms) was verified: its frames reach the reference Ready screen at about 330 ms, with UIA ready at 324 ms.

## Idle resources (n = 3 lifetimes, medians)

Each state is sampled for 6 s after 1 s of settling: visible, unfocused (focus on an owned fixture), occluded (fully covered), minimized, restored. Private working set is the Process V2 counter summed over the run-owned process tree.

| Variant | Processes | Private working set (visible), MiB | Range across the five states, MiB | CPU, % of one core | GPU dedicated, MiB |
| --- | --- | --- | --- | --- | --- |
| wxWidgets | 1 | **3** | 3-3 | up to 0.00 | 0 |
| WinUI 3 MVVM | 1 | **37** | 37-37 | up to 0.31 | 72 |
| WinUI 3 Reactor | 1 | **40** | 40-40 | up to 0.31 | 74 |
| Dear ImGui DX11 | 1 | **44** | 44-44 | up to 0.31 | 28 |
| Qt Quick | 1 | **48** | 47-48 | up to 0.00 | 54 |
| React Native Windows | 1 | **48** | 48-48 | up to 0.31 | 47 |
| Avalonia | 1 | **48** | 48-48 | up to 0.31 | 76 |
| Flutter | 1 | **66** | 65-67 | up to 0.31 | 159 |
| Dear ImGui DX12 | 1 | **74** | 74-74 | up to 0.00 | 34 |
| Electron | 4 | **90** | 90-91 | up to 0.31 | 64 |
| Tauri v2 + Svelte 5 | 7 | **98** | 98-98 | up to 0.30 | 56 |
| Slint | 1 | **104** | 104-104 | up to 0.00 | 115 |

Reading it: every variant is effectively idle in every state. CPU readings are quantized to one process-time tick (15.6 ms over 5 s = 0.31%), so 0.00-0.31% means zero within resolution, and no state-dependent busy loop was seen. Memory is therefore the meaningful idle result. The single-process native stacks are 3-104 MiB, Electron is 90 MiB over 4 processes, Tauri 98 MiB over 7 (WebView2 helpers). Slint is the outlier among the natives at 104 MiB. wxWidgets reports 3 MiB private working set (GDI; nothing GPU-resident); that is the private part only and excludes shared system DLL pages. GPU engine utilization was 0% for every variant and is not informative at this resolution.

## Interaction latency (ms, median over 8 lifetimes: settled, with first change in parentheses)

Real injected pointer/keyboard input, client region. Selected steps; every step, every variant, p95 and the final-state comparison are in [summary.json](summary.json).

| Variant | about-open | reset-after-cancel | workbench-open | rows-10000 | rows-1000 | reverse | splice-10 | update-10-percent | filter-to-one | filter-clear | remount | workbench-back |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tauri v2 + Svelte 5 | 40 (40) | 12 (12) | 35 (34) | 192 (169) | 51 (51) | 51 (51) | 16 (16) | 22 (21) | 42 (21) | 23 (22) | 25 (25) | 28 (14) |
| Electron | 45 (45) | 17 (17) | 31 (31) | 201 (199) | 53 (53) | 53 (53) | 18 (18) | 18 (14) | 36 (28) | 23 (23) | 28 (28) | 24 (20) |
| Dear ImGui DX12 | 81 (10) | 55 (5) | 73 (6) | 38 (5) | 42 (5) | 39 (6) | 46 (9) | 41 (8) | 61 (8) | 60 (11) | 40 (7) | 63 (47) |
| Dear ImGui DX11 | 90 (11) | 53 (2) | 75 (9) | 45 (45) | 48 (28) | 42 (42) | 44 (11) | 40 (7) | 62 (46) | 58 (9) | 42 (9) | 60 (10) |
| wxWidgets | 299 (18) | 29 (14) | 112 (63) | 508 (173) | 87 (73) | 84 (70) | 83 (70) | 36 (35) | 56 (22) | 91 (11) | 82 (76) | 42 (10) |
| Qt Quick | 26 (26) | 26 (26) | 201 (180) | 330 (330) | 508 (346) | 195 (187) | 48 (48) | 28 (28) | 49 (26) | 161 (155) | 180 (177) | 37 (36) |
| Slint | 181 (31) | 165 (29) | 173 (40) | 189 (86) | 186 (61) | 177 (27) | 176 (27) | 179 (30) | 574 (28) | 216 (33) | 257 (23) | 162 (29) |
| React Native Windows | 338 (23) | 32 (32) | 1037 (362) | 355 (355) | 98 (98) | 107 (107) | 157 (157) | 73 (70) | 115 (47) | 32 (10) | 517 (123) | 400 (64) |
| Avalonia | 116 (9) | 102 (17) | 297 (281) | 155 (155) | 319 (112) | 190 (172) | 260 (243) | 224 (141) | 1479 (258) | 547 (181) | 198 (176) | 58 (39) |
| Flutter | 406 (28) | 406 (9) | 325 (133) | 10 (10) | 416 (61) | 404 (5) | 408 (7) | 406 (20) | 1021 (25) | 103 (100) | 406 (12) | 267 (16) |
| WinUI 3 Reactor | 308 (33) | 420 (37) | 697 (288) | 352 (36) | 408 (40) | 426 (27) | 419 (29) | 418 (31) | 129 (40) | 584 (125) | 660 (6) | 167 (38) |
| WinUI 3 MVVM | 300 (45) | 414 (31) | 771 (292) | 380 (380) | 982 (641) | 771 (387) | 697 (303) | 702 (236) | 338 (338) | 459 (352) | 734 (160) | 344 (44) |

Reading it: the web stacks (Tauri, Electron) and Dear ImGui respond and settle within about 15-60 ms for most steps because they do no toolkit animation; their larger values are the 10,000-row replacement (about 190-200 ms for both web stacks, which build real DOM rows). The WinUI 3 pair and Flutter settle at about 400 ms on almost every step because their standard control transitions keep changing pixels; their *first change* (5-40 ms) is the better response-onset measure for those, so read both numbers. Avalonia's `filter-to-one` (1479 ms) and React Native Windows's `workbench-open` (1037 ms) are the clearest outliers; both were stable across lifetimes but their cause was not investigated. Flutter's 10 ms for `rows-10000` reflects a lazily built list changing only the visible rows, so it is not comparable with stacks that realize all rows. Slint's settled times are about 175 ms on every step (a consistent animation or redraw tail, not per-step work).

## Not measured, deviations, history

- **Not measured:** photon scan-out, post-reboot cold start, Explorer launch gesture, energy, 10/30/60 Hz burst cadence (a one-digit tick change is below the pixel-change threshold), UIA timing for actions and lists (dropped for leanness; UIA is used only for startup readiness and as the lookup path), physical assistive technology, IME, clean-machine deployment.
- **Correctness gate before the cohort:** the candidate checker passed for all eleven stacks, but the first attempt failed for Tauri, Electron, Flutter and wxWidgets (`correctness-gate-first-attempt.txt`; those failed runs are kept under each candidate's `.cache/check-*`). Causes: a race in the checker's "Stop" step (asserted the tick was stable immediately after a click; now it must become stable within 1.5 s), transient foreground and UIA timeouts, and one genuine bug: the wxWidgets window ignored the 1100 DIP content cap at wide sizes (fixed in `wxWidgets/src/main.cpp`). Slint and wxWidgets also failed to compile after the visual-parity revision (`main.slint:112` unit/operator spacing; `SetSpacer` renamed to `AssignSpacer` in wx 3.2) and were fixed before the cohort. The artifacts measured are the rebuilt ones in `freeze.json` (2,486 files hashed).
- **Collector history:** `desktop-cohort-1` and `desktop-cohort-2` and several scratch cohorts were used to develop the interaction scenario (a pressed-state timing artifact, an animation-dependent Cancel target, UIA timeouts on a 10k-row React Native Windows tree, a too-strict state check) and are retained but not used. Earlier rejected attempts (DXGI access loss, a collector hang) are retained in `desktop-20261114`. Pilot acceptance was automated (status, exit code 0, helpers exited, 960x640 DIP client, no capture resets) plus sampled visual inspection by the operator; it is **not an independent review**.
- The idle order was rotated across lifetimes but only 3 of the 5 rotations were run, so state-order effects are not fully balanced.
- The back-to-main correctness check is advisory (50% limit) because several toolkits keep a scroll offset or show a scroll indicator; its fraction is stored per lifetime.

## Follow-up 2026-11-15: fixes and re-measurement

After the first cohort, the slow spots were investigated. Each was either fixed, shown to be outside application code, or left as designed. Re-measurement: new frozen cohort `desktop-cohort-5` (a first calibration attempt in `desktop-cohort-4` failed with "Colour flip never presented" and is retained; the retry in a fresh folder passed, cause not found). It re-ran only the affected stacks (Avalonia, Flutter) plus Tauri, Electron and React Native Windows **unchanged** as same-session controls: startup 20 rounds (3 warmups), interaction 15 lifetimes (1 warmup), 0 failed attempts. Collector and method unchanged; raw data in [followup-cohort-5-summary.json](followup-cohort-5-summary.json) and [followup-cohort-5-freeze.json](followup-cohort-5-freeze.json). The first-cohort numbers above are kept as the baseline.

| Problem found | Cause | Action | Result (median, before -> after) |
| --- | --- | --- | --- |
| Avalonia slow startup | Plain JIT: the window appeared at 1.0 s | `PublishReadyToRun=true` (Avalonia/NeutronStar.Avalonia.csproj) | Startup to settled UI **1282 -> 784 ms** (p95 813). A/B: JIT 1256 vs ReadyToRun 782-787, so ReadyToRun is the whole fix |
| Avalonia filter typing ~1.5 s | Every keystroke replaced the whole `ItemsSource` and re-created every row control | List now applies sparse changed-row notifications (remove/replace/insert in an `ObservableCollection`) when order is kept; reorders and mostly-new lists are still published whole. Randomized equivalence test added (`Avalonia/Tests/Program.cs`) | filter-to-one **1479 -> 597 ms** (bimodal: 580 or about 1080 ms), filter-clear 547 -> 125, splice-10 260 -> 115, update-10% 224 -> 116. A/B with the diff disabled: filter 1685, splice 206, update 234, filter-clear 549, so the diff is the whole fix |
| Flutter slow startup | The engine itself. A stock `flutter create` app with only the window title changed has its window visible at **about 1270 ms** on this machine, the same as ours (about 1280 ms) | Parallelized the sequential font/icon preload in `lib/main.dart`; the real cost was not in app code | Startup **1603 -> 1495 ms** (about 7%). Not fixable from application code |
| Tauri fresh-profile first launch +870 ms | First creation of a WebView2 user-data folder | None. This host is deliberately configured to match the frozen six-host WebView2 collector (no `WEBVIEW2_*` overrides, empty browser arguments), so no startup flag was changed. Not tested against a stock WebView2 app | Unchanged: **1394 ms** fresh (p95 1693) vs 510 ms retained |
| RNW workbench open ~1 s; Tauri/Electron 10k-row swap ~200 ms | The designed unvirtualized stress workload: RNW creates about 1000 native views on open, the web hosts create 10,000 DOM rows | None, by parity rule (no virtualized lane in the baseline; see DESKTOP-COMPARISON-PLAN.md). A separate, labeled virtualized lane would be the way to measure the product-style case | Unchanged: RNW 1029 ms, Tauri 190 ms, Electron 198 ms |

Caveats on the re-measurement:

- **Same-session drift is about 5-9%.** Controls moved by that much (Electron startup 501 -> 547/534 ms, Tauri retained 520 -> 510 ms, RNW 349 -> 350 ms). Differences smaller than that are not results.
- **The 10,000-row step is not a reliable single number** for stacks whose UI thread blocks while the list is built (Avalonia, React Native Windows, Flutter). The step produces one presented frame whose time depends on when the blocked thread is released, so values range from about 2 ms to about 1.2 s between identical lifetimes, and the cost can show up in the next step. Examples: Avalonia rows-10000 71-1252 ms; React Native Windows rows-1000 about 100 ms in cohort 3 and about 1150 ms in cohort 5 with the same binary. Several first-cohort medians for these steps were therefore understated (Avalonia rows-1000 had 2-78 ms readings that were really the previous step's work; its real value is about 600 ms in both cohorts). Read rows-10000 plus rows-1000 together, or not at all, for these stacks. Flutter filter-to-one (1021 -> 527 ms) changed with no related code change and is also bimodal.
- **One side effect of the diff:** Avalonia remount went from about 200 to about 290 ms. The cause was not found.
- Avalonia startup includes ReadyToRun compilation from the `microsoft.netcore.app.crossgen2` pack, restored from nuget.org at publish time; it is not recorded in `packages.lock.json`.
- The Avalonia A/B (6 interaction and 10 startup lifetimes per build, round 0 discarded) is exploratory, not a frozen cohort: [followup-avalonia-ab.json](followup-avalonia-ab.json).
