# Native host build hardening

Inspected 2026-10-18. This concerns the native host executables, not a claim
about all loaded DLLs or the separately shipped Microsoft WebView2 processes.
Compiler mitigations complement content isolation and lifetime correctness.

## Actual configuration and binary evidence

| Protection / diagnostic | C++ NeutronStar Host | Raw Rust webview2-com host |
| --- | --- | --- |
| CFG | `/guard:cf` at compile and link | `-C control-flow-guard=yes`, added after inspection found it missing |
| ASLR / high-entropy VA / DEP | Explicit `/DYNAMICBASE /HIGHENTROPYVA /NXCOMPAT`; present in PE | Present in PE through Windows MSVC-target linker defaults |
| CET shadow-stack compatibility | Not requested; marker absent | Not requested; marker absent |
| Warning policy | `/W4 /WX` | `cargo clippy --all-targets -- -D warnings` build gate; not equivalent to `/W4` |
| Language conformance | C++20, `/permissive-`, extensions off | Rust edition 2024; C++ flags do not apply |
| Debug runtime checks | Preset contains `/RTC1`; see compiler caveat below | No MSVC `/RTC1` equivalent; normal Rust checks do not validate arbitrary unsafe COM code |
| Automatic local-variable initialization | Not requested | C++ option does not apply; safe Rust rejects ordinary uninitialized reads |
| SafeStack | Not enabled; installed clang-cl rejects it for this target | Not enabled |

The final Release PE inspection is saved as
`.cache/hardening-pe-audit.json` (using the development `pefile` utility).
Both now have DLL characteristics `0xc160`, CFG-instrumented/function-table
load-config flags, and nonempty CFG tables:

| Artifact | SHA-256 | CFG function count |
| --- | --- | ---: |
| Frozen C++ clang-cl/Ninja runner | `4ae49adc08d33cd0f590a6faa3ee8ae2c6eef309d307ad29abbcaa3dff7c0928` | 345 |
| Rust Release after CFG and Clippy cleanup | `cf739acec35fc83e1a82f40a94fbfd37c0ddf912182d7a019e52a2eb63f7d713` | 438 |

Counts are metadata, not a security score. The prior Rust executable had
`0x8160`, no CFG function table, and no CFG image flag. Its executable and receipt
are retained in `webview2-com/.cache/pre-cfg/`. The C++ frozen artifact was not
rebuilt or changed. New source/build changes require new hashes before timing.
Prebuilt CRT/standard-library objects are not proven fully instrumented merely
because our own compilation enables CFG.

## Recommended defaults and qualifications

- Keep CFG, ASLR, high-entropy VA and DEP for both Release hosts. Rust's
  supported switch is `-C control-flow-guard=yes`; `nochecks` is not enforcement.
  C++ must compile indirect-call checks as well as link CFG metadata.
  [Rust codegen reference](https://doc.rust-lang.org/rustc/codegen-options/index.html#control-flow-guard),
  [Microsoft CFG](https://learn.microsoft.com/en-us/cpp/build/reference/guard-enable-control-flow-guard?view=msvc-170).
- Keep `/W4 /WX /permissive-` for owned C++ code. Warnings and conformance do
  not establish the absence of undefined behavior or memory errors. Keep Release
  optimization; repair invalid source rather than treating `/Od` as a security fix.
- Do not add SafeStack here. Clang 22.1.3 locally rejects
  `/clang:-fsanitize=safe-stack` for `x86_64-pc-windows-msvc`. Its official tested
  platforms do not include Windows. Merely passing it through `-Xclang` does not
  supply a compatible runtime. [Clang SafeStack](https://clang.llvm.org/docs/SafeStack.html).
- Clang accepts `/clang:-ftrivial-auto-var-init=zero` in a local compile probe.
  Consider it as a separately validated C++ hardening revision, not a change to
  the frozen benchmark. `pattern` can expose mistakes; zero can reduce accidental
  disclosure. Neither repairs undefined behavior, initializes every allocation,
  protects all libraries, nor replaces explicit initialization and diagnostics.
  Prefer the supported driver spelling over internal `-Xclang` options.
  [Clang initialization guidance](https://clang.llvm.org/docs/UsersManual.html#cmdoption-ftrivial-auto-var-init).
- Treat `/RTC1` as MSVC Debug instrumentation, incompatible with optimized
  Release. The installed clang-cl accepted `/RTC1` in a probe but emitted no
  MSVC RTC helper references or uninitialized-read check in that example; the
  ordinary stack-cookie check was present. Flag acceptance alone is not evidence
  of equivalent MSVC instrumentation. Use a separate ASan/analysis configuration
  for diagnostics; this document does not claim those host checks passed.
  [Microsoft RTC limitations](https://learn.microsoft.com/en-us/cpp/build/reference/rtc-run-time-error-checks?view=msvc-170).
- Evaluate `/CETCOMPAT` for the x64 host link after compatibility testing of the
  complete native path. For Rust this is a linker argument, not a C++ compile
  flag. It declares shadow-stack compatibility; verify actual process mitigation
  policy on supported hardware/Windows as a separate step. It does not itself
  prove shadow-stack enforcement, protect every process, or eliminate all ROP.
  [Microsoft CETCOMPAT](https://learn.microsoft.com/en-us/cpp/build/reference/cetcompat?view=msvc-170).

CFG primarily constrains indirect-call targets; it is not a general return-address
protection. DEP marks data nonexecutable; it is not a universal W^X policy.
ASLR raises exploit cost but does not make address disclosure/brute force
impossible. Rust's safety benefits do not remove the need to review unsafe
Windows FFI, callbacks, ownership and shutdown.

No benchmarks or hardware-enforced mitigation acceptance are implied by this
binary inspection. Keep instrumented diagnostic builds out of timing cohorts.
