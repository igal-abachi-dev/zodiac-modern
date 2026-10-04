# REC-02 ordinary local files

Windows is the supported receiver platform for this implementation. Other
platforms fail closed at filesystem operations until equivalent native output
protections have their own evidence. Cross-compilation alone establishes no
platform support. The executable remains unsigned development software.

The command accepts file paths only. Inputs use the same local-file boundary as
output: strict names, bounded reads, ordinary disk handles, no reparse parents
or final links, and no hardlink input aliases. Raw decoding is canonical with no
implicit whitespace removal. Cryptographic failures share exit 4; key unlock
uses exit 3, syntax/usage 2, local filesystem errors 5, cancellation 130.

Reject UNC/root-relative/drive-relative paths, `\\.\` and `\\?\` namespaces,
streams, reserved devices and aliases, trailing dots/spaces, invalid/control
characters and paths beyond the conservative 240-byte policy. Relative `.`/`..`
components receive ordinary lexical resolution before checking the full path.

Before filesystem access, query the local DOS drive mapping and accept only an
ordinary `\Device\HarddiskVolume` target with a numeric suffix. Reject mapped
network redirectors, device targets and SUBST mappings. Open the native volume
target directly, avoiding a second drive-letter resolution race. Verify disk
type, resolved volume GUID root and fixed-drive classification through that
handle. No UNC target is opened to discover whether it is safe.

Walk every parent through single-component `NtCreateFile` calls relative to
held directory handles. Require no reparse attributes and the same volume.
Keep parents held, deny delete sharing, and recheck their attributes around
final creation and commit. Directory write sharing is not a reliable way to
block reparse mutation: tests actually mutate a held empty directory and check
both detection and absence of escape through relative creation. Rename/swap
attempts cannot replace a held parent. Final creation never resolves an
absolute pathname assembled after these checks.

Only after OAEP unwrap, exact 32-byte AES validation, GCM authentication and
UTF-8 validation, create the new file exclusively (`FILE_CREATE`, no sharing).
Require persistent Windows ACL support. Supply a protected owner-only DACL and
explicit current-user owner **at creation**, then verify owner, protection,
single full-access ACE and ordinary same-volume disk file before writing.
No permissive inheritance window or chmod-after-write window exists.

Mark the handle's file disposition for deletion before the first plaintext
write. Write bounded chunks, check cancellation, flush, recheck parents, then
clear that disposition at the explicit commit point. Failed/canceled writes
close/delete by handle; cleanup errors remain observable. Do not use a racy
pathname removal or `FILE_DELETE_ON_CLOSE`, whose flag cannot simply be cleared
by the commit disposition change. A completed plaintext file persists by user
choice; deletion and buffer wiping cannot guarantee secure erasure.

Tests cover both real RSA sizes, exact Unicode/control/empty/max-length bytes,
wrong keys and every envelope field, invalid unwrap lengths/UTF-8/raw aliases,
no pre-authentication creation, exclusive overwrite rejection, permissive
parent ACL inheritance, parent/final junctions, parent rename and actual
reparse mutation, local mapped aliases/hardlinks, bounded input, canceled and
failed partial writes. Browser tests drive the real command implementation
through a test-only synthetic prompt adapter; separate actual executable runs
use the real hidden controlling-console prompt and compare exact browser bytes.

Evidence: [M1 gate](../reviews/m1-evidence.json),
[refreshed receiver gate](../reviews/rec01-evidence.json),
[actual-console receipts](../reviews/rec02-console-evidence.json).
The prior focused loader review does not cover this new filesystem integration;
QA-03 must assess it along with the complete system before release.

Native API contracts:
[NtCreateFile](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntcreatefile),
[QueryDosDevice](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-querydosdevicew),
[SetFileInformationByHandle](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfileinformationbyhandle),
[security descriptor format](https://learn.microsoft.com/en-us/windows/win32/secauthz/security-descriptor-string-format).
