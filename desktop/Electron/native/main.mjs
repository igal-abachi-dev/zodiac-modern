import { app, BrowserWindow, Menu, nativeTheme, protocol, session } from 'electron';
import { readFile } from 'node:fs/promises';
import { resolve, extname, isAbsolute, join } from 'node:path';
import { createHash } from 'node:crypto';
import { entry, csp, mime, assetKey, navigationAllowed } from './policy.mjs';
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'neutronstar',
    privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true },
  },
]);
const args = process.argv.slice(app.isPackaged ? 1 : 2);
let profile = join(app.getPath('userData'), 'BenchmarkProfile');
if (args.length) {
  if (args.length !== 2 || args[0] !== '--profile' || !isAbsolute(args[1]))
    throw Error('Only --profile <absolute directory> is supported');
  profile = args[1];
}
app.setPath('userData', profile);
// No renderer IPC/preload, shell execution, remote UI or automatic update service.
let main;
app
  .whenReady()
  .then(async () => {
    nativeTheme.themeSource = 'light';
    Menu.setApplicationMenu(null);
    const ses = session.fromPartition('neutronstar', { cache: true });
    ses.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    ses.setPermissionCheckHandler(() => false);
    ses.on('will-download', (event) => event.preventDefault());
    ses.webRequest.onBeforeRequest(
      { urls: ['*://*/*', 'file://*/*', 'neutronstar://*/*'] },
      (details, callback) => callback({ cancel: assetKey(details.url, details.method) === null }),
    );
    const manifest = JSON.parse(
      await readFile(resolve(import.meta.dirname, '../assets.json'), 'utf8'),
    );
    const assets = new Map(manifest.files.map((file) => [file.path, file]));
    const headers = {
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    };
    ses.protocol.handle('neutronstar', async (request) => {
      const key = assetKey(request.url, request.method),
        file = key && assets.get(key);
      if (!file) return new Response(null, { status: 403, headers });
      try {
        const bytes = await readFile(resolve(import.meta.dirname, '../renderer', key));
        if (
          bytes.length !== file.bytes ||
          createHash('sha256').update(bytes).digest('hex') !== file.sha256
        )
          throw Error('Asset integrity');
        return new Response(bytes, { headers: { ...headers, 'Content-Type': mime[extname(key)] } });
      } catch {
        return new Response(null, { status: 403, headers });
      }
    });
    main = new BrowserWindow({
      title: 'NeutronStar GUI Bench',
      width: 960,
      height: 640,
      useContentSize: true,
      backgroundColor: '#f8faf9',
      webPreferences: {
        session: ses,
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        webviewTag: false,
        devTools: !app.isPackaged,
        spellcheck: false,
      },
    });
    main.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    main.webContents.on('will-navigate', (event, url) => {
      if (!navigationAllowed(url)) event.preventDefault();
    });
    main.webContents.on('will-redirect', (event) => event.preventDefault());
    main.webContents.on('will-attach-webview', (event) => event.preventDefault());
    main.webContents.on('render-process-gone', () => {
      process.exitCode = 1;
      main?.destroy();
    });
    main.on('closed', () => {
      main = null;
    });
    await main.loadURL(entry);
  })
  .catch((error) => {
    console.error('Unable to initialize local application:', error.name);
    app.exit(1);
  });
app.on('window-all-closed', () => app.quit());
