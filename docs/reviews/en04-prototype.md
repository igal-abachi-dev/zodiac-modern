# EN-04 early feasibility evidence

The prototype now mounts the actual Svelte sender. It shares RecipientSelector,
Workspace, strict native WebCrypto, codecs and raw exports with the Astro site.
The build compiles Svelte islands with external CSS, bundles JavaScript as one
IIFE, and embeds CSS/public configuration/help into one HTML file. It has no
adjacent-file, runtime import, remote font or network dependency. Frozen glyph
display, its legend and local raw recovery are included. SVG/PNG/JSON downloads and request-only archival print are now included and tested by E06.

The measured fixture artifact is 165,062 bytes (about 161 KiB). Chromium and Firefox open it
directly through file:// from a path containing spaces and Hebrew characters.
Tests exercise both sizes, configured key initialization, public file/paste
replacement, exact UTF-8, independent Go decryption, raw download/manual-copy
fallback, new-message/reset, no requests/storage/style attributes and no CSP/runtime
errors. The installed stable Edge 154.0.4258.53 channel also passes the expanded
mixed-view/raw-recovery/export/print case. S64M1 includes actual literal payload characters,
sparse mirrors/180° rotations and rotating non-payload nulls; exact raw exports
and independent Go recovery still pass. Hosted printed-row validation/reassembly passes Chromium and
Firefox. Stable Chrome and stable Firefox installations, headed Windows usability,
bundled printed-row trials and actual email draft paste still require evidence.
Browser tests enable the Chromium process sandbox
and never relax file access, WebCrypto or CSP policies.

The first full Svelte bundle exposed a JavaScript replacement-string issue:
replacement `$` sequences changed executable bytes after hashing. Placeholder
insertion now uses callbacks, embedded blocks normalize line endings before
hashing, and tests independently recompute hashes from the final HTML. CSP meta
precedes code and enforces hashed scripts/styles, no style attributes, connect,
workers, objects, forms or base URLs. Meta CSP cannot enforce HTTP-only
frame-ancestors/HSTS/nosniff; independent review of that local boundary is pending.

Verify full release HTML bytes **outside the file before opening it**, using a
hash obtained through an independently trusted publisher channel:

```powershell
& .\scripts\verify-sender.ps1 -Path 'D:\Verified Sender\zodiac-sender.html' -ExpectedSHA256 'FULL_64_CHARACTER_TRUSTED_HASH'
```

The helper does not open the file. Missing/invalid/mismatched hashes refuse;
the regression alters a file and confirms rejection. A checksum beside the HTML,
same-site download or a badge inside the page does not establish publisher trust.

EN-04.1 is implemented as the early prototype. EN-04.2/.3 remain open: remaining bundled recovery/support matrix, actual email paste, independent boundary and
verification UX review, measured complete-flow costs, then the delivery choice.
This evidence does not select a launcher or make the prototype a release.
