// Diagnostic main process only. Never copied into the packaged application.
import { app, BrowserWindow } from 'electron';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = resolve(import.meta.dirname, '..'),
  output = resolve(root, `.cache/runtime-smoke/run-${Date.now()}`);
await mkdir(output, { recursive: true });
app.setPath('userData', resolve(output, 'profile'));
let result = {
  passed: false,
  scope:
    'production main/assets in diagnostic Electron; not packaged fuse, timing or AT acceptance',
};
app.on('browser-window-created', (_event, win) => {
  win.webContents.once('did-finish-load', async () => {
    try {
      // Ready waits for animation frames; an occluded window may pause them.
      // Keep the diagnostic visible without changing background-throttling policy.
      win.show();
      win.moveTop();
      win.focus();
      const prefs = win.webContents.getLastWebPreferences();
      assert.equal(prefs.nodeIntegration, false);
      assert.equal(prefs.contextIsolation, true);
      assert.equal(prefs.sandbox, true);
      assert.equal(prefs.webSecurity, true);
      const checks = await win.webContents.executeJavaScript(`(async()=>{
    const until=performance.now()+15000;while(document.getElementById('status')?.textContent!=='Ready'){if(performance.now()>until)throw Error('Ready timeout');await new Promise(r=>setTimeout(r,20));}
    const violations=[];document.addEventListener('securitypolicyviolation',e=>violations.push(e.violatedDirective));
    const inline=document.createElement('script');inline.textContent='window.inlineProbeRan=true';document.body.append(inline);
    let evalBlocked=false;try{eval('window.evalProbeRan=true')}catch{evalBlocked=true;}
    let remoteBlocked=false;try{await fetch('https://example.invalid/probe')}catch{remoteBlocked=true;}
    const local=await fetch('/index.html'),missing=await fetch('/missing.map');
    document.getElementById('about-trigger').click();await new Promise(r=>setTimeout(r,100));
    const styles=[...document.querySelectorAll('[style]')].map(e=>({id:e.id,scope:e.getAttribute('data-scope'),part:e.getAttribute('data-part'),style:e.getAttribute('style')}));
    const popup=window.open('https://example.invalid/')===null;
    await new Promise(r=>setTimeout(r,50));
    return{requireAbsent:typeof window.require==='undefined',processAbsent:typeof window.process==='undefined',inlineBlocked:window.inlineProbeRan!==true,evalBlocked,remoteBlocked,local:local.status,missing:missing.status,popup,styles,violations};
   })()`);
      for (const key of [
        'requireAbsent',
        'processAbsent',
        'inlineBlocked',
        'evalBlocked',
        'remoteBlocked',
        'popup',
      ])
        assert.equal(checks[key], true, key);
      assert.equal(checks.local, 200);
      assert.equal(checks.missing, 403);
      for (const item of checks.styles) {
        assert.equal(item.id, 'about-content');
        assert.equal(item.scope, 'dialog');
        assert.equal(item.part, 'content');
        for (const declaration of item.style
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean))
          assert.match(
            declaration,
            /^(?:(?:--layer-index|--nested-layer-count)\s*:\s*0|pointer-events\s*:\s*auto)$/,
          );
      }
      result = {
        ...result,
        passed: true,
        checks,
        versions: {
          electron: process.versions.electron,
          chrome: process.versions.chrome,
          node: process.versions.node,
        },
        preferences: {
          sandbox: prefs.sandbox,
          contextIsolation: prefs.contextIsolation,
          nodeIntegration: prefs.nodeIntegration,
        },
      };
    } catch (error) {
      result = { ...result, error: error.stack };
    } finally {
      await writeFile(resolve(output, 'result.json'), JSON.stringify(result, null, 2));
      console.log(JSON.stringify({ passed: result.passed, output }));
      if (!result.passed) app.exit(1);
      else win.close();
    }
  });
});
await import('../.cache/package-input/native/main.mjs');
