# NeutronStar external measurements

Runtime: 155.0.4283.60. Failed retained attempts: 0.

Observed lab results; no physical presentation or universal framework score.

| App | Launch | Profile | n | Host → UIA Ready median / p95 ms | Launch → Ready median ms |
| --- | --- | --- | ---: | ---: | ---: |
| alpine | direct | fresh | 20 | 2333.2 / 3043.1 | 2334.4 |
| alpine | direct | retained | 20 | 534.5 / 648.8 | 535.8 |
| alpine | powershell | fresh | 20 | 2330.5 / 3314.1 | 2597.6 |
| alpine | powershell | retained | 20 | 497.6 / 878.0 | 768.5 |
| htmx | direct | fresh | 20 | 2014.2 / 2748.2 | 2015.4 |
| htmx | direct | retained | 20 | 569.7 / 622.1 | 571.2 |
| htmx | powershell | fresh | 20 | 2090.7 / 2409.4 | 2357.7 |
| htmx | powershell | retained | 20 | 505.7 / 644.5 | 776.1 |
| lit | direct | fresh | 20 | 2176.1 / 3275.3 | 2177.3 |
| lit | direct | retained | 20 | 556.1 / 629.0 | 557.3 |
| lit | powershell | fresh | 20 | 2230.5 / 2736.6 | 2495.8 |
| lit | powershell | retained | 20 | 493.6 / 622.5 | 768.7 |
| preact | direct | fresh | 20 | 2232.7 / 3233.1 | 2233.9 |
| preact | direct | retained | 20 | 574.2 / 861.0 | 575.4 |
| preact | powershell | fresh | 20 | 2283.7 / 2733.3 | 2553.8 |
| preact | powershell | retained | 20 | 527.1 / 649.4 | 799.1 |
| react | direct | fresh | 20 | 1998.5 / 2572.0 | 1999.6 |
| react | direct | retained | 20 | 685.1 / 746.5 | 686.9 |
| react | powershell | fresh | 20 | 2162.0 / 2746.3 | 2438.0 |
| react | powershell | retained | 20 | 669.3 / 732.5 | 939.7 |
| solid | direct | fresh | 20 | 2211.7 / 2705.4 | 2212.9 |
| solid | direct | retained | 20 | 524.0 / 624.1 | 525.2 |
| solid | powershell | fresh | 20 | 2511.0 / 6006.1 | 2786.3 |
| solid | powershell | retained | 20 | 499.2 / 640.7 | 774.9 |
| svelte | direct | fresh | 20 | 2245.5 / 4026.3 | 2246.7 |
| svelte | direct | retained | 20 | 529.2 / 644.1 | 530.4 |
| svelte | powershell | fresh | 20 | 2244.1 / 2570.6 | 2511.9 |
| svelte | powershell | retained | 20 | 507.1 / 873.8 | 778.2 |
| vanilla | direct | fresh | 20 | 2279.8 / 2710.4 | 2281.0 |
| vanilla | direct | retained | 20 | 545.5 / 628.8 | 546.8 |
| vanilla | powershell | fresh | 20 | 2273.3 / 2820.8 | 2545.2 |
| vanilla | powershell | retained | 20 | 520.1 / 627.6 | 789.5 |
| vue | direct | fresh | 20 | 2271.9 / 3060.2 | 2273.1 |
| vue | direct | retained | 20 | 527.1 / 837.8 | 528.3 |
| vue | powershell | fresh | 20 | 2225.0 / 3252.1 | 2497.3 |
| vue | powershell | retained | 20 | 520.3 / 667.4 | 792.8 |

## One-lifetime idle samples

| App | State | Samples | Private resident median MiB | Private commit median MiB | CPU mean / p95 % of one core |
| --- | --- | ---: | ---: | ---: | ---: |
| alpine | visible | 60 | 106.76 | 235.83 | 0.48 / 3.04 |
| alpine | unfocused | 60 | 102.60 | 231.25 | 1.36 / 15.26 |
| alpine | occluded | 60 | 100.23 | 228.28 | 0.00 / 0.00 |
| alpine | minimized | 60 | 98.05 | 183.45 | 0.03 / 0.00 |
| alpine | restored | 60 | 100.75 | 231.04 | 0.31 / 3.03 |
| htmx | visible | 60 | 102.12 | 228.79 | 0.23 / 1.52 |
| htmx | unfocused | 60 | 99.13 | 225.08 | 1.08 / 10.57 |
| htmx | occluded | 60 | 94.08 | 221.78 | 0.00 / 0.00 |
| htmx | minimized | 60 | 92.28 | 180.16 | 0.00 / 0.00 |
| htmx | restored | 60 | 95.46 | 230.04 | 0.00 / 0.00 |
| lit | visible | 60 | 104.82 | 228.03 | 0.18 / 1.52 |
| lit | unfocused | 60 | 101.55 | 223.82 | 1.11 / 4.52 |
| lit | occluded | 60 | 96.61 | 220.84 | 0.03 / 0.00 |
| lit | minimized | 60 | 94.94 | 184.23 | 0.00 / 0.00 |
| lit | restored | 60 | 97.69 | 231.12 | 0.00 / 0.00 |
| preact | visible | 60 | 104.01 | 244.78 | 0.41 / 3.05 |
| preact | unfocused | 60 | 102.12 | 242.14 | 1.21 / 9.14 |
| preact | occluded | 60 | 99.44 | 238.74 | 0.00 / 0.00 |
| preact | minimized | 60 | 97.65 | 183.82 | 0.05 / 0.00 |
| preact | restored | 60 | 100.76 | 216.62 | 0.05 / 0.00 |
| react | visible | 60 | 102.15 | 243.51 | 0.38 / 4.42 |
| react | unfocused | 60 | 100.70 | 242.94 | 1.59 / 10.67 |
| react | occluded | 60 | 98.26 | 239.47 | 0.15 / 1.52 |
| react | minimized | 60 | 94.21 | 183.88 | 0.00 / 0.00 |
| react | restored | 60 | 97.31 | 216.27 | 0.10 / 1.51 |
| solid | visible | 60 | 100.74 | 222.52 | 0.44 / 4.42 |
| solid | unfocused | 60 | 98.53 | 220.58 | 1.26 / 13.77 |
| solid | occluded | 60 | 96.13 | 217.86 | 0.00 / 0.00 |
| solid | minimized | 60 | 91.83 | 180.71 | 0.00 / 0.00 |
| solid | restored | 60 | 94.98 | 228.19 | 0.00 / 0.00 |
| svelte | visible | 60 | 101.52 | 226.44 | 0.41 / 3.04 |
| svelte | unfocused | 60 | 98.62 | 223.06 | 1.26 / 9.06 |
| svelte | occluded | 60 | 94.31 | 219.84 | 0.00 / 0.00 |
| svelte | minimized | 60 | 92.52 | 182.67 | 0.00 / 0.00 |
| svelte | restored | 60 | 95.04 | 228.55 | 0.03 / 0.00 |
| vanilla | visible | 60 | 104.27 | 227.01 | 0.43 / 4.56 |
| vanilla | unfocused | 60 | 101.83 | 224.59 | 1.49 / 9.08 |
| vanilla | occluded | 60 | 99.53 | 224.92 | 0.03 / 0.00 |
| vanilla | minimized | 60 | 97.70 | 184.48 | 0.00 / 0.00 |
| vanilla | restored | 60 | 101.12 | 232.64 | 0.18 / 1.53 |
| vue | visible | 60 | 101.25 | 227.39 | 0.38 / 3.05 |
| vue | unfocused | 60 | 99.26 | 225.34 | 0.98 / 7.59 |
| vue | occluded | 60 | 96.54 | 222.14 | 0.00 / 0.00 |
| vue | minimized | 60 | 92.45 | 180.57 | 0.00 / 0.00 |
| vue | restored | 60 | 95.49 | 229.84 | 0.05 / 0.00 |

## Limits

- UIA readiness and input response are semantic observations, not physical display latency.
- Foreground client-area GDI frames have measured variable intervals; sub-frame flashes may be missed.
- Process V2 private resident set and private commit differ; summed working set double-counts shared pages.
- Fresh path is not OS-cold; controlled PowerShell is not an Explorer gesture.
- Post-restart, GPU attribution and physical AT/IME validation are not included.
