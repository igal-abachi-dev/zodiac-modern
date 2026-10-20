# Standalone baseline validation

## Current fixture revision — 2026-10-20

The current fixture is `starlight-en-he-v2`: English, Hebrew and emoji; Inter
400/500/600 plus Noto Sans Hebrew 400. It supersedes the 17-asset fixture described
in historical entries below. See [fixture boundaries](FIXTURE-REVISION.md).

- TypeScript/package/Svelte checks passed with zero Svelte errors/warnings.
- Seven domain/state/style/workload unit tests passed. The initial sandboxed
  runner failed during OS account lookup; the permission-enabled retry passed.
- All seven production/test/workload/diagnostic asset variants rebuilt;
  production audit and preview policy test passed with **16 production assets**.
- The nine-app workspace's revised Svelte production asset tree is byte-identical
  to this standalone build. Staged Wails/pywebview and packaged pywebview frontend
  trees match the same manifest exactly; Tauri's build verifies its embedded set.
- All five native hosts passed the shared production UIA/real-input workflow.
  Reports: `../host-test-support/.cache/en-he-dbb3d95683a44c308945507c7ce63173/`.
- Scan of **74 current asset trees / 1,189 files** found no removed-language
  sample text or font assets. Standard SVG attribute handling inside framework
  runtimes and original historical result evidence were intentionally retained.
  Receipt: `.cache/fixture-v2-verification.json`.
- Current frontend lock SHA-256:
  `442b35b6dc5c00c55789c3aaf48054e2d2f9b33f942797a844a2f9b1945e4cb1`.
  Manifest SHA-256:
  `6bf90db01cfc3df86a27f401c9e961ff9157790aa734be5f13238b5745266415`.

These are correctness checks, not comparative benchmarks, complete native-policy
acceptance, helper-lifecycle acceptance or a comprehensive accessibility review.

## Historical validation

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

## Fastify browser-preview change (2026-10-18)

Replaced the local `node:http` fixture with Fastify **5.12.7** and
`@fastify/static` **8.3.0**, in a separately locked `scripts/preview/` tooling
package. A frozen install passed. No frontend dependency resolution, asset
rebuild or native host changes were required for this preview change.

- `node --test tests/preview.test.mjs`: passed. Checks all 17 response bodies
  against built files, CSP/cache/MIME-related headers, and 12 root/query/missing/
  forbidden-path/method/Host cases. Missing assets do not receive SPA fallback.
- Production Edge Playwright test against the new local Fastify server:
  **1/1 passed**, including readiness, workflow completion/cancellation, modal
  focus/Escape, reload, empty storage and no observed CSP/page errors.
- Main frontend lock hash remains
  `556a5bb02d257469d45738bbc7cd8e7240228026ed38e3648cbab9b6b129dbf9`;
  frontend manifest hash remains
  `211ec53bbf3677974de1f1987aaadba58530739662dadcf5763bb300029f6902`.
  The host asset verifier still reports 17 unchanged files.

An initial sandboxed browser invocation stalled and was stopped using its
confirmed task-owned Node process IDs. A first retry correctly refused the busy
port. The completed permission-enabled retry passed; neither failed launch is
a benchmark sample or discarded rendering result. Test runner helpers were
managed separately from interactive native-host instances.

See [browser/server choices](BROWSER-PREVIEW.md) and the
[Win32/Tauri architecture note](HOST-COMPARISON-PLAN.md#win32-window-versus-tauri-window).
The four alternative hosts now have implementation/builds; native admission and
comparative measurements remain separate from the baseline/browser checks.

### Nginx-informed preview follow-up (2026-10-18)

The [source-review notes](BROWSER-PREVIEW.md#nginx-source-review-2026-10-18)
record a focused read of Nginx's static-file, URI-parser and headers-filter code.
It exposed two differences in our actual responses: an early malformed-URL 400
omitted the security headers, and the static plugin replaced the requested JS
MIME with its own valid but different inference. Explicit `onBadUrl`, final
response headers and successful-asset MIME handling now correct those cases.

- Preview regression test passed: all 17 byte-identical assets with exact MIME,
  content length and headers; 16 request/rejection cases; no validators, range
  response or compression variant under the frozen preview policy.
- The normal browser command refused the occupied port 4188. That existing
  instance was left untouched. A separate task-owned Fastify server on an
  OS-assigned loopback port passed the Edge CSP/readiness/dialog/Escape/focus,
  simulation completion/cancel/reset, reload and empty-storage regression.
  Its browser and server were closed in `finally`.
- No Nginx performance comparison, Internet deployment acceptance, native host
  modification or frontend asset rebuild occurred. Node HTTP-parser failures
  before routing and atomic file-open confinement remain outside this test.
