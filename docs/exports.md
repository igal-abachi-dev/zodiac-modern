# Sharing and print artifacts

Encrypting displays the complete raw ciphertext above the mixed glyph grid.
**Copy raw** and **Download ciphertext (.txt)** are the primary delivery actions;
they contain the complete canonical Base64URL without labels or whitespace.
The v1 receiver requires that raw text. Artwork is optional presentation.

The complete PNG uses the same S64M1 mixed presentation as the grid: actual
payload characters at positions 1/5/9…, sparse mirrors/rotations, and rotating
CircleOff/CircleDashed/Skull nulls after each complete eight payload characters.
The original frozen S64L1 payload glyphs remain intact, including Crosshair for
`j`. The earlier development null/`j` substitution was corrected before release.
All vectors remain outlines. These decorations provide no additional encryption.

**Copy artwork image** creates one complete PNG when it fits the bitmap bounds.
A 584-character result has 657 display cells and fits one 32-column image,
despite needing two archival pages. PNGs include public identity, raw-delivery
guidance and local attribution/license notices. Canvases never exceed 4,096 px
per dimension or 16 megapixels. Larger results explicitly offer only the selected
numbered archival page; the full raw text and full SVG remain available.

**Download full one-line SVG** includes every raw character in deterministic
left-to-right S64SVG1 order with frozen S64L1 definitions and escaped public
metadata. It remains one line even for long output. Downloaded metadata JSON
contains exact raw text and all page/row checks separately from the `.txt`.
There is no SVG/XML importer, image machine recovery or inline-SVG email promise.

## Gmail first, Outlook second

Use synthetic content for client checks. In Gmail, open an unsent draft, click
Copy artwork image on the sender, focus the draft body, and paste. Include the
separately copied raw text or attach `ciphertext.txt`. If image copy/paste is
unavailable, download PNG and attach it. Repeat in Outlook as the secondary
client. Attach SVG as a file only when vector artwork is wanted.

Check that the image is complete, inspect the first/last rows, and compare
downloaded or pasted raw text exactly. Image and raw clipboard representations
are separate actions; do not assume an email client pastes both. Permission
denial exposes a local image save fallback and keeps raw/manual copy/download
available. Success feedback follows the resolved clipboard write, not the click.
Saved files, email drafts, clipboard managers and printers persist outside this tab.

| Target                                 | Current evidence                                                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chromium on Windows                    | Native PNG write and image paste into a synthetic local editable target; exact raw text paste; denial/save fallback tested.                                                          |
| Firefox on Windows                     | Native PNG write resolves, but image paste is empty in the headless local target. Exact raw text paste and PNG save/denial fallbacks tested; image paste compatibility is unclaimed. |
| Stable Edge on Windows, file:// sender | Synthetic imports/encryption, raw/SVG/PNG/JSON save and print preparation/cleanup tested. Native email draft paste is unclaimed.                                                     |
| Gmail web, primary                     | Actual unsent draft paste and attachment evidence pending.                                                                                                                           |
| Outlook web, secondary                 | Actual unsent draft paste and attachment evidence pending.                                                                                                                           |

The browser clipboard checks are not email-client evidence. No messages are
sent, email APIs invoked or remote artwork hosted by this application.

## Archival pages and PDF

Open **Archival pages and print** for numbered SVG/PNG pages or Print / Save as
PDF. Archival pages use S64L1, 512 raw characters per page, sixteen columns and
32 rows. Printed raw/check rows align beside the glyphs. Page headers include
the full recipient and envelope identity; page checks show twelve hex characters
and row checks eight. These public checks detect accidental transcription errors,
not sender authenticity. Recover raw/transcribed rows locally; all chunks and
the final envelope checksum must match.

Default print scope includes every ciphertext page, independently of screen
paging, plus one disclosed attribution/license sheet. Selected-page scope is
labeled partial. Choose A4 or Letter with 20 mm margins and disable browser
headers/footers. Raw/check text is at least 9 pt. Print content is created only
on request from the immutable result, and removed after print/cancellation or
clear. Composer and key-entry controls are excluded. If a browser misses its
afterprint event, **Close print document** removes the temporary content.

Actual Chromium PDFs are extracted independently, every row/page check and final
envelope hash recomputed, and recovered raw independently decrypted using the
synthetic Go oracle. First/middle/final ciphertext pages and the license sheet
are rendered for visual inspection. This is author-run evidence, not an
independent review or release approval.

## Repeat the development checks

Use the pinned installed toolchains in a normal Windows context. The existing
receiver evidence must be current before the M1/M3 gate can proceed. PDF QA is
local development tooling only; install its pinned renderer if absent:

```powershell
python -m pip install --target .cache/pdf-qa -r scripts/pdf-qa-requirements.txt
pnpm check:m3
pnpm preview:refresh
```

`check:m3` runs the complete M1 regression/build/CSP suite, export/browser tests,
PDF row/check/Go recovery, and stable Edge offline export case. Evidence is in
`docs/reviews/e06-evidence.json`; synthetic PDFs and rendered pages are under
`artifacts/exports/`. Actual Gmail/Outlook paste remains an explicit review gate.
Reload <http://127.0.0.1:4324> after refreshing the preview.
