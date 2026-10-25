# Six-host Svelte benchmark results

Measured WebView2: **155.0.4283.62**. Startup/idle cohort `six-host-20261024-h`; action cohort `six-host-actions-20261024-i` plus its explicitly authorized interference retry; supplemental cohort `six-host-workload-20261024-b`.

Completed 480 measured startup launches, 30 independent idle lifetimes, 120 usable measured action lifetimes and 120 measured supplemental lifetimes. A WinUI action trial timed out; the user reported an accidental click in another window and explicitly authorized one retry, which passed with the unchanged frozen collector. The original failure is retained and excluded for reported external-input interference; the replacement is outside the original randomized order. A Tauri supplemental warmup also overlapped reported computer use; that preparation cohort is retained separately and the whole supplemental lane restarted before measured trials.

Startup/idle endpoints come from H. One action warmup in H hit an accessibility-provider COM query error; the entire action lane was then piloted and recollected in I with bounded read-only retries. No measured action results were pooled across collector versions. Raw failures, retry authorization and all development failures remain preserved.

This compares the six **as-configured hosting stacks** around the same Svelte UI, not security equivalence or language-only overhead. Wails has persistent-profile/native-permission differences; pywebview uses loopback/private-profile cleanup; WinUI is self-contained .NET/Windows App SDK. Client sizing differences were calibrated externally and included in launch observations. See the [candidate configurations and decision plan](../../../NeutronStar-Svelte/HOST-COMPARISON-PLAN.md).

The production fixture is `starlight-en-he-v2`: 16 frozen Svelte files, English/Hebrew/emoji and four local fonts. The supplemental lane has its own matched manifest. Actions are synthetic frontend simulations: no Go CLI, cryptographic throughput, native IPC throughput or backend workload is measured.

## Startup

Milliseconds, median / nearest-rank p95; **n=20** per cell. Fresh/retained refer to profile-directory paths, not post-reboot cold starts. The controlled PowerShell wrapper is not an Explorer gesture or each product Run.ps1.

| Host | Direct fresh | Direct retained | PowerShell fresh | PowerShell retained |
| --- | --- | --- | --- | --- |
| NeutronStar C++ | 2174 / 2659 | 482 / 511 | 2610 / 3259 | 817 / 851 |
| Raw Rust | 2219 / 3072 | 473 / 502 | 2772 / 6174 | 832 / 986 |
| Tauri v2 | 1435 / 1741 | 501 / 587 | 1719 / 2048 | 852 / 910 |
| Wails | 3799 / 4210 | 482 / 520 | 4149 / 4612 | 830 / 848 |
| pywebview | 2029 / 2414 | 2028 / 2348 | 2385 / 2634 | 2393 / 2702 |
| WinUI 3 / C# | 2671 / 2876 | 767 / 930 | 3108 / 3394 | 1123 / 1190 |

UIA Ready requires the heading, fixture, Ready status and both enabled actions. It includes accessibility-provider/polling cost. The separate captured-frame stability endpoint is a proxy, not physical display presentation. Full host-to-window, stable proxy, paired C++ differences and bootstrap intervals are in the JSON summary.

Paired direct retained-path differences against C++ (matched randomized round; 2,000 deterministic bootstrap resamples of the paired median). These intervals describe this machine/cohort, not all Windows devices. Multiple comparisons are exploratory.

| Host | Paired median delta ms | Bootstrap 95% interval ms |
| --- | --- | --- |
| Raw Rust | -10.3 | -23.7 to +11.7 |
| Tauri v2 | +21.6 | +3.8 to +62.9 |
| Wails | -4.9 | -16.3 to +14.9 |
| pywebview | +1542.1 | +1380.1 to +1591.0 |
| WinUI 3 / C# | +297.2 | +276.0 to +326.6 |

## Visible-idle memory and interactions

Memory is the median of **five independent lifetime medians**, each containing 12 samples per state. Private resident and private commit differ; neither is a sum of Task Manager working sets. Actions are input-to-UIA semantic observations from **20 independent usable lifetimes per host**, including the authorized WinUI interference retry. They are not browser scripting or paint time.

| Host | Private resident MiB | Private commit MiB | About open ms | Cancel ms |
| --- | --- | --- | --- | --- |
| NeutronStar C++ | 101.0 | 227.3 | 38.3 | 16.7 |
| Raw Rust | 101.8 | 231.7 | 37.5 | 14.3 |
| Tauri v2 | 98.4 | 214.6 | 49.4 | 35.3 |
| Wails | 95.0 | 278.3 | 50.9 | 14.1 |
| pywebview | 146.3 | 288.8 | 54.2 | 24.8 |
| WinUI 3 / C# | 130.2 | 313.1 | 34.1 | 31.8 |

Unfocused, occluded, minimized and restored states, lifetime CPU and process-count distributions are preserved in `primary-summary.json`. State order was balanced with a five-position cyclic Latin square. Sixty per-second samples per state/host are not sixty independent lifetimes.

| Host | Unfocused private/commit MiB | Occluded private/commit MiB | Minimized private/commit MiB | Restored private/commit MiB |
| --- | --- | --- | --- | --- |
| NeutronStar C++ | 102.0 / 228.7 | 102.2 / 224.1 | 100.5 / 187.8 | 101.9 / 229.7 |
| Raw Rust | 101.8 / 230.0 | 101.7 / 226.7 | 100.3 / 185.5 | 101.8 / 232.1 |
| Tauri v2 | 98.5 / 217.1 | 98.6 / 213.8 | 98.8 / 212.5 | 98.6 / 214.9 |
| Wails | 95.0 / 278.3 | 94.2 / 275.2 | 94.3 / 266.8 | 94.6 / 280.3 |
| pywebview | 146.8 / 285.5 | 147.8 / 284.6 | 148.5 / 282.6 | 147.1 / 290.8 |
| WinUI 3 / C# | 130.1 / 312.7 | 130.4 / 312.1 | 128.4 / 270.1 | 130.3 / 311.7 |

CPU below is percent of one logical core, median of five lifetime medians over one-second deltas. Zero means the median sampled delta was zero; it does not establish zero CPU, energy or background wakeups. Full ranges remain in JSON.

| Host | Visible CPU % | Unfocused CPU % | Occluded CPU % | Minimized CPU % | Restored CPU % | Visible processes |
| --- | --- | --- | --- | --- | --- | --- |
| NeutronStar C++ | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 7 |
| Raw Rust | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 7 |
| Tauri v2 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 7 |
| Wails | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 7 |
| pywebview | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 7 |
| WinUI 3 / C# | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 7 |

## Deployment payload

Current unpruned runtime payloads, excluding the separately installed/shared WebView2 Runtime. These are file sizes, not RAM. Raw C++/Rust include their external production assets; Tauri/Wails embed those assets. WinUI includes its self-contained .NET and Windows App SDK components. No installer/signature/compression comparison is implied.

| Host | Files | Payload MiB | Included PDB MiB |
| --- | --- | --- | --- |
| NeutronStar C++ | 17 | 0.72 | 0.00 |
| Raw Rust | 17 | 0.58 | 0.00 |
| Tauri v2 | 1 | 4.50 | 0.00 |
| Wails | 1 | 10.06 | 0.00 |
| pywebview | 163 | 27.78 | 0.00 |
| WinUI 3 / C# | 537 | 229.88 | 0.04 |

## Capture and observer endpoints

Direct launch medians are separated by profile path (20 attempts per host/profile group). Loading text is included only when actually observed; missing observations are not zero. Pixel classes are heuristics, not FCP/LCP, optical text recognition or physical paint. Requested capture was 20 Hz; observed intervals below show its actual lower rate.

| Host | Profile path | Visible HWND ms | Loading text ms | First accent ms | Frame interval ms | Attempts with black sample |
| --- | --- | --- | --- | --- | --- | --- |
| NeutronStar C++ | fresh | 87 | 1994 (n=17) | 2066 | 97.3 | 17 |
| NeutronStar C++ | retained | 90 | unobserved | 578 | 97.3 | 0 |
| Raw Rust | fresh | 87 | 2121 (n=15) | 2115 | 97.7 | 16 |
| Raw Rust | retained | 87 | unobserved | 583 | 96.9 | 0 |
| Tauri v2 | fresh | 68 | 1380 (n=9) | 1482 | 98.1 | 20 |
| Tauri v2 | retained | 71 | 494 (n=1) | 632 | 97.3 | 0 |
| Wails | fresh | 3619 | unobserved | 3843 | 99.2 | 0 |
| Wails | retained | 360 | unobserved | 565 | 97.7 | 0 |
| pywebview | fresh | 722 | 1901 (n=16) | 2033 | 97.6 | 17 |
| pywebview | retained | 725 | 1786 (n=13) | 2040 | 97.5 | 17 |
| WinUI 3 / C# | fresh | 257 | 392 (n=20) | 2595 | 97.9 | 20 |
| WinUI 3 / C# | retained | 258 | 403 (n=20) | 909 | 97.3 | 0 |

[Per-attempt transition traces](visual-transitions.json) retain the observed loading text, sampled black/white/content changes, UIA Ready and stability proxy on the same clock. Unobserved intermediate states and exact physical durations cannot be recovered from these samples.

Visible-idle summed working set below includes shared pages repeatedly across processes and is **not unique RAM**. It is shown separately from private resident/commit to avoid conflating the metrics.

| Host | Summed working set MiB |
| --- | --- |
| NeutronStar C++ | 374.7 |
| Raw Rust | 371.6 |
| Tauri v2 | 371.0 |
| Wails | 373.8 |
| pywebview | 449.3 |
| WinUI 3 / C# | 478.6 |

## Supplemental large lists

Separately built/staged identical supplemental Svelte assets; **n=20 independent lifetimes** per host. All operations preserve the same keyed-row, filter, tick and remount assertions. These unvirtualized stress cases include potentially substantial UIA traversal cost. A requested 30 Hz burst is not a measured frame rate.

| Host | Create 10k ms | 10k -> 1k ms | Filter to one ms | Remount ms |
| --- | --- | --- | --- | --- |
| NeutronStar C++ | 1617.7 | 792.3 | 74.7 | 76.5 |
| Raw Rust | 1666.2 | 767.3 | 80.9 | 77.2 |
| Tauri v2 | 1628.8 | 806.6 | 73.2 | 77.3 |
| Wails | 1667.1 | 800.0 | 81.8 | 76.7 |
| pywebview | 1642.2 | 761.2 | 83.0 | 77.1 |
| WinUI 3 / C# | 1666.8 | 659.9 | 77.2 | 97.0 |

Complete reverse, splice, update, clear-filter and requested-burst filtering distributions and paired C++ differences are in `supplemental-summary.json`. Supplemental results do not measure production startup.

## Interpretation

- **Keep the C++ baseline.** Raw Rust and C++ are effectively tied on retained-path Ready (473 versus 482 ms; paired interval crosses zero). This study gives no performance reason to rewrite the existing host in Rust.
- **Tauri is the strongest complete-framework candidate here.** Retained Ready is close to C++, private resident memory is in the same group, and its fresh-path median is lower. The study does not isolate which startup-policy, protocol or initialization difference caused that advantage. Choose it for required framework features after separate security/admission checks.
- **Wails remains viable for a Go product.** Retained Ready matches the raw hosts and private resident is slightly lower, but fresh-profile launch and private commit are higher. Persistent-profile/native-policy differences prevent a pure language comparison.
- **pywebview and WinUI are more expensive in these configurations.** pywebview has about 45 MiB more private resident memory than C++; its private-profile cleanup means retained paths do not retain equivalent caches. WinUI has about 29 MiB more private resident and a slower retained launch. These are this packaged Python and untrimmed self-contained .NET/Windows App SDK deployments, not universal toolkit limits.
- The Svelte renderer is unchanged across these six hosts. Large-list differences include native hosting, Chromium and accessibility-provider work; do not attribute every millisecond to a native language or infer that one host changes Svelte reactivity. Do not directly pool these timings with the historical nine-frontend cohort: fixture, collector and run conditions differ.
- **No host wins every interaction.** WinUI had the lowest observed 10k-to-1k replacement median (660 ms versus C++ 792 ms), despite its higher startup/memory costs. About-open and Cancel orderings also differ. The same-renderer list creation medians cluster around 1.62-1.67 seconds; these UIA-inclusive stress cases do not establish a universal rendering winner.
- All selected observations passed their semantic/lifecycle checks. Original failures and the user-authorized interference retry remain visible. UIA checks are not physical accessibility acceptance. The older intermittent early-initialization lifecycle concern is not closed by these bounded close probes.

## Scope and reproducibility

- One Windows 11 machine, Ryzen 9 5900X, 32 GiB RAM, RTX 2070 SUPER, 3840 x 2160 / 60 Hz, 200% DPI in the accepted pilot. Read the environment record and per-attempt DPI/geometry for exact evidence.
- Installed Evergreen WebView2 was checked from actual target process modules for every normal attempt. Runtime changes stop collection.
- Same backend (UIA3) for all six; .NET collector pages are already loaded before target launch. File hashing also warms OS caches. This is an instrumented lab comparison, not untouched-machine cold startup.
- Other user applications were not stopped. The serial watcher and collector add observer overhead; target CPU/private memory excludes those processes. Twenty samples give limited tail precision; p95 and exploratory bootstrap intervals should not be treated as service-level guarantees.
- Only discovered PID-and-creation-time-verified descendants are attributed. Discovery is sampled, so very short-lived children can be missed. Normal close and 18 bounded first-visible-window close probes are not exhaustive lifecycle proof.
- Hardware presentation, GPU allocations/frame pacing, energy, physical Narrator/NVDA/IME/high-contrast/multi-monitor testing, clean-machine deployment, and end-to-end security parity are not established.
- Primary first/repeat `pair-*` cases reuse paths primed by the pilot. The pilot has the initial path-use pairs; neither is a controlled OS-cold restart.

Use differences and uncertainty together. A tiny median advantage does not establish a universally better host. The raw C++/Rust pair is closer to native-implementation parity than the six-stack comparison. Packaging, OS integration, security-policy ownership and long-term maintenance remain product decisions.

[Primary protocol](../../measurement/PROTOCOL.md)  |  [Collector instructions](../../measurement/README.md)  |  [Raw metadata archive](raw-metadata.zip)  |  [Primary JSON](primary-summary.json)  |  [Supplemental JSON](supplemental-summary.json)
