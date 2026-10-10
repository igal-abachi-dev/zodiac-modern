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

**Download full SVG** includes the complete S64M1 mixed grid in the same 32-column
presentation as the screen and complete PNG, including literals, sparse
mirrors/rotations and nulls. Embedded metadata contains exact raw text and all
page/row checks separately from the `.txt`. It is artwork, not an SVG/XML
importer or a promise of inline-SVG email support.
There is no SVG/XML importer, image machine recovery or inline-SVG email promise.

## Email providers and MIME delivery

The priority client matrix is **Gmail (primary), Outlook/Microsoft 365, Proton Mail, and iCloud Mail**. General sharing guidance also applies to Yahoo Mail, Zoho Mail, QQ Mail, NetEase Mail, Mail.ru, Yandex Mail, AOL Mail, and GMX Mail.

These services carry MIME messages, but MIME does not make their editors, clipboard handling, attachment filters, or rendered artwork identical. Raw Base64URL text and the downloaded `.txt` attachment are the portable baseline. A downloaded attachment should be compared byte-for-byte with the original raw export; if using body text, preserve the complete raw sequence and account for presentation line wrapping when restoring locally. PNG is optional artwork; SVG is an optional file attachment, never required for recovery. No provider is claimed tested solely because it uses MIME.

Use synthetic content for client checks. In Gmail, open an unsent draft, click
Copy artwork image on the sender, focus the draft body, and paste. Include the
separately copied raw text or attach `ciphertext.txt`. If image copy/paste is
unavailable, download PNG and attach it. Repeat in Outlook/Microsoft 365, Proton Mail, and iCloud Mail. Attach SVG as a file only when vector artwork is wanted.

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
| Outlook / Microsoft 365 web            | Actual unsent draft paste and attachment evidence pending.                                                                                                                           |
| Proton Mail web                        | Actual unsent draft paste and attachment evidence pending.                                                                                                                           |
| iCloud Mail web                        | Actual unsent draft paste and attachment evidence pending.                                                                                                                           |
| Other listed providers                 | Raw-text / `.txt` delivery guidance only; provider-specific paste and attachment behavior unverified.                                                                                |

The browser clipboard checks are not email-client evidence. No messages are
sent, email APIs invoked or remote artwork hosted by this application.

## Browser-download links

The exported ciphertext `.txt` can also be uploaded to Proton Drive, Google Drive, Wormhole, or MEGA (mega.nz), then shared as a browser-download link. This is a manual transport workflow; Zodiac has no upload API, service integration, or account access. Download the `.txt` and compare it exactly with the source export before decryption. Always include the raw `.txt`; PNG/SVG may be accompanying artwork. Anyone who obtains the ciphertext still needs the matching private key to decrypt it. Link services can retain account, file-size, and transfer metadata; Zodiac encryption does not hide those. These routes are supported by the raw-file contract, with provider-specific upload/download results unverified.

Additional manual ciphertext carriers include OneDrive, iCloud Drive, Dropbox, WeTransfer, MediaFire, TeraBox, Box, and Sync.com. Proton Drive remains the preferred route in this guide. This list describes delivery options, not a provider-security ranking or completed compatibility trials. Zodiac encryption protects the ciphertext contents; provider account security, metadata, link permissions and retention need their own assessment.

## Archival pages and PDF

**Archival pages and print** is expanded by default for numbered SVG/PNG pages or Print / Save as
PDF. Each archival page presents its 512 raw characters in the S64M1 mixed grid.
The mixed token sequence wraps continuously in a 16-cell-wide layout, matching
the main grid. Checked raw rows remain beside the corresponding grid positions,
with sixteen raw characters per checked row and 32 rows per full page. Inserted
nulls remain visible in sequence. Printed headers show a recipient
fingerprint masked to its first 12 and final 3 characters, the envelope identity
and a 12-hex page check; row checks show eight. These public checks detect accidental transcription errors,
not sender authenticity. Recover raw/transcribed rows locally; all chunks and
the final envelope checksum must match.

Default print scope includes every ciphertext page, independently of screen
paging. The print pages omit the product title, attribution sheet, recovery notes
and full recipient fingerprint; the visible fingerprint keeps its first 12 and
final 3 characters. A small encryption-profile/key-size label sits in the footer
to the left of the page number.
Selected-page scope is labeled partial. Choose A4 or Letter with 20 mm margins
and disable browser headers/footers. Raw/check text is at least 9 pt. Print content is created only
on request from the immutable result, and removed after print/cancellation or
clear. Composer and key-entry controls are excluded. If a browser misses its
afterprint event, **Close print document** removes the temporary content.

Actual Chromium PDFs are extracted independently, every row/page check and final
envelope hash recomputed, and recovered raw independently decrypted using the
synthetic Go oracle. First/middle/final ciphertext pages are rendered for visual
inspection. This is author-run evidence, not an
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
`artifacts/exports/`. Actual priority-provider paste remains an explicit review gate.
Reload <http://127.0.0.1:4324> after refreshing the preview.
