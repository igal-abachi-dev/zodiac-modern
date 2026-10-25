# Independent desktop correctness checks

From this directory, run `./Run.ps1 -Candidate Both`, `Avalonia`, `Electron` or
`WinUI`. `Both` preserves the original Avalonia/Electron pair; select `WinUI`
explicitly for the unpackaged native WinUI MVVM candidate.
`Reactor` and `Flutter` select the independent preview-MVU and Dart candidates.
Reactor's correctness lane explicitly allows 180-second semantic / 30-second UIA
deadlines; these are not benchmark timing budgets or an acceptance of UI hangs.
Build the applications first. Requires the pinned .NET SDK and restores locked
FlaUI 5 UIA3 dependencies. It opens one actual app at a time and uses the pointer
and keyboard; leave that window undisturbed. `-LayoutOnly` skips workflow/list
checks for focused layout verification.

The checker follows semantic endpoints for main simulation/cancel/reset, About
Escape/Close/focus, full keyed list/filter operations, requested 10/30/60 Hz
activity, Stop/remount/disposal/reopen, dialog Tab containment and 480/960 DIP
layout. It records process identities, discovered helper exit and screenshots of
synthetic content. Every attempt gets its own application `.cache/check-*` tree.

Native Avalonia's tree has no browser Document node, and Windows' title-bar Close
must be distinguished from the dialog Close button. Native visibility/scroll
changes also need layout stabilization before physical pointer input. The checker
handles those differences without modifying application state or adding app hooks.
WinUI's ContentDialog also has the standard `CloseButton` ID, list peer resets
are polled, keyboard input waits for focus, and off-screen card geometry is
validated with native scrolling/alignment instead of unsupported rectangles.
Capture uses HWND bounds; UIA bounds need not include the same non-client region.
Flutter 3.47 Windows currently exposes the supplied semantic names/roles without
their Dart `Semantics.identifier` as UIA AutomationId. Its adapter searches the
client Pane (excluding the native caption buttons), uses targeted name conditions
and the named Synthetic rows group. It does not enumerate all row peers to read
one summary. Synthetic keyboard edit sequences allow selection/deletion to settle.
Reactor exposes its row panel through an actual SemanticPanel peer and Stop's
public HelpText reports committed active/stopped state before stability checks.

This is correctness/visual evidence, **not the comparative measurement harness**.
Read retries, stabilization waits, screenshots and UIA observation overhead are
not unbiased render/script timings. Physical screen reader/IME/contrast/DPI,
GPU/power and broader lifecycle acceptance remain separate. The older frozen
six-host collectors/results have not been replaced by this new checker.
