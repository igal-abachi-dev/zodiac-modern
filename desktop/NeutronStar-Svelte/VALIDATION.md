# Standalone baseline validation

2026-10-18: build plumbing repaired after copying the Svelte app and four private
packages out of the nine-app workspace. No original benchmark sources/results
were modified. Svelte UI/workflow behavior and Nano Stores ownership are retained.

| Check | Result |
| --- | --- |
| Pinned install, scripts disabled | Passed; pnpm 12.8.1 / Node 24.21.0 |
| Subsequent frozen-lockfile install | Passed; no resolution required |
| Package TypeScript checks + app/Svelte check | Passed; zero Svelte errors/warnings |
| Copied domain/style/timer/subscription/workload regressions | 6/6 passed |
| Production build + static asset audit | Passed; 17 assets |
| All production asset hashes versus original Svelte `dist/` | Identical, including CSS/fonts/icons/JS/HTML |
| Production Edge browser test under enforced CSP | 1/1 passed: readiness, simulation completion/cancel/reset, dialog/Escape/focus return, reload, empty storage and no observed CSP/page errors |
| Rebuilt `dist-test` under actual NeutronStar host | Passed smoke receipt; four resources and one navigation blocked as expected |
| Rebuilt `dist-workload-test` under actual NeutronStar host | Passed smoke receipt; four resources and one navigation blocked as expected |

Native checks used installed WebView2 **155.0.4283.60**, the decorated,
normal-memory baseline, bridge off, and separate task-specific profiles. Both
test windows auto-closed; no host process remained in the subsequent process
check. This is not a comprehensive process-tree lifecycle acceptance test.

Host SHA-256:
`4AE49ADC08D33CD0F590A6FAA3EE8AE2C6EEF309D307AD29ABBCAA3DFF7C0928`.
Local receipts: `.cache/native-smoke.jsonl`, `.cache/workload-smoke.jsonl`;
production manifest: `.cache/frontend-manifest.json`.

These checks establish the relocated baseline's build/correctness continuity,
not new performance results. Alternative hosts, a host comparison collector,
performance cohorts, physical AT/IME/DPI/high-contrast acceptance and the existing
early-initialization-close concern remain open. No runes-only state comparison
has been performed. Copied diagnostic outputs have not been revalidated here.
