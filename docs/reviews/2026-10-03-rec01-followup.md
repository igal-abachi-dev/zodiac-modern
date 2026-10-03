# REC-01 follow-up review and verified fixes

The user supplied an external focused review on 2026-10-03 and stated:

> so once you fix those it passed the review

This records that conditional approval and the author's verification of its
conditions. The reviewer's name/tool and scratch toolchain were not supplied;
no independently executed post-fix run is claimed. The earlier reviewed loader
was reported byte-identical to the previous version; its recorded SHA-256 was
`82abedb6a4bb606ae2961b3ad5b75a94491e7b71a1926dbecd7d9a563aed1348`.
The current exact source, fixture, vendor and log hashes are in
[rec01-evidence.json](rec01-evidence.json). This is a focused loader review, not
QA-03's integrated audit or release/signing approval.

The reviewer reported PASS for the fixed-profile ASN.1/PBES2 schema, pre-KDF
bounds, full-block padding scan, inner PKCS#8/RSA structure and bounded terminal
secret handling with its documented erasure limits. Their malformed-encoding
mutations found no accepted noncanonical encodings. They also reported that all
13 x/term and 368 x/sys files matched upstream v0.46.0/v0.48.0, the documented tag
commits matched, and independently recomputed module h1 hashes matched go.sum.
These are attributed review observations; local module/vendor verification is
separately recorded by the reproducible gate.

| Finding                                                                                           | Change                                                                                                                                                                                                                                | Verification                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Low: encoded private exponent `d` could be ignored by CRT validation in the reviewer's Go runtime | Added the proposed bounded `d*e mod (p-1) == 1` and `d*e mod (q-1) == 1` consistency checks after native parsing/RSA validation. Primitives remain native; no new KDF, algorithm or key format.                                       | Both supported fixture sizes reject every single-bit change to `d`: 3,069 and 4,094 rejected mutations. CBC loading still returns only ErrUnlock, no key/fingerprint, and clears the owned password. Supported fixtures continue to unlock.                   |
| Medium usability: Windows raw mode emits navigation keys as ESC sequences, causing cancellation   | After x/term MakeRaw, clear only ENABLE_VIRTUAL_TERMINAL_INPUT. The hidden prompt ignores navigation keys; Backspace removes the final character and Ctrl-C cancels.                                                                  | Opt-in native Windows console test injects arrows, Home, End and Delete between synthetic characters and returns the unchanged append-only input. Ctrl-C cancels promptly; both cases restore the original terminal settings.                                 |
| Low: CancelSynchronousIo results were ignored                                                     | Handle successful BOOL and ERROR_NOT_FOUND normally, retain the first unexpected native failure, and return a controlled terminal I/O error only after the reader ends.                                                               | Synthetic access-denied/invalid-handle/zero-error cases pass. A deliberately blocked synthetic reader cannot return before release; its unexpected cancellation error remains observable. Native context cancellation restores settings in 1.0003342 seconds. |
| Evidence hashes described CRLF generator output while checkout normalized to LF                   | Normalize generated PEM to LF before oracle/hash recording. Normalize the six existing encrypted fixtures without generating new keys; retain original generator-byte hashes in the manifest.                                         | All six exact LF hashes and real OpenSSL oracle public halves pass. DER, public fingerprints and profile outcomes are unchanged. Git enforces LF checkout bytes.                                                                                              |
| Uncovered dependency from collectInputs to build-host-headers                                     | Extract a deterministic standard-library-only filesAt into scripts/walk-files.mjs and import it directly in build headers, artifact checks, receiver tooling and the REC-01 gate. Add walker and fixture generator to covered inputs. | Full source/file-set/hash checks, regenerated vendor comparison, offline tests/build and fresh fuzz campaigns use the covered walker. The receiver gate no longer imports website CSP configuration.                                                          |

The native-console evidence is in
[rec01-console-evidence.json](rec01-console-evidence.json). Ordinary CI skips
these opt-in controlling-console cases; the local Windows run is separate.
Esc is not advertised as a Windows cancellation shortcut: native byte delivery
varies with console mode. Ctrl-C and context cancellation are tested.

FlushConsoleInputBuffer remains restricted to the end of this private terminal
interaction, after reader shutdown and before restoration, to discard unread
passphrase paste. It intentionally discards queued input. Microsoft's
[documentation](https://learn.microsoft.com/en-us/windows/console/flushconsoleinputbuffer)
discourages general use because queue state can be lost. This narrow use does
not claim guaranteed erasure of OS/runtime copies. The mode and cancellation
behavior follow Microsoft's [SetConsoleMode](https://learn.microsoft.com/en-us/windows/console/setconsolemode)
and [CancelSynchronousIo](https://learn.microsoft.com/en-us/windows/win32/fileio/cancelsynchronousio-func)
contracts.

The user's conditional focused approval can close REC-01 after these conditions
and the complete mandatory automated evidence pass. It does not close REC-02,
EN-04, QA-03, production custody, signing or release gates. Changes to covered
loader/prompt/policy/toolchain files reopen affected evidence and review scope.
