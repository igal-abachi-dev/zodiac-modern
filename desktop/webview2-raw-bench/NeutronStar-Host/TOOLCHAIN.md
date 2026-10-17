# Windows 11 C++20 toolchain decision

Assessment: 2026-10-16, updated 2026-10-17. **User-selected default: clang-cl +
CMake + Ninja Multi-Config, C++20 x64. Keep the pinned PowerShell dependency
restore and the Microsoft SDK/STL/static CRT/linker. MSVC/MSBuild remains a
supported alternative and complementary validation path. Ninja works with CMake;
it does not replace CMake.**

This supersedes the earlier MSVC/MSBuild default recommendation after the eight
configurations passed and the user selected clang-cl/Ninja for everyday work.
It is a workflow preference supported by local compatibility evidence, not a
claim that LLVM or Ninja is inherently safer, more correct or universally faster.
`Build.ps1` defaults to `clang-cl-ninja-x64`, establishes the x64 developer
environment and locates bundled tools. The `release`/`debug` build/test aliases
and default host/example test and launch scripts use that same output tree.
Select `Build.ps1 -Preset msvc-x64` for the alternative; its explicit build
presets are `msvc-release`/`msvc-debug`. Missing LLVM/Ninja fails explicitly.

This recommendation is specific to this small Win32/WebView2 benchmark host.
All eight x64 Release/Debug configurations passed on 2026-10-17. There is no
measured GUI performance winner; build timings below are single-pass observations.

## Selected stack

Our stack is coherent:

```text
CMake → Ninja → clang-cl → Microsoft link.exe
                    ↓
          Microsoft STL / CRT / Windows SDK
          WebView2 SDK + WIL via pinned NuGet
```

CMake generates Ninja Multi-Config build files, Ninja invokes clang-cl, and
Microsoft `link.exe` links the resulting objects and libraries. The compiler
targets the Microsoft ABI and uses Microsoft's STL, CRT and Windows SDK. The
standalone runner uses the static CRT (`/MT` Release, `/MTd` Debug).

Keep the current PowerShell restore of pinned official WebView2 and WIL NuGet
archives, including SHA-256 checks, extracted-file verification and offline
verification. These are SDK dependencies; the WebView2 browser runtime remains
a separate runtime prerequisite. Reconsider vcpkg if numerous compiled/transitive
dependencies, additional target triplets or shared binary caching justify it.

Keep Microsoft `link.exe`: it is the linker exercised in all eight validated
compiler/generator configurations. Using clang-cl does not require LLVM's linker
or standard library. `lld-link` remains an untested optional experiment; no
measured linking bottleneck currently justifies switching. No dependency manager,
linker, build flags or runtime policy changes accompany this documentation.

## Four independent choices

| Layer | Current choice | Alternative |
| --- | --- | --- |
| Compiler | LLVM `clang-cl.exe`, targeting the Microsoft ABI | MSVC `cl.exe` |
| Platform libraries/linking | Windows SDK, Microsoft CRT/STL, Microsoft linker | clang-cl can use the same platform libraries; linker choice is a separate setting |
| Project description and build execution | CMake generates Ninja Multi-Config files; Ninja executes them | CMake generates Visual Studio projects; MSBuild executes them |
| Dependency acquisition | PowerShell restores pinned official NuGet archives | vcpkg manifest/registry workflow |

The source remains ordinary C++20; it is not rewritten into a different language
when switching compilers. Compiler, generator, linker and package manager need
not be changed together. Clang-cl is Clang's Microsoft-style driver, not MinGW GCC
and not an automatic switch to libc++. LLVM documents Microsoft ABI/extensions
compatibility and its limits. See [clang-cl usage](https://clang.llvm.org/docs/UsersManual.html#clang-cl)
and [MSVC compatibility](https://clang.llvm.org/docs/MSVCCompatibility.html).

## MSVC versus clang-cl for this host

### Language standard: retain C++20

2026-10-17 decision: use **C++20** for the compiler/build-system comparison.
The current source does not require a C++23-only feature. RAII, WIL/WRL helpers,
smart pointers, lambdas, typed interfaces and filesystem support already fit
this baseline. Changing the language standard does not recompile WebView2 or
make its HTML renderer inherently faster. Evaluate C++23 when a concrete API or
language feature improves the implementation, checking both compiler and standard
library support; do not claim that every C++23 feature is universally available
or unavailable. Hold the standard fixed while testing compilers/generators.

| Factor | MSVC | clang-cl | Project implication |
| --- | --- | --- | --- |
| Win32, COM, WIL/WRL and official loader | Passed this host's matrix | clang-cl 22.1.3 passed the same matrix with the Microsoft SDK/STL | Both have local compatibility evidence; other versions need validation |
| C++20 | Appropriate for the features currently used | Also appropriate in principle; exact language/library features remain version-dependent | No current source requirement forces either compiler; we do not use C++ modules |
| Standard library / CRT | Microsoft STL/CRT | Can use the same Microsoft STL/CRT | Compiler choice does not automatically remove or change the CRT deployment policy |
| Diagnostics | Useful MSVC warnings and Microsoft analysis tooling | Independent diagnostics and LLVM tooling provide complementary findings | A second compiler is valuable for correctness even if its binary is never the baseline |
| Editing and debugging | Fits the existing VS/MSBuild workflow | Visual Studio supports Windows Clang CMake editing/build/debugging too | Clang does not require abandoning Visual Studio |
| Memory-error checks | AddressSanitizer supported in applicable Windows configurations | LLVM also provides AddressSanitizer | Use a dedicated tested instrumentation configuration; neither compiler makes C++ memory-safe |
| Native code quality / size | Must measure this workload | Must measure this workload | No defensible blanket claim that LLVM or MSVC always wins |
| HTML/CSS/JS rendering | Performed by the selected WebView2 runtime | Performed by that same runtime | Compiling the HWND wrapper with LLVM does not recompile Chromium or the frontend |
| Build speed | Measure clean/incremental builds | Measure clean/incremental builds | This tiny project has few translation units; do not assume large-project build reports transfer |
| Compatibility maintenance | One already-validated path | Adds compiler-specific warning/flag and SDK compatibility work | Keep strict diagnostics; adapt flags intentionally instead of suppressing all warnings |
| Reuse of the static library | Match architecture, CRT, configuration and toolchain expectations | Same care, despite intended Microsoft ABI compatibility | Rebuild the library with the consuming application's toolchain where practical; no stable DLL ABI is promised |

Sources: [Microsoft's Windows Clang CMake integration](https://learn.microsoft.com/en-us/cpp/build/clang-support-cmake?view=msvc-170),
[MSVC AddressSanitizer and incompatible options](https://learn.microsoft.com/en-us/cpp/sanitizers/asan?view=msvc-170),
[LLVM AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html).
Sanitizer availability/options are platform-specific; sanitizer binaries are not
the production resource/startup benchmark baseline. Treat LTO/PGO, linker selection
and mixed compiler objects as explicit separate configurations, not free switches.

**Decision:** use clang-cl/Ninja as the selected default. The clang-cl validation
build caught an aggregate-initialization warning and now passes the same tests.
The default change follows the user's workflow preference, not a GUI speed claim.
Hold the host binary fixed across all nine frontends; otherwise the
comparison changes both frontend and compiler at once.

## CMake and Ninja

CMake describes targets, dependencies, flags, resources and tests. Ninja schedules
the commands that CMake generates. Both MSVC and clang-cl can be used with Ninja;
choosing Ninja says nothing by itself about which compiler produces the EXE.

| Workflow | Useful property | Cost / reason to keep or defer |
| --- | --- | --- |
| CMake + Visual Studio/MSBuild | Working presets; native project files; multi-configuration builds | Supported alternative for solution-based work |
| CMake + Ninja | Lightweight command-line workflow; compile database support | Single configuration per build tree; initialize the correct SDK/toolchain environment |
| CMake + Ninja Multi-Config | Debug/Release selection at build time, like VS | Also needs environment/tool discovery and tested scripts/output paths |

CMake's compile database option works with Ninja/Makefile generators, not the
Visual Studio generator. That makes Ninja useful if clangd/clang-tidy integration
needs `compile_commands.json`. Sources: [Ninja Multi-Config](https://cmake.org/cmake/help/latest/generator/Ninja%20Multi-Config.html),
[compile database support](https://cmake.org/cmake/help/latest/variable/CMAKE_EXPORT_COMPILE_COMMANDS.html).

The existing VS 2026 preset requires **CMake 4.2+**, where that generator was
introduced. The library's CMake language minimum is 3.25; those are different
requirements. See [VS 2026 generator](https://cmake.org/cmake/help/latest/generator/Visual%20Studio%2018%202026.html).
Ninja must not inherit VS-only `-A`/`-T` assumptions. Use separate output trees
per compiler/generator/architecture. Existing scripts currently target the MSVC
VS tree; use the matrix wrapper or explicit Ninja presets for the alternatives.

## PowerShell restore versus vcpkg

The current restore is sufficient because the entire external dependency set is
two fixed official NuGet SDK archives: WebView2 and WIL. It verifies pinned archive
SHA-256 values and the complete extracted file set, rejects changed/extra files,
and supports explicit offline verification. Build/startup performs no implicit
package download. WIL is header-based; WebView2 supplies the SDK and loader.
The separate WebView2 Runtime is not installed by this restore.

| Concern | Current script | vcpkg manifest approach |
| --- | --- | --- |
| Small direct SDK set | Simple, explicit archive versions/hashes | Adds a tool/registry layer without a demonstrated need here |
| Transitive native dependencies | No general dependency solver or source-build recipes | Manages dependency graphs, features, target triplets and build recipes |
| Version control | Exact package/archive pins in our lock JSON | Manifest plus pinned registry baseline and overrides where exact selection is required |
| Shared compiled-package cache | Not implemented; only downloaded/extracted SDK cache | Binary caching can share matching package builds |
| Updates and notices | We maintain both pins, extraction checks and notices | Port/registry/tool updates still require review; not automatic audit or patch acceptance |
| Offline operation | Cached archives required; verified offline mode | Must pre-provision required tool, sources/packages and caches; package manager presence alone is insufficient |

vcpkg is a good option when this grows into a substantial native dependency graph,
needs multiple triplets/platforms or needs shared CI package builds. If adopted,
use manifest mode, pin the vcpkg/registry state and deliberate versions, and keep
CRT/triplet settings consistent. Avoid two independent managers for the same SDK.
See [manifest mode](https://learn.microsoft.com/en-gb/vcpkg/concepts/manifest-mode),
[version selection and baselines](https://github.com/MicrosoftDocs/vcpkg-docs/blob/main/vcpkg/users/examples/versioning.getting-started.md),
and [vcpkg caching overview](https://vcpkg.io/en/getting-started).

Neither a hash check nor a package manager establishes independent security
review. Our script does not verify the NuGet signature chain or pin the compiler,
SDK and browser installation. Record those versions separately; package pins do
not make EXEs bit-for-bit reproducible. Keep repeated archive verification time
separate from compiler-only build timing, and all build work outside startup tests.

## Machine observations and next comparison

On this machine, the previously tested MSVC version is 19.51.36260.0. A subsequent
tool check found **clang-cl 22.1.3**, targeting `x86_64-pc-windows-msvc`, under VS's
`VC/Tools/Llvm/x64/bin`, and **Ninja 1.13.2** under VS's CMake tools. They need not
be on the ordinary shell PATH. This corrects the earlier observation that LLVM
was absent. No compiler, generator or dependency workflow was switched here;
the installed tools are now exercised by the matrix described below. Historical
tool presence alone did not establish compatibility; use the executed validation
record for current evidence.

If comparing them later: first hold the generator, Microsoft linker, SDK, CRT,
dependencies, architecture and source revision fixed and vary only the compiler.
Run the same tests, inspect executable imports/hardening, then compare repeated
clean/incremental build timings and host binary size. Measure startup/native
interaction and the complete WebView2 process tree on the same runtime/machine.
Use identical frontend assets and report variability, not a single launch.
The new 2x2 matrix varies compiler and executor independently. These are optional
toolchain comparisons, separate from the nine frontend fixtures.

## Reproduce the compiler/generator matrix

The new `scripts/Test-Toolchains.ps1` runs four isolated x64 configurations, each
in Release and Debug:

| Configure preset | Compiler | Build executor |
| --- | --- | --- |
| `msvc-x64` | MSVC `cl.exe` | Visual Studio generator / MSBuild |
| `clang-cl-vs-x64` | LLVM `clang-cl.exe` / ClangCL toolset | Visual Studio generator / MSBuild |
| `msvc-ninja-x64` | MSVC `cl.exe` | Ninja Multi-Config |
| `clang-cl-ninja-x64` | LLVM `clang-cl.exe` | Ninja Multi-Config |

The comparison holds C++20, Microsoft STL/SDK, static CRT (`/MT` or `/MTd`), pinned
WebView2/WIL and the Microsoft linker fixed. `CMAKE_LINKER_TYPE=MSVC` selects
`link.exe` for clang-cl too; this is not a comparison of LLVM LLD versus Microsoft's
linker. Presets explicitly set Release `/O2 /Ob2 /DNDEBUG`, Debug `/Ob0 /Od /RTC1`,
and nonincremental Release linking so a stale empty configuration flag cannot
silently change the optimization policy. See [CMake linker selection](https://cmake.org/cmake/help/latest/prop_tgt/LINKER_TYPE.html).

Build the [example test assets](../NeutronStar-Example/README.md) once, then run
from the host directory:

```powershell
.\scripts\Test-Toolchains.ps1
```

The wrapper imports VS's official x64 `VsDevCmd.bat` environment in a child
process and locates installed LLVM/CMake/Ninja. It performs no tool installation
or execution-policy override. It verifies the SDK archives/extracted contents
offline, uses fresh short `out/tc-*` build directories and per-run `.cache/toolchains-*`
logs, and runs native CTest, the full WebView2 host suite, and the same compiled
Vite/TypeScript greeting fixture for each configuration. Existing binaries/profiles
are not overwritten or deleted. The script's final status fails if any matrix
configuration fails; source hashes, tool versions, timings and artifact hashes
remain in the run report.

For regular non-matrix work, use the named configure/build presets, for example:

```powershell
cmake --preset clang-cl-vs-x64
cmake --build --preset clang-cl-vs-release
ctest --test-dir out/clang-cl-vs-x64 -C Release --output-on-failure
```

Ninja presets need the x64 SDK/compiler environment and installed Ninja/LLVM on
PATH; the matrix wrapper supplies this automatically. Ninja generates build files
and `compile_commands.json`, not `.slnx`/`.vcxproj`; Visual Studio can consume the
CMake folder/presets directly. The default `Build.ps1` now uses clang-cl/Ninja.

Matrix wall times are one fresh build and one no-op invocation per configuration,
not a repeated clean/incremental-edit benchmark. They include build-executor
overhead and can be affected by caches/machine activity. Do not infer WebView2
rendering, memory or startup differences from compiler speed or EXE byte count.
Both builds request parallelism 4, but MSBuild schedules projects while Ninja can
schedule individual compilation steps; MSVC `/MP` tuning is not part of this
comparison. An observed timing difference does not isolate executor overhead.

## Executed matrix results: 2026-10-17

All four compiler/executor pairs passed in **both Release and Debug**: native
CTest, the 19-case real-WebView2 suite and the compiled TypeScript example's
greeting/security suite, including helper shutdown checks.

| Compiler / executor | Release build (s) | Release no-op (s) | Release EXE | Debug build (s) | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| MSVC / MSBuild | 9.322 | 0.505 | 501,248 bytes | 9.191 | Both passed |
| clang-cl / MSBuild | 8.745 | 0.486 | 549,888 bytes | 8.855 | Both passed |
| MSVC / Ninja Multi-Config | 4.081 | 0.059 | 501,248 bytes | 5.018 | Both passed |
| clang-cl / Ninja Multi-Config | 3.522 | 0.068 | 549,888 bytes | 4.858 | Both passed |

Tools: MSVC 19.51.36260.0, clang-cl 22.1.3, Microsoft linker 14.51.36260.0,
Windows SDK 10.0.26100.0, CMake 4.3.1-msvc1, Ninja 1.13.2 and WebView2 Runtime
155.0.4283.45. Dependencies remain pinned and verified offline.

Ninja was quicker in this single pass, including no-op execution. This supports
offering it for command-line development, but is not a repeated build-speed
benchmark. MSVC's Release EXE was 48,640 bytes smaller here; neither fact measures
browser rendering, whole-process-tree RAM or launch latency. The user subsequently
selected clang-cl/Ninja as default; MSVC/MSBuild remains the supported direct
Visual Studio solution option and complementary compiler check.

The first pilot exposed clang's missing-field-initializers warning in
`MONITORINFO`. The fix zero-initializes the structure and then assigns `cbSize`;
no warnings were disabled. The final matrix reran every pair after that fix.
All eight final PE files were inspected for x64, ASLR/high-entropy VA, NX and CFG;
all passed, with no dynamic MSVC CRT import. Generated link commands use Microsoft's
`link.exe`, including clang/Ninja. This is configuration evidence, not an audit.

Local evidence: `.cache/toolchains-20261017-011737-7a38ea92/` contains
`results.json`, `tools.json`, source hashes, build/test logs and `pe-audit.json`;
fresh build trees are under `out/tc-6bf98e3b/`. These ignored artifacts are local
evidence, not committed binaries. Earlier pilot logs remain separate. The known
intermittent early-initialization teardown issue remains open despite these passes.
ARM64, sanitizers, physical accessibility/DPI checks and the nine actual frontend
implementations were not validated by this matrix.

### Why Ninja was quicker

Ninja executes CMake's generated dependency graph with a deliberately small build
engine. MSBuild evaluates solution/project files, imports and tasks and tracks
their work. Ninja's design explicitly prioritizes low incremental-build overhead;
see the [Ninja manual](https://ninja-build.org/manual.html).
The observed no-op times (approximately 0.06 s versus 0.5 s) are consistent with
lower executor overhead, although one run cannot isolate every source of delay.

Clean-build scheduling also differed: Ninja can schedule individual object-file
compilations; MSBuild's requested parallelism schedules projects, and our generated
MSVC commands do not enable `/MP`. Thus `--parallel 4` did not guarantee identical
compiler concurrency. Microsoft's [MSBuild parallelism](https://learn.microsoft.com/en-us/visualstudio/msbuild/using-multiple-processors-to-build-projects)
and [compiler /MP documentation](https://learn.microsoft.com/en-us/cpp/build/reference/mp-build-with-multiple-processes)
describe these separate mechanisms. The result compares the tested workflows,
not optimally tuned MSBuild against optimally tuned Ninja. No `/MP` change is
made here; it would require a separate measured configuration.

### Binary and assembly inspection follow-up

The Release PE sections were parsed and hashed on 2026-10-17. For **each compiler**,
MSBuild and Ninja produced byte-identical `.text` sections, as well as matching
`.data`, `.pdata`, `.fptable`, `.rsrc` and `.reloc`. Whole-file differences were:

- MSVC pair: four differing bytes, in the PE and debug-directory timestamps.
- clang-cl pair: 22 differing bytes, comprising timestamp bytes and 18 slash
  versus backslash differences in embedded WIL header-path strings in `.rdata`.

Therefore neither executor produced better instructions or a better security
configuration in these artifacts. Both used the same Microsoft linker and had
the same inspected imports/hardening. This is an observation about these builds,
not a general guarantee of deterministic output across generators.

The compiler size difference is localized precisely by raw section size:

| Section | MSVC bytes | clang-cl bytes | clang-cl increase |
| --- | ---: | ---: | ---: |
| `.text` (instructions) | 308,224 | 343,552 | 35,328 |
| `.rdata` (read-only data, including compiler/runtime metadata) | 132,608 | 143,872 | 11,264 |
| `.pdata` (x64 function/unwind table) | 16,384 | 18,432 | 2,048 |
| Other raw sections and headers | Same size | Same size | 0 |
| Total file | 501,248 | 549,888 | 48,640 (9.7%) |

Representative Release COFF objects were disassembled with LLVM objdump. The
internal `valid_id` helper in `test_greet_protocol.cpp` checks exactly 32 lowercase
hex characters. MSVC emits a 70-byte loop; clang-cl emits 1,015 bytes of unrolled
checks. This is a concrete example of different optimization decisions, not an
attribution of the entire executable gap to this helper. Other functions,
templates, inlining, register allocation and metadata also differ; a complete
symbol/link-map attribution was not performed. Neither instruction count nor
loop unrolling alone establishes latency, correctness or safety.

Both builds target speed with `/O2 /Ob2`, not minimum size. MSVC distinguishes
[/O1 from /O2](https://learn.microsoft.com/en-us/cpp/build/reference/o1-o2-minimize-size-maximize-speed),
and [Clang documents size-oriented optimization levels](https://clang.llvm.org/docs/CommandGuide/clang.html).
Their optimizers need not make the same decisions for similar flag names. A
future size-oriented experiment must retain safety checks and repeat validation;
these observations do not justify disabling exceptions, CFG or security checks.

Assembly inspection can identify transformations and suspicious code, but this
limited inspection is not a proof that every validation path is compiled correctly
or that either C++ binary is memory-safe. Both retain the measured hardening and
pass the same existing tests. There is no meaningful "more modern assembly"
winner; benchmark a relevant hot path before judging code generation.

Clang's `-Wmissing-field-initializers` diagnostic did improve explicitness and
cross-compiler warning cleanliness. However, the original
`MONITORINFO monitor{sizeof(MONITORINFO)};` already zero-initialized its remaining
aggregate members. The replacement `MONITORINFO monitor{};` followed by
`monitor.cbSize = sizeof(monitor);` is not evidence of a repaired uninitialized
read. See [Microsoft's C++ initialization rules](https://learn.microsoft.com/en-us/cpp/cpp/initializers)
and [Clang diagnostics](https://clang.llvm.org/docs/DiagnosticsReference.html#wmissing-field-initializers).
Different warning sets complement each other; keep both compilers rather than
treating a warning as proof that one optimizer is universally safer.

Local evidence alongside the matrix logs: `release-sections.json`,
`msvc-x64-greet-asm.txt` and `clang-cl-vs-x64-greet-asm.txt`. The disassembly is
from representative native objects; final-EXE `.text` equality is a separate
direct byte comparison. No compiler flags or host behavior changed in this
inspection. The selected default is now clang-cl/Ninja for iteration and release
builds; retain MSVC/MSBuild for direct solution use and repeat both compiler paths
after relevant native changes. This selection is not a safety fix established
by the binary inspection.

### Interpreting size, safety and build correctness

The extra 48,640 clang-cl bytes do **not** establish greater safety, reliability
or execution speed. Keep the following distinctions explicit:

| Observation | Meaning | What remains unestablished |
| --- | --- | --- |
| More `.text` bytes | More emitted instructions/padding; the inspected ID validator illustrates unrolling | Whether any relevant operation runs faster or is safer |
| More `.rdata` bytes | More read-only data and metadata in aggregate | The exact contribution of every constant, table, type or compiler-generated structure; full symbol/link-map attribution remains undone |
| More `.pdata` bytes | A larger x64 table describing code ranges and pointing to unwind information | More security checks, stronger exception protection or more reliable exception handling |

Windows x64 function-table entries describe a range of instructions and locate
the unwind information needed to restore its stack state. Compiler choices about
function boundaries, splitting and generated helpers can change the table size;
each compiler must correctly describe its own output. `.pdata` size is not a
count of safety checks. See [Microsoft's x64 exception-handling format](https://learn.microsoft.com/en-us/cpp/build/exception-handling-x64).

The observed unrolled validator still performs character validation. Repeating
the checks can remove loop bookkeeping and expose optimization opportunities,
while increasing the instruction footprint. The resulting latency depends on
the processor, input and surrounding workload. LLVM itself balances estimated
code growth against unrolling benefits; see its [unrolling implementation](https://llvm.org/docs/doxygen/LoopUnrollPass_8cpp.html).
Neither the loop nor the unrolled form is inherently safer. The 70-byte versus
1,015-byte object-code comparison is evidence of a transformation, not a timed
result or an equivalence proof.

Ninja is a reasonable everyday iteration choice for this host: it was quicker
in the measured run and produced identical executable instructions for each
compiler. Its smaller executor does not inherently make builds more correct.
CMake supplies dependencies and rules to either executor; build correctness also
depends on configuration, generated resources and incremental invalidation.
The matrix exercised clean builds, no-op invocations and the existing test suites.
It did not exhaustively test source/header edits, resource edits, generated-file
changes or every incremental-build scenario. Matching `.text` is strong evidence
for these particular outputs, not proof that every build rule is complete.

Use CMake/Ninja for faster iteration, including Visual Studio's CMake workflow,
when convenient. Keep the MSBuild presets for generated-solution use and
complementary validation. Keep clang-cl checks for their independent diagnostics;
the initialization warning improved explicitness without demonstrating a prior
uninitialized-memory bug. A later user decision changed the default presets and
script paths to clang-cl/Ninja. Safety flags and host runtime policy remain the
same; freeze the new host hash before starting frontend comparisons.

## Modern Windows C++ practice assessment

### Existing cache correction

The 2026-10-17 matrix found empty `CMAKE_CXX_FLAGS_RELEASE` and
`CMAKE_CXX_FLAGS_DEBUG` entries in the older `out/msvc-x64/CMakeCache.txt`.
Therefore, an older executable's `Release` folder name did not establish that it
was compiled with normal Release optimization. The fresh matrix uses explicit
flags in `windows-bench-base`, and reconfiguring with the preset corrects those
cache entries before rebuilding. Historical approximately 3.1 MiB runner sizes
remain observations of those exact old artifacts, not the optimized size floor
or evidence that a different compiler shrank the program by that amount.
The new optimized sizes must not be attributed to Ninja or clang-cl alone.

The current host is a sound modern Windows C++ foundation for the benchmark.
There is no single official "gold standard" stack: ownership, lifecycle handling,
narrow interfaces and demonstrated correctness matter more than choosing the
newest compiler or adding another build tool. Keep the architecture while using
the selected clang-cl/Ninja baseline and strengthening validation and measurement.

| Practice | Current implementation | Assessment / remaining evidence |
| --- | --- | --- |
| Explicit language and diagnostics | C++20, `/W4 /WX`, `/permissive-` | Appropriate for the current source |
| Automatic resource ownership | WIL handle/COM wrappers, standard smart pointers, WRL callbacks | Appropriate RAII design |
| Small public interface | Noncopyable window owner, hidden implementation, typed actions/statuses | Appropriate scope for this library |
| Asynchronous lifetime handling | Weak callback state, event unsubscription and controller shutdown | Several early-close paths are tested; not an exhaustive lifetime proof |
| Windows threading | STA ownership and message pump; native actions queued outside COM callbacks | Appropriate; application callbacks must remain brief |
| Error boundaries | Checked HRESULTs and exceptions contained at Win32/COM callbacks | Appropriate; independent review remains open |
| Windows application behavior | Unicode, asInvoker and PerMonitorV2 manifest | Appropriate configuration; manual interaction/DPI/AT checks remain |
| Binary protection | CFG, ASLR and NX settings | Inspected in the local runner; not proof of memory safety |
| Build and dependencies | CMake targets/presets and pinned SDK archives | Appropriate for two SDK dependencies |

References: [C++ Core Guidelines: RAII](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-raii),
[Microsoft WebView2 threading requirements](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/threading-model),
and [compiler/linker CFG configuration](https://learn.microsoft.com/en-us/cpp/build/reference/guard-enable-control-flow-guard?view=msvc-170).
This assessment is a focused source/configuration review, not independent audit
or production-release acceptance. See [VALIDATION.md](VALIDATION.md) for executed
checks and limitations.

### Prioritized improvements

1. **Add a separate diagnostic build.** Configure and run AddressSanitizer and
   focused static analysis. These are planned, not already-passed checks. Keep
   instrumentation out of resource/startup benchmarks. MSVC supports ASan, so
   this does not require changing compilers; account for its incompatible options.
   See [Microsoft ASan guidance](https://learn.microsoft.com/en-us/cpp/sanitizers/asan?view=msvc-170).
2. **Retain the second-compiler matrix.** clang-cl now passes the same policy,
   lifecycle and bridge tests. Repeat it after relevant native changes; its
   complementary diagnostics do not establish better rendering or startup.
3. **Measure resource-serving overhead before optimizing it.** The host currently
   reads requested assets synchronously on the STA, performing path/file checks
   with a 32 MiB per-file cap. Large files or many chunks can occupy that thread
   and affect startup responsiveness. Record asset count/bytes and serving time;
   use asynchronous resource deferrals only if measurements justify the added
   threading/lifetime complexity. Do not call the current path zero-overhead.
4. **Complete real Windows interaction checks.** Test keyboard focus,
   Narrator/NVDA, high contrast, scaling, monitor changes and minimize/restore.
   Hidden smoke checks do not establish those behaviors.
5. **Freeze the benchmark configuration.** Record source revision, host hash,
   compiler/linker/SDK, browser runtime, frontend asset hashes and test conditions.
   Use the same native host binary across all nine frontend variants.

The selected clang-cl/Ninja default needs no vcpkg migration, C++23 migration,
C++/WinRT rewrite or larger framework. MSVC/MSBuild remains supported.
WIL/WRL and Win32 fit the current task.

### Compiler mitigation audit (2026-10-18)

See the [C++/Rust hardening audit](../../host-test-support/HARDENING.md) for
actual compiler settings, inspected PE headers, the newly enabled Rust CFG
setting, and qualifications for SafeStack, automatic initialization, RTC and CET.
The frozen C++ clang-cl/Ninja executable remains unchanged. CMake's `/RTC1`
Debug setting must not be presented as proven MSVC-equivalent instrumentation
under clang-cl. CET compatibility and separate sanitizer validation remain open.
Frontend fixture implementation can proceed while these validation improvements
are tracked; comparative benchmark claims and production release acceptance
still require their respective evidence.
