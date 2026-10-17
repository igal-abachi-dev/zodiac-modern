# pywebview validation

Executed 2026-10-18. Packaged research host, not release/security acceptance.
No comparative benchmark runs.

- Project-local Python **3.13.15**, pywebview **6.2.1**, pythonnet **3.2.1**,
  clr-loader **0.3.1**, PyInstaller **6.22.3**. Hash-locked dependency restore
  completed; Python/CLR/framework imports and policy unit test passed.
- Static WSGI handler test covers six allow/deny/path/method cases. It is not a
  substitute for native remote-navigation/permission enforcement testing.
- Packaged `onedir/windowed` executable built. All **17** Svelte production files
  verified before packaging against manifest
  `211ec53bbf3677974de1f1987aaadba58530739662dadcf5763bb300029f6902`.
  Keep the entire `dist/neutronstar-pywebview/` folder when running/copying.
- Executable SHA-256:
  `5b803aa8a8ed1dacebf7204ac251837bb0eba5be2f9778813fea1e52ee6244f3`.
  The exe hash is not a manifest of every bundled DLL; freeze the complete
  distribution before measurements. Receipt: `.cache/build-receipt.json`.
- External production UIA/real-input workflow **passed**, exit 0:
  Ready, About/open/close, encryption simulation/completion, Reset,
  decryption simulation/Cancel, Reset, then WM_CLOSE.
  Evidence: `.cache/native-smoke-v5.json`.

Earlier v1-v4 failures were checker window selection/unsupported InvokePattern/
foreground-input issues. Their reports remain preserved. They are not measured
startup samples or accepted app lifecycle failures.

## Still open

Native CSP/injected-script audit, navigation/popup/download/permissions probes,
client-area/DPI calibration, supplemental workloads, physical AT/IME/high-contrast/
multi-monitor checks, profile cleanup and run-owned browser-helper exit.
The framework's loopback transport, outer-window sizing, private-profile cleanup,
injected bridge and lack of public native deny callbacks differ from raw hosts;
see [README](README.md). A passing screen does not establish policy parity or
admit it to a retained-profile-equivalent timing cohort.
