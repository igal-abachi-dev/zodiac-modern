# Tauri host implementation validation

2026-10-18. This is implementation/build evidence, **not comparative performance
evidence**. Interactive native acceptance is pending the user's first run.

| Check | Status |
| --- | --- |
| Template ZIP inspected; original preserved | Done; conventional structure and default icon reused, no template plugins/frontend dependencies copied |
| Rust dependency pins and Cargo.lock | Created offline from the installed Cargo cache; Tauri 2.12.4, tauri-build 2.7.3, WRY 0.57.0, TAO 0.37.1, WebView2 COM 0.39.1 |
| Formatting | Passed `cargo fmt --check` through Build.ps1 |
| Native response/navigation policy unit tests | 2/2 passed; local entry/hash allow, remote/other-path/query deny, GET/MIME restrictions, missing-asset 404, forbidden response 403, fixed CSP/nosniff |
| Compile-time frontend identity | Verified per-file sizes/SHA-256, complete file set and frontend lock hash during successful policy-test compilation |
| Final standard-Tauri Release build | Passed through `Build.ps1 -Offline`; public Tauri APIs/default features only, no direct Windows/COM application dependency |
| First actual Tauri window / installed runtime | Pending; not launched during implementation |
| Native CSP/DOM/font/readiness/dialog/focus/workflow/resize checks | Pending actual native run |
| Normal and early-close process/helper lifecycle | Pending |
| Physical accessibility, IME, high contrast and DPI | Pending |
| Comparative host benchmarks | Deliberately not run; wait until all four alternatives are implemented |

Build environment: Rust 1.91.1 / Cargo 1.91.1, Microsoft x64 ABI, static CRT,
Windows SDK/MSVC tools already installed on this machine. The application's
Release configuration is recorded in Cargo.toml and .cargo/config.toml.
The test executable runs policy assertions, not a GUI smoke test.

`Build.ps1` records executable, lockfile and frontend manifest hashes in
`.cache/build-receipt.json` after a successful Release build. Build receipts and
generated schemas/target files are local ignored artifacts. Future runtime
acceptance must record the actual installed WebView2 version, effective browser
arguments, profile behavior and matching native settings; none is inferred from
the Rust package version or the C++ host's earlier runtime evidence.

Known comparison differences and the WRY switch decision are documented in
[README.md](README.md). Tauri's HTTPS custom-protocol origin, HTML processing,
embedded/compressed transport, injected initialization scripts and internal
native messaging are disclosed rather than asserted identical to NeutronStar.
The initial implementation's direct COM settings were removed following the
user's clarification: the final candidate uses only public Tauri APIs and
standard Tauri default features. Low-level controller work belongs to the
separate Rust `webview2-com` candidate. That will be closer to the C++ host,
but matching behavior/configuration is required before interpreting language
differences.

Final public-Tauri-only Release executable SHA-256:
`B264C5BDBB5CA8039BAB42233F75A78C784C9CEB0DBFB7B645CFE835CF7BD054`.

Source verification confirms the application has only `tauri` as a direct
runtime dependency and no `with_webview`, raw COM calls or unsafe blocks.
All 17 Svelte production inputs remained unchanged after implementation.
