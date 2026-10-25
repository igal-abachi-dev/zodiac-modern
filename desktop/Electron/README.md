# NeutronStar Electron

Independent Electron 45.0.0 + Svelte 5.57.2 implementation of the complete
[Tauri reference contract](../Tauri-v2-Svelte5/FEATURE-PARITY.md). It owns its UI,
TypeScript models, styles, build and assets; no sibling application is imported
or needed at build/run time. Fonts and icon designs follow the same specification.

The main screen, synthetic encryption/decryption progress, Cancel/Reset, About
dialog and complete filter/list workbench are implemented. Nothing encrypts,
decrypts, invokes Go, opens user files or sends application data to a service.

## Build and run

Build requirements: Windows 11 x64, Node **24.21.x**, pnpm **12.8.1**. Scripts
prefer the repository's cached tools when present; otherwise install those
versions normally. The packaged app includes Electron/Chromium/Node and needs
neither an installed Node nor WebView2 Runtime. Build-time Node differs from
Electron's own embedded Node version.

```powershell
# From this directory; first setup/download, then build:
.\Init.ps1
.\Build.ps1
.\Run.ps1
```

The current build already exists. Right-click **Run.ps1 → Run with PowerShell**
to launch it. Keep the entire
`out/NeutronStar-Electron-win32-x64/` folder together; the EXE alone is insufficient.
Close the app before rebuilding the generated folder.

`Init.ps1` installs the frozen lock with lifecycle scripts disabled, then runs
Electron's explicit official binary installer. `Build.ps1` checks formatting,
models, policy, types, the production asset tree and packaging. `pnpm dev` is a
loopback Vite **frontend preview**, not the packaged desktop benchmark. Do not
measure Vite/HMR or the development Electron executable as production.

## Architecture and controls

- Independent Svelte runes bind plain TypeScript workflow/list controllers to
  the DOM. No Nano Stores dependency or imported Tauri controller. This is an
  intentional implementation difference to disclose in a practical-stack test.
- Free Ark UI supplies dialog/progress mechanics; local Tailwind 4.3.3 CSS,
  Inter 400/500/600, Noto Sans Hebrew and Lucide supply the appearance. Workbench
  rendering is keyed and unvirtualized; rates are requested updates, not FPS.
- `native/main.mjs` owns the window/session and static custom protocol. The
  renderer has `sandbox`, `contextIsolation` and `webSecurity` enabled, no Node
  integration, no preload and no application IPC. A preload is unnecessary
  until a real native operation is designed.
- Packaged local assets live in ASAR and are served from an audited manifest
  with MIME/CSP headers, no history fallback and denied unknown assets. Manifest
  hashes detect asset mismatch; they are not a trusted publisher signature.
- App navigation, new windows, downloads and browser permissions are restricted.
  The session is in-memory, with an explicit profile root for runtime files;
  this does not imply that the OS/runtime writes no caches or contacts no services.
- Standard decorated, opaque, light window; 960 × 640 logical client baseline.
  No Mica/blur, custom chrome, engine-performance switches or native addons.

## Lessons applied from the Codex inspection

[desktop-gui.md §13.10](../desktop-gui.md#1310-user-supplied-codex-electron-inspection-transferable-architecture-lessons)
informs renderer/main separation, reproducible builds and binary fuses. RunAsNode,
NODE_OPTIONS and Node CLI inspection are disabled; ASAR-only loading is enabled.
The native helper uses the official Electron Packager (also used by Forge): a
portable benchmark folder needs no installer/publisher pipeline yet. Electron's
runtime license files and generated dependency notices are retained.

There is no need here for PTY, SQLite, Zod, telemetry, updater or a broad preload
API. Future native operations need typed, bounded contracts plus main-process
sender/origin/authority validation; adding a schema library alone would not grant
safe shell, SQL or filesystem access. These are transferable design lessons,
not claims about uninspected Codex source.

See [validation](VALIDATION.md) and [the desktop comparison plan](../DESKTOP-COMPARISON-PLAN.md).
No Electron-versus-Tauri/Avalonia benchmark result is claimed by this implementation.

Official references: [security](https://www.electronjs.org/docs/latest/tutorial/security),
[custom protocols](https://www.electronjs.org/docs/latest/api/protocol),
[Packager](https://github.com/electron/packager),
[stable release](https://releases.electronjs.org/release/v45.0.0).
