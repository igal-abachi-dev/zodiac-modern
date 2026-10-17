# NeutronStar measured results — 2026-10-17 cohort

[Interpretation against the source-level findings](INTERPRETATION.md).

Nine stock frontends in the same clang-cl/Ninja Release host, WebView2 155.0.4283.60. Ryzen 9 5900X, RTX 2070 SUPER, Windows 11 build 26200; 960 × 640 DIP at 200% DPI (1920 × 1280 client pixels), 60 Hz. Normal memory policy, native decorations, bridge off, InPrivate. Patched offline htmx is labeled throughout.

Primary collection: 900 passing attempts: 18 pilot, 36 first/repeat pairs, 108 warmups, 720 measured startups, nine five-state idle lifetimes and nine 20-cycle action lifetimes. Supplemental collection: three pilot, 27 warmup and 180 measured independent process attempts. No rejected attempt is removed from these accepted cohorts; earlier collector failures remain separate.

## Startup and visible-idle memory

Startup is host process creation → UIA-observed Ready with enabled controls. Values are median / nearest-rank p95 milliseconds, n=20 per startup condition. Fresh path is not OS-cold. Memory is median MiB across 60 samples in one lifetime per app; those samples are correlated and do not establish a statistically replicated memory ranking.

| App | Fresh path ms | Retained path ms | Private resident MiB | Private commit MiB |
| --- | ---: | ---: | ---: | ---: |
| vanilla | 2279.8 / 2710.4 | 545.5 / 628.8 | 104.27 | 227.01 |
| svelte | 2245.5 / 4026.3 | 529.2 / 644.1 | 101.52 | 226.44 |
| solid | 2211.7 / 2705.4 | 524.0 / 624.1 | 100.74 | 222.52 |
| preact | 2232.7 / 3233.1 | 574.2 / 861.0 | 104.01 | 244.78 |
| vue | 2271.9 / 3060.2 | 527.1 / 837.8 | 101.25 | 227.39 |
| react | 1998.5 / 2572.0 | 685.1 / 746.5 | 102.15 | 243.51 |
| lit | 2176.1 / 3275.3 | 556.1 / 629.0 | 104.82 | 228.03 |
| alpine | 2333.2 / 3043.1 | 534.5 / 648.8 | 106.76 | 235.83 |
| htmx (patched offline) | 2014.2 / 2748.2 | 569.7 / 622.1 | 102.12 | 228.79 |

Private resident excludes shared pages and GPU allocations; commit is a different measure. Summed working sets are not unique RAM. Absolute startup includes WebView2/profile initialization, fonts and observation overhead; it is not JS execution time.

## Semantic interaction and list response

Median / p95 ms, n=20. About uses real mouse input → UIA observation. Supplemental list operations include dispatch/provider cost and use the same summary/first-key predicates across renderers. They are not physical input-to-paint, INP or pure rendering time. The 1,000-row operation follows 10,000-row creation. htmx uses its declared explicit client list controller.

| App | About open ms | Replace 10,000 ms | Replace 1,000 ms | Filter during requested 30 Hz ms |
| --- | ---: | ---: | ---: | ---: |
| vanilla | 39.5 / 70.0 | 2100.4 / 2171.4 | 2252.1 / 2424.9 | 261.5 / 281.3 |
| svelte | 11.6 / 32.0 | 2126.5 / 2218.6 | 2266.4 / 2441.7 | 254.3 / 278.5 |
| solid | 11.6 / 37.1 | 2457.5 / 2568.3 | 1645.4 / 1854.6 | 260.8 / 287.5 |
| preact | 11.9 / 38.9 | 2437.6 / 2551.3 | 1433.1 / 1680.0 | 258.5 / 274.9 |
| vue | 13.0 / 33.6 | 2086.2 / 2159.0 | 2298.1 / 2406.0 | 258.6 / 282.0 |
| react | 28.4 / 36.4 | 2586.9 / 2628.7 | 1584.0 / 1855.8 | 255.2 / 278.3 |
| lit | 40.8 / 69.0 | 2457.4 / 2504.3 | 1007.3 / 1071.1 | 213.8 / 310.9 |
| alpine | 39.0 / 70.1 | 2956.7 / 3043.9 | 1136.6 / 1273.6 | 289.4 / 308.5 |
| htmx (patched offline) | 38.7 / 70.1 | 2084.3 / 2175.6 | 2234.1 / 2425.1 | 256.1 / 277.7 |

## Background observations

| App | Visible resident MiB | Minimized resident MiB | Restored resident MiB | Visible CPU mean / p95 % of one core |
| --- | ---: | ---: | ---: | ---: |
| vanilla | 104.27 | 97.70 | 101.12 | 0.434 / 4.562 |
| svelte | 101.52 | 92.52 | 95.04 | 0.411 / 3.044 |
| solid | 100.74 | 91.83 | 94.98 | 0.435 / 4.423 |
| preact | 104.01 | 97.65 | 100.76 | 0.409 / 3.046 |
| vue | 101.25 | 92.45 | 95.49 | 0.384 / 3.047 |
| react | 102.15 | 94.21 | 97.31 | 0.382 / 4.419 |
| lit | 104.82 | 94.94 | 97.69 | 0.180 / 1.521 |
| alpine | 106.76 | 98.05 | 100.75 | 0.482 / 3.039 |
| htmx (patched offline) | 102.12 | 92.28 | 95.46 | 0.229 / 1.521 |

One lifetime and a fixed state order per app. Low CPU differences are descriptive, not energy-efficiency or causal framework rankings. Window states were applied by the collector; continuous native foreground/occlusion telemetry was not recorded. Restore-state sampling is not restore-to-physical-paint latency.

## Lifecycle and accessibility-provider observations

All 1110 accepted attempts passed their run-owned host/helper shutdown checks. 21 bounded UIA provider-query gaps occurred in 21 primary attempts; 0 worker errors remained. Gaps are initialization/provider observations, not evidence of framework leaks.

| App | Primary attempts with recorded provider gaps |
| --- | ---: |
| vanilla | 5 |
| svelte | 0 |
| solid | 0 |
| preact | 0 |
| vue | 0 |
| react | 0 |
| lit | 0 |
| alpine | 9 |
| htmx (patched offline) | 7 |

The first collector stopped on an unhandled provider detach; the next stopped after stale parent PIDs admitted two unrelated older processes. Neither was an app failure, and no unrelated process was terminated. Creation-time ancestry regression tests and bounded provider recovery precede the accepted cohorts. The older early-initialization host shutdown concern remains open: these normal Ready-to-close runs do not close that gate.

The synthetic UIA checks do not replace Narrator/NVDA, keyboard/IME, high contrast, multi-monitor or 100/150/200% DPI product acceptance. Different text-node granularity affects provider work; React’s split supplemental summary was handled by equal ID-scoped aggregation, not frontend changes.

## Evidence and limits

- [Full primary tables](PRIMARY.md), [full supplemental tables](SUPPLEMENTAL.md), [startup CSV](startup.csv), [primary JSON](primary.json), [supplemental JSON](supplemental.json), [provider observations](provider.json).
- [Raw metadata archive](raw-metadata.zip) includes original per-attempt records, process samples, frame indexes, action traces, launch receipts and native event logs; it excludes profiles and PNG images. Full client-frame PNGs and exact collector artifacts remain in the recorded local cohort directories.
- [Evidence index](evidence.json) records source cohort paths and artifact hashes. The original interim summary is retained: its fresh/retained grouping typo was corrected only in derived reports after collection. Final analysis reads correctly labeled raw records.
- GDI captures client pixels at measured variable intervals; physical panel scan-out and Explorer gesture latency are unavailable. UIA provider activation, capture and collector CPU perturb startup. Integrity hashing warms file caches.
- GPU/frame pacing, I/O/energy, post-reboot OS-cold runs, 10/30/60 Hz presentation budgets, long heap/remount trends and physical accessibility remain open. No Go/crypto throughput was tested.
- These compare stock frontend integrations in one WebView2 host. A later Electron/Avalonia comparison needs equivalent apps plus launch/UIA adapters; current document-scoped UIA locators are WebView-specific. Internal browser metrics cannot be directly equated to Skia metrics.
