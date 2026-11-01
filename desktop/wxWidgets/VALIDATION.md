# wxWidgets validation

2026-11-02. Independent full main/workbench candidate; no comparative benchmark.

- wxWidgets 3.2.12 official source archive, SHA-256
  `1F7EC935DDDBBA5CF454795DC255EF1E21C668533F5A5951A6034F2949C80433`.
- Release C++20 build: clang-cl 22.1.3, CMake 4.3/Ninja, Microsoft linker,
  Microsoft static CRT, Windows SDK 26100. Build log and package receipt retained.
- CTest model contract passes: generations/cancel/reset, bounded progress,
  complete deterministic ID sequence, row updates, exact filters and bounds.
- Final full external UIA3/real-input correctness run passed with exit 0 and
  no surviving discovered helper processes, at 192 DPI. About Escape/Close/Tab,
  focus restoration, completed/canceled operations, 1k/10k list transitions,
  filtering during updates, Stop, remount, leaving active work, clean reopen,
  main workflow after workbench and 480/960 DIP layouts are covered.
- Final screenshots were reviewed; punctuation and icon DPI sizing were corrected
  before the final run. Standard Windows controls/text differ from Ark/WebView2.
- PE headers confirm CFG, high-entropy ASLR, dynamic base and NX compatibility.
  CET is requested at link time; hardware enforcement is not established here.

Final checker attempt: `check-6016002a6b1c466689da457cf4032401`.
Retained evidence lives under `validation/2026-11-02/`; the `.cache` attempts
remain local. Earlier failed attempts caught the missing DPI manifest, costly
unbounded UIA list searches and the Stop-after-natural-completion case. They are
not performance measurements. Failure screenshots taken with another process
foreground were discarded, and capture is now guarded by foreground process ID.

Open acceptance gates: clean Windows deployment, Narrator/NVDA spoken output,
real IME preedit/commit/cancel, live OS high contrast, 150/200% and multi-monitor
DPI moves. The user deferred those physical checks. No claim that UIA substitutes
for them. Structural list changes rebuild native items rather than preserve
keyed-DOM peer identity; record this before measuring. Distribution/licence and
independent security reviews remain separate.
