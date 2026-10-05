# Frozen celestial map S64L1

The 64 vector entries follow canonical Base64URL order: uppercase, lowercase,
digits, minus and underscore. They are presentation only and add no encryption.
Unmapped characters fail; there is no replacement glyph. Live rendering uses
local immutable geometry, independent of future Lucide package updates.

[The manifest](glyph-map-manifest.json) records the pinned @lucide/svelte 1.51.0
package integrity, each named export/source/vector hash and exact license.
Two explicit pre-release corrections resolve Waves to WavesHorizontal and
Fingerprint to FingerprintPattern. All other names retain the plan's taxonomy.
`node scripts/freeze-glyphs.mjs --check` verifies all 64 named exports, frozen
geometry and delivered notices. A new package or geometry requires a deliberate
map/version review; the script refuses overwriting an existing frozen map.

Screen preview now uses the separate S64M1 mixed presentation profile. It mounts
one 512-character payload slice with 8/16 responsive columns, global offsets,
first/previous/next/last controls and a complete accessible legend.
All glyph cells are decorative; canonical raw text remains accessible separately.
The 64-entry legend and three null shapes keep total mounted glyphs below 1,024 even for the maximum
message. Preview rows never redefine the fixed archival 16-character rows.

Author visual review checks the actual production-CSP legend at native 24 px,
16 px compact legend, screen and browser print monochrome, plus 375 px layout. Star has five points;
Sparkle has four; Sparkles/MoonStar differ by companion marks. CircleDot and Disc
are particularly similar at this size (center radii differ); Target has multiple
rings. Scan/Focus differ by the central circle, and polygon outlines can be
confused at low resolution. These are documented recognition limits, not a
promise of error-free icon transcription. Use exact raw text or printed raw rows
and S64CHECK1 checks; the v1 receiver cannot decrypt artwork. Actual A4/Letter archival PDFs now pass E06 fit, 9 pt raw rows, exact public checks and independent Go recovery; human recognition trials remain QA scope.

Recovery accepts bounded raw `.txt`/paste and manually entered printed identity,
page and row checks. It never parses or renders imported SVG/XML/HTML/images.
Complete canonical assembly must match the full envelope SHA-256 after all
contiguous page/row checks pass. Public checks detect accidental errors, not
authenticity; the receiver's GCM authentication remains required.

Comparison with [Lucide's icon gallery](https://lucide.dev/icons/): our grid
already shares the 24 by 24 geometry, rounded strokes and centered cells. The
user declined a larger reading view. Optional inspection with character/name/
global position and legend search remain design follow-ups, not implemented controls.
Legend search can help lookup
without changing ciphertext order. Keep fixed preview pagination and immutable
mapping; avoid popularity sorting, per-token keyboard stops, confetti and the
inline positioning styles in the supplied gallery markup. Any density controls
must use classes/SVG geometry attributes under the enforced CSP. Prioritize
human recognition trials for CircleDot/Disc and other similar pairs before any
future versioned alphabet change. [E05 evidence](reviews/e05-evidence.json)
records current implementation and author-run checks; there is no human
transcription error-rate measurement yet.

S64M1 mixes actual payload characters with payload glyphs: positions 1, 5, 9…
show literal Base64URL characters. Of those literal slots, one in seven is
transformed, alternating horizontal mirroring and 180-degree rotation; six stay
normal. These characters are payload, never decoys. Only the inserted CircleOff,
CircleDashed and Skull are nulls. After each complete eight payload characters,
append one null in that repeating order. Positions and rotation remain global
across previews; a short final group has no trailing null. A full preview has
512 payload cells plus 64 nulls. Read transformed characters in their normal
orientation and skip nulls. Exact raw copy/download and all recovery checks use
only the original ciphertext.

Crosshair remains `j` in S64L1 and S64M1. CircleDashed is the second null. The earlier development null/`j` swap was corrected before release to match the user's request. The [mixed-view manifest](mixed-view-manifest.json) retains four unchanged captured vectors/source hashes, with no payload override. Verify with `node scripts/freeze-mixed-view.mjs --check`. No original vector changed; nulls are visual misdirection, not additional encryption or interception protection. Screen and complete compact PNG use S64M1; S64SVG1 strips and archival pages retain S64L1 and fixed raw/check positions. [E06 evidence](reviews/e06-evidence.json) supersedes earlier development mapping/captures.

License notices are delivered in the hosted public license file and inline
with the bundled sender's legend. The source notice includes ISC and the
Feather-derived MIT terms. [Lucide's primary license page](https://lucide.dev/license)
documents the upstream terms; exact installed-release notices are preserved in
[the local license](licenses/lucide-1.51.0.txt).
