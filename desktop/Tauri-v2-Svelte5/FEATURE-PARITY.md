# Reference feature inventory

This application owns its Svelte sources and embeds its production `dist` through
the normal Tauri build. It does not load the historical benchmark's shared dist.

| Feature | Implementation |
| --- | --- |
| Main screen | English/Hebrew/emoji fixture; Decrypt left, Encrypt right; simulation disclosure |
| Workflow | Two-second synthetic progress, completion, cancellation, reset and disabled actions |
| Controls | Ark dialog and progress; Escape, Close and trigger focus restoration |
| Design | Local Inter/Noto Hebrew, Lucide icons, external Tailwind stylesheet, light default |
| Workbench entry | Open workbench; lazy local chunk at `#/workbench`; Back to main screen |
| Lists | Keyed, unvirtualized 1,000/10,000 rows; advancing IDs; reverse; splice ten; update ten percent |
| Filtering | Case-sensitive label search, empty results, live row/tick summary |
| Activity | Requested 10/30/60 Hz bursts for two seconds; Stop; filtering during updates |
| Lifecycle | Remount resets IDs/query/tick; leaving disposes timers; reopening starts fresh |
| Native shell | Explicit Rust window builder, standard chrome, 960 × 640 logical client area |
| Production boundary | Embedded local assets; restrictive CSP; no app commands, Go CLI or cryptography |

The original browser collector's test-only globals and measurement injection are
not product UI features and are not shipped here. Requested update rates are not
claims about achieved frame rates. Lazy workbench loading is part of this new
reference; historical startup results do not measure this new executable.

See [validation](VALIDATION.md) for the checked build and actual interaction
evidence. Later Avalonia and Electron implementations must own their UI, state
and build; matching this inventory does not mean importing this renderer.
