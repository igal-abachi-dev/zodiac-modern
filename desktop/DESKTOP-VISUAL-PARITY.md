# Desktop visual and control parity

2026-11-05. This is a visual/correctness pass, not a new performance comparison.

## References and boundary

`Tauri-v2-Svelte5` is the primary appearance and workflow reference. Avalonia is
the secondary reference for desktop details, including its list/filter presentation
and native keyboard interactions. Each candidate continues to own its implementation.

The user's final constraint is **maximum parity with standard controls and their
supported styling APIs, without custom-painted replacement controls**. Keep native
editing, selection, caret, focus traversal, scrolling and accessibility behavior.
No application-defined owner-drawn wx button/gauge/list, replacement Slint widget library, forked
toolkit templates, browser inside a native candidate, or new control dependency
was introduced for this pass. Existing icon artwork and ordinary background/layout
containers are decoration, not replacement input controls.

This constraint takes precedence over an aspirational “90–99%” resemblance. There
is no validated universal percentage: fonts, OS chrome, scrollbars, text shaping
and standard-control states differ. Screenshots and control geometry expose those
differences instead of hiding them with a fabricated score.

## Shared visual targets

| Item | Target in logical pixels |
| --- | --- |
| Surface / text | `#f8faf9` / `#171a18` |
| Cards / inset / muted text | `#fff` / `#f1f4f2` / `#5d6660` |
| Border / accent | `#dce3de` / `#047857` |
| Content | Centered, maximum 1100; outer padding 28, then 20 below 760-wide client |
| Header | 24, semibold, compact tracking; 40-square brand container; 20-square glyph |
| Body | 14; local Inter/Noto Hebrew where supported; framework/OS emoji fallback |
| Cards | Two equal columns, 20 gap; stacked below 760; padding 16; radius 8 where supported |
| Fixture | Static synthetic text, minimum height 94, padding 13, inset background |
| Buttons | Height 40; secondary white; encryption emerald; disabled and focus states retained |
| Progress | Six-pixel track where the public control/theme API allows; status card and split caption |
| Fields | External label, approximately 40 high; visible focus; standard selection/caret/typing |
| Dialog | Approximately 420 wide; 24 content padding; standard modal focus and Escape/Close behavior |
| Lists | Same eager 1k/10k data and actions; desktop rows follow Avalonia where applicable |

The same 960×640 client size does not imply the same content width: stock scrollbars
may reserve a gutter. Native widget metrics and font rasterization also vary.
Do not stretch screenshots to conceal these differences.

## What the implementations show

Effort below describes these implementations, **not a universal framework ranking**.
A larger change can repair an earlier scaffold choice rather than reveal a toolkit
limitation.

| Candidate | Supported route used | Remaining stock-control differences / trade-off |
| --- | --- | --- |
| Electron / Svelte | CSS tokens, dimensions, breakpoints and existing Ark controls | Close to the primary reference; Chromium/OS scrollbars and glyph rasterization can differ from WebView2 |
| Avalonia | XAML styles, line metrics, alignment, stock Fluent buttons/fields/progress | Close reference; Skia text metrics and Fluent interaction states remain |
| WinUI MVVM | Stock WinUI styles and theme resources, XAML layout | Progress-track thickness is adjustable without replacing its template; native dialog, scrollbar, focus and text metrics remain |
| WinUI Reactor | Same WinUI controls/resources through declarative C# layout | Same styling capability as MVVM; earlier layout gaps are application code, not a second renderer |
| Flutter | Material themes, explicit desktop density, standard icon buttons, field decoration and Dialog | Broad styling; Material focus/ripple/selection/scroll behavior remains. Desktop density otherwise reduces apparent button height |
| Qt/QML | Existing Basic control styling, palette, fixed line metrics and layout | Broad declarative styling; stock progress/scroll/edit behavior and popup metrics remain |
| React Native Windows | Existing Fabric View/Text/Pressable/TextInput/ScrollView styles and responsive layout | Larger main-screen restructuring was needed. This pinned Windows text path still uses system Segoe UI rather than loading the packaged Inter collection |
| Slint | Stock Fluent widgets; public dimensions/icons; ordinary layout containers | Button/selection accent follows the stock Fluent/system palette. Public Palette colors are output properties; no private palette mutation or toolkit fork. Required Slint attribution stays visible in About |
| wxWidgets | Native wxMSW controls, fonts/colors, box sizers, wrapping and native scrolling | Largest native appearance limit here: Win32 borders, button/gauge theme, dialog caption, list selection and scrollbars remain. No owner drawing was added |
| Dear ImGui DX12/DX11 | Stock Button/InputText/ProgressBar/child/popup styling and immediate layout | Styling is flexible, but stock controls still lack UIA and full bidi/complex shaping/color-emoji parity. No native editing/accessibility claim follows from pointer tests |

Notable corrections: fixed message fixtures replace the earlier editable main
text areas in React Native/wxWidgets/ImGui; About returns to the header; status
and action placement are aligned. wxWidgets now changes header/footer sizer
orientation and wraps text instead of retaining desktop minimum widths in a narrow
window. Slint's logo positioning is explicit. No workflow or timer model was
replaced to achieve the appearance.

## Verification and evidence

### Lucide icons and SVG capability

The seven in-content icons are orbit, info, shield-check, lock-keyhole,
unlock-keyhole, arrow-down-to-line and arrow-up-from-line. Keep the same trusted
Lucide 1.58.0 artwork, 24-unit source geometry, approximately 16-pixel control icons,
20-pixel brand glyph and 14-pixel badge glyph. Decorative images do not replace
button labels. Primary-action icons use a white foreground explicitly: an external
SVG image does not inherit its HTML button's text color.

| Candidate | Actual icon path in this implementation |
| --- | --- |
| Tauri / Electron | Local external SVG images; CSS supplies primary-icon inversion |
| Avalonia | Trusted Lucide paths converted to normal XAML Path geometry, inside a Viewbox; not a general SVG parser |
| WinUI MVVM | Same vector geometry through standard Path/Viewbox controls |
| WinUI Reactor | Native SvgImageSource/Image with local SVG files and an explicit white action variant |
| Flutter | Local SVG through the already-pinned flutter_svg package; standard color filter for primary action |
| Qt | Resource-embedded SVG through Image, including action/About slots in the existing Button styling |
| Slint | Local SVG images and stock Fluent Button.icon; its supported colorize-icon setting follows the control foreground |
| wxWidgets | wxBitmapBundle::FromSVGFile and standard native button bitmap slots; DPI-aware SVG-backed bundles |
| React Native Windows | Standard native Image with 96×96 PNGs generated offline from the seven trusted SVGs, displayed at logical icon sizes and tinted through Image styles |
| Dear ImGui | Official Lucide font, subset offline to seven glyphs (3,496 bytes), through the standard font atlas/Text/Button path; handwritten icon approximations removed |

These are different capabilities, not eleven identical SVG DOMs. React Native's
current image path uses the raster fallback; no new SVG adapter was installed.
ImGui's icon-font route follows its [official icon guidance](https://github.com/ocornut/imgui/blob/master/docs/FAQ.md#q-how-can-i-easily-use-icons-in-my-application),
using the [official Lucide font](https://lucide.dev/guide/static/font). Its subset
script pins the source font hash, FontTools version and codepoints and records
the output hash. It is a development-time asset conversion, not a runtime Python
dependency or SVG renderer. Color-only SVG variants retain their source hash and
unchanged path data in adjacent metadata. A Lucide icon audit does not certify
general SVG filters, animation, arbitrary imported SVG or every DPI level.

### Actual-window checks

The existing candidate checker now captures client-area main, running, dialog,
workbench, focused-filter and narrow views. It records button rectangles in DIP
and rejects a narrow action extending beyond the client width: stacking alone is
insufficient. Captures only check foreground ownership; they do not steal keyboard
focus. The Hebrew test fixture uses explicit Unicode escapes to avoid source
encoding corruption.

Commands (from `desktop`, after each candidate's `Build.ps1`):

```powershell
.\host-test-support\visual-parity\Run.ps1
.\Dear-ImGui-dx11-12\Validate.ps1
.\host-test-support\visual-parity\Collect.ps1
```

GUI checks run sequentially. The collector retains accepted screenshots, result
JSON, executable hashes and available build receipts. See the
[gallery and evidence manifest](host-test-support/visual-parity/results/2026-11-05/manifest.json)
and [main-screen gallery](host-test-support/visual-parity/results/2026-11-05/main-gallery.png).
The previous day's capture directory is an intermediate inspection checkpoint.

These are synthetic-data correctness/visual checks at the recorded DPI. They are
not timing results, a full visual-difference score, real IME composition, spoken
Narrator/NVDA acceptance, OS high contrast, clean-machine delivery or multi-monitor
acceptance. The previously deferred physical checks remain open. Native scrollbar
appearance does not establish matching scroll latency or frame pacing.

## Benchmark consequences

Rebuild and freeze artifacts again before the cross-stack pilot. Styling changes,
the installed .NET SDK patch pin (10.0.403), fonts and list geometry can change
layout cost and hashes. Historic accepted cohorts remain evidence for their old
artifacts; they do not benchmark this visual revision. Preserve native-control
differences in the result table, especially Slint's palette/attribution, wxMSW's
list/control model and ImGui's shaping/accessibility gaps.

Do not infer that a candidate requiring more layout repair is slower, less
reliable or incapable of sophisticated UI. This pass measures implementation
parity and exposes styling limits; the later calibrated cohort measures runtime
costs.
