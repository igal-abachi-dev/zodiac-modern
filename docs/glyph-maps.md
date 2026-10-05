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

Screen preview mounts one 512-character slice with 8/16 responsive columns,
global offsets, first/previous/next/last controls and a complete accessible legend.
All glyph cells are decorative; canonical raw text remains accessible separately.
The 64-entry legend keeps total mounted glyphs below 1,024 even for the maximum
message. Preview rows never redefine the fixed archival 16-character rows.

Author visual review checks the actual production-CSP legend at native 24 px,
16 px compact legend, screen and browser print monochrome, plus 375 px layout. Star has five points;
Sparkle has four; Sparkles/MoonStar differ by companion marks. CircleDot and Disc
are particularly similar at this size (center radii differ); Target has multiple
rings. Scan/Focus differ by the central circle, and polygon outlines can be
confused at low resolution. These are documented recognition limits, not a
promise of error-free icon transcription. Use exact raw text or printed raw rows
and S64CHECK1 checks; the v1 receiver cannot decrypt artwork. Print artifact
legibility/page fit remains E06/QA scope.

Recovery accepts bounded raw `.txt`/paste and manually entered printed identity,
page and row checks. It never parses or renders imported SVG/XML/HTML/images.
Complete canonical assembly must match the full envelope SHA-256 after all
contiguous page/row checks pass. Public checks detect accidental errors, not
authenticity; the receiver's GCM authentication remains required.

License notices are delivered in the hosted public license file and inline
with the bundled sender's legend. The source notice includes ISC and the
Feather-derived MIT terms. [Lucide's primary license page](https://lucide.dev/license)
documents the upstream terms; exact installed-release notices are preserved in
[the local license](licenses/lucide-1.51.0.txt).
