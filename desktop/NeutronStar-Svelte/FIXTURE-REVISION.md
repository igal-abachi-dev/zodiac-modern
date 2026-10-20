# Current desktop GUI fixture

2026-10-20: user-requested scope change applied to every maintained desktop GUI
project, including the original nine frontend sources. This is a new fixture,
not a performance optimization secretly applied to one host.

- Fixture ID: **`starlight-en-he-v2`**.
- Display text: **Zodiac GUI benchmark — שלום — 🌠**.
- Workload row text: `row-<id> שלום`; filtering covers exact IDs, Hebrew,
  a common English prefix and a non-matching string.
- Local fonts: Inter Latin 400/500/600 and Noto Sans Hebrew 400.
- Arabic sample text, font face/copy step, font readiness request and font
  dependency are removed. No change to general Unicode input support or crypto.
- Readiness still waits for every required font, decoded icons,
  `document.fonts.ready` and two animation frames. It now has four required fonts.

The standalone production build has **16 files**, down from 17. Removing the
unused font removes **48,840 bytes** of font data per asset tree, plus small
CSS/JavaScript changes. This is not a measured startup or memory saving.

## Current identity

Frontend lock SHA-256:
`442b35b6dc5c00c55789c3aaf48054e2d2f9b33f942797a844a2f9b1945e4cb1`.

Production manifest SHA-256:
`6bf90db01cfc3df86a27f401c9e961ff9157790aa734be5f13238b5745266415`.

Tauri, Wails and pywebview were rebuilt from this manifest. The C++ and raw Rust
hosts read the same asset tree directly. All five production window workflows
passed against this revision. It is the new input baseline for later host
measurements; native admission/lifecycle gates remain separate.

## Historical results

The original `webview2-raw-bench/8-framework-test/results/2026-10-17/` numerical
results and evidence remain unchanged. They describe the earlier multilingual
fixture, not the newly rebuilt outputs. Old source/byte tables and readiness
timings must not be relabeled as measurements of this revision. Historical
validation receipts remain historical; current receipts have new hashes.

Use identical v2 assets/readiness rules across the five-host comparison. Any
further font/CSS or state changes require another shared revision before timing.
