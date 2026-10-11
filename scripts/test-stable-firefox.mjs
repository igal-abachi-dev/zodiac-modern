// Synthetic author-run native Firefox/WebDriver checks; no production secrets.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  readdir,
  unlink,
} from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { performance } from 'node:perf_hooks';
import { prepareInterop } from './interop.mjs';

const binary = resolve(
  process.env.ZODIAC_FIREFOX_BINARY ??
    '.cache/stable-browser-check/firefox/core/firefox.exe',
);
const driver = resolve(
  process.env.ZODIAC_GECKODRIVER ??
    '.cache/stable-browser-check/geckodriver.exe',
);
const generated = 'src/generated/default-recipient.ts';
const previous = await readFile(generated).catch((e) => {
  if (e.code === 'ENOENT') return null;
  throw e;
});
const report = {
  recorded: new Date().toISOString(),
  scope:
    'Stock stable Firefox, synthetic file:// workflow using Mozilla WebDriver. Headless automated compatibility, not human usability, real email paste, OS network denial, independent review or a release verdict.',
  checks: [],
  timings: [],
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (b) => createHash('sha256').update(b).digest('hex');
let service, session, socket;
let endpoint;
let sequence = 0;
const pending = new Map();
const remoteRequests = [];
const runtimeErrors = [];
try {
  await readFile(binary);
  await readFile(driver);
  const build = spawnSync(
    process.execPath,
    ['scripts/build-offline.mjs', 'fixture'],
    { encoding: 'utf8', windowsHide: true, timeout: 60000 },
  );
  assert.equal(build.status, 0, build.stderr);
  await prepareInterop();
  const candidate = resolve(
    'artifacts/offline probe שלום/zodiac-synthetic-probe.html',
  );
  const bytes = await readFile(candidate);
  report.candidate = { bytes: bytes.length, sha256: hash(bytes) };
  report.tools = {
    browserExecutableSHA256: hash(await readFile(binary)),
    driverExecutableSHA256: hash(await readFile(driver)),
  };
  const probe = createServer();
  await new Promise((r) => probe.listen(0, '127.0.0.1', r));
  const port = probe.address().port;
  await new Promise((r) => probe.close(r));
  endpoint = 'http://127.0.0.1:' + port;
  service = spawn(
    driver,
    [
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--websocket-port',
      '0',
      '--log',
      'fatal',
    ],
    { windowsHide: true, stdio: 'ignore' },
  );
  let serviceError;
  service.on('error', (e) => {
    serviceError = e;
  });
  for (let n = 0; ; n++) {
    if (serviceError) throw serviceError;
    try {
      const r = await fetch(endpoint + '/status', {
        signal: AbortSignal.timeout(1500),
      });
      if (r.ok) break;
    } catch {}
    assert(n < 100, 'Geckodriver did not become ready');
    await pause(100);
  }
  await mkdir('artifacts/en04', { recursive: true });
  const downloads = await mkdtemp(resolve('artifacts/en04/firefox-downloads-'));
  const request = async (method, path, body) => {
    report.lastWebDriverOperation = method + ' ' + path;
    const r = await fetch(endpoint + path, {
      method,
      ...(body
        ? {
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
          }
        : {}),
      signal: AbortSignal.timeout(60000),
    });
    const data = await r.json();
    if (!r.ok || data.value?.error)
      throw Error(
        'WebDriver ' +
          path +
          ': ' +
          (data.value?.error ?? r.status) +
          (path === '/session' ? ': ' + data.value?.message : ''),
      );
    return data.value;
  };
  const created = await request('POST', '/session', {
    capabilities: {
      alwaysMatch: {
        browserName: 'firefox',
        webSocketUrl: true,
        'moz:firefoxOptions': {
          binary,
          args: ['-headless'],
          prefs: {
            'browser.download.folderList': 2,
            'browser.download.dir': downloads,
            'browser.download.useDownloadDir': true,
            'browser.helperApps.neverAsk.saveToDisk':
              'text/plain,image/svg+xml,image/png,application/json,application/octet-stream',
          },
        },
      },
    },
  });
  session = created.sessionId;
  assert.equal(created.capabilities.browserName, 'firefox');
  report.browserVersion = created.capabilities.browserVersion;
  report.platform = created.capabilities.platformName;
  const base = '/session/' + session;
  socket = new WebSocket(created.capabilities.webSocketUrl);
  await new Promise((r, reject) => {
    const timer = setTimeout(
      () => reject(Error('BiDi connection timed out')),
      10000,
    );
    socket.addEventListener(
      'open',
      () => {
        clearTimeout(timer);
        r();
      },
      { once: true },
    );
    socket.addEventListener(
      'error',
      (event) => {
        clearTimeout(timer);
        reject(
          Error(
            'BiDi connection failed: ' +
              created.capabilities.webSocketUrl +
              ': ' +
              (event.error?.message ?? event.message ?? 'unknown socket error'),
          ),
        );
      },
      { once: true },
    );
  });
  socket.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id) {
      const p = pending.get(m.id);
      if (p) {
        pending.delete(m.id);
        m.type === 'error'
          ? p.reject(Error('BiDi ' + m.error))
          : p.resolve(m.result);
      }
    }
    if (
      m.method === 'network.beforeRequestSent' &&
      /^https?:/.test(m.params.request.url)
    )
      remoteRequests.push(m.params.request.url);
    if (
      m.method === 'log.entryAdded' &&
      m.params.type === 'javascript' &&
      m.params.level === 'error'
    )
      runtimeErrors.push(m.params.type);
  });
  const bidi = (method, params) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(Error('BiDi command timed out: ' + method));
      }, 10000);
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
  await bidi('session.subscribe', {
    events: ['network.beforeRequestSent', 'log.entryAdded'],
  });
  await bidi('script.addPreloadScript', {
    functionDeclaration:
      "() => { window.__zodiacTestCsp = []; document.addEventListener('securitypolicyviolation', e => window.__zodiacTestCsp.push(e.violatedDirective)); }",
  });
  const js = (fn, ...args) =>
    request('POST', base + '/execute/sync', {
      script: 'return (' + fn.toString() + ')(...arguments)',
      args,
    });
  const element = async (using, value) =>
    (await request('POST', base + '/element', { using, value }))[
      'element-6066-11e4-a52e-4f735466cecf'
    ];
  const button = async (text) =>
    request(
      'POST',
      base +
        '/element/' +
        (await element(
          'xpath',
          '//button[normalize-space(.)="' + text + '"]',
        )) +
        '/click',
      {},
    );
  const set = (selector, value) =>
    js(
      (selector, value) => {
        const node = document.querySelector(selector);
        node.value = value;
        node.dispatchEvent(new Event('input', { bubbles: true }));
      },
      selector,
      value,
    );
  const wait = async (fn) => {
    const end = performance.now() + 20000;
    while (!(await js(fn))) {
      assert(performance.now() < end, 'UI state timed out');
      await pause(100);
    }
  };
  await request('POST', base + '/window/rect', { width: 1280, height: 800 });
  let started = performance.now();
  await request('POST', base + '/url', { url: pathToFileURL(candidate).href });
  await wait(() => !!document.querySelector('.recipient-summary strong'));
  report.timings.push({
    phase: 'file-open-and-initial-render',
    milliseconds: performance.now() - started,
  });
  assert(
    await js(() => isSecureContext && !!crypto.subtle),
    'Native crypto unavailable',
  );
  let raw, metadata;
  for (const bits of [3072, 4096]) {
    if (await js(() => document.querySelector('#custom-public-key').hidden))
      await button('Use a custom public key');
    started = performance.now();
    const pemPath = resolve(
      'receiver/tests/fixtures/keys/openssl-3.5-' + bits + '-public.pem',
    );
    if (bits === 3072)
      await request(
        'POST',
        base +
          '/element/' +
          (await element('css selector', '#public-key-file')) +
          '/value',
        { text: pemPath },
      );
    else {
      await set('#public-key-paste', await readFile(pemPath, 'utf8'));
      await button('Use pasted public key');
    }
    await wait(
      () =>
        document
          .querySelector('.recipient-summary')
          ?.textContent.includes('Custom recipient') &&
        !document.querySelector('#custom-public-key')?.disabled,
    );
    assert(
      (
        await js(() => document.querySelector('.recipient-summary').textContent)
      ).includes('RSA-' + bits),
    );
    report.timings.push({
      phase: 'public-key-import',
      rsaBits: bits,
      milliseconds: performance.now() - started,
    });
    await set(
      '#message',
      'Synthetic stock Firefox שלום 🔑\n  preserved spaces  ',
    );
    const original = await js(() => document.querySelector('#message').value);
    assert(
      await js(
        () =>
          [...document.querySelectorAll('button')].find(
            (b) => b.textContent.trim() === 'Encrypt message',
          ).disabled === false,
      ),
    );
    assert(
      await js(
        () => document.querySelector('.compare-confirmation input').checked,
      ),
    );
    started = performance.now();
    await button('Encrypt message');
    await wait(() => !!document.querySelector('#raw-ciphertext'));
    report.timings.push({
      phase: 'encrypt-and-result-render',
      rsaBits: bits,
      milliseconds: performance.now() - started,
    });
    raw = await js(() => document.querySelector('#raw-ciphertext').value);
    assert.match(raw, /^[A-Za-z0-9_-]+$/);
    assert(await js(() => document.activeElement?.id === 'result-title'));
    assert(await js(() => !document.querySelector('#message')));
    const openssl =
      process.env.ZODIAC_OPENSSL35 ??
      resolve('.cache/toolchains/openssl35/x64/bin/openssl.exe');
    const key = spawnSync(
      openssl,
      [
        'pkcs8',
        '-in',
        resolve('receiver/tests/fixtures/keys/openssl-3.5-' + bits + '.pem'),
        '-passin',
        'file:' +
          resolve('receiver/tests/fixtures/keys/synthetic-password.txt'),
        '-outform',
        'DER',
      ],
      { windowsHide: true },
    );
    assert.equal(key.status, 0);
    try {
      const decrypted = spawnSync(resolve('artifacts/interop-oracle.exe'), [], {
        windowsHide: true,
        encoding: 'utf8',
        input: JSON.stringify({
          Mode: 'decrypt',
          PrivateDER: key.stdout.toString('base64'),
          Raw: raw,
        }),
      });
      assert.equal(decrypted.status, 0);
      assert.equal(
        Buffer.from(JSON.parse(decrypted.stdout).result, 'base64').toString(
          'utf8',
        ),
        original,
      );
    } finally {
      key.stdout.fill(0);
    }
    for (const [name, extension] of [
      ['Download ciphertext (.txt)', 'txt'],
      ['Download full SVG', 'svg'],
      ['Download complete artwork PNG', 'png'],
      ['Download metadata JSON', 'json'],
    ]) {
      const before = new Set(await readdir(downloads));
      started = performance.now();
      await button(name);
      let found;
      const end = performance.now() + 20000;
      while (!found) {
        const names = await readdir(downloads);
        if (!names.some((f) => f.endsWith('.part')))
          found = names.find(
            (f) => !before.has(f) && f.endsWith('.' + extension),
          );
        assert(performance.now() < end, 'Download timed out');
        if (!found) await pause(100);
      }
      const exported = await readFile(join(downloads, found));
      if (extension === 'txt') assert.equal(exported.toString('utf8'), raw);
      if (extension === 'svg')
        assert.equal(
          [...exported.toString().matchAll(/data-offset="\d+"/g)].length,
          raw.length,
        );
      if (extension === 'png') {
        assert.equal(
          exported.subarray(0, 8).toString('hex'),
          '89504e470d0a1a0a',
        );
        assert(exported.readUInt32BE(20) <= 4096);
      }
      if (extension === 'json') {
        metadata = JSON.parse(exported.toString());
        assert.equal(metadata.raw, raw);
      }
      report.timings.push({
        phase: extension + '-export',
        rsaBits: bits,
        milliseconds: performance.now() - started,
      });
    }
    await js(() => {
      window.print = () => {};
    });
    started = performance.now();
    await button('Print / Save as PDF');
    await wait(() => !!document.querySelector('.print-page'));
    assert.equal(
      await js(
        () => document.querySelectorAll('.print-page [data-offset]').length,
      ),
      raw.length,
    );
    assert.equal(
      await js(
        () =>
          document.querySelectorAll('.print-page [data-after-offset]').length,
      ),
      Math.floor(raw.length / 8),
    );
    report.timings.push({
      phase: 'print-page-preparation',
      rsaBits: bits,
      milliseconds: performance.now() - started,
    });
    await js(() => window.dispatchEvent(new Event('afterprint')));
    assert.equal(
      await js(() => document.querySelectorAll('.zodiac-print-root').length),
      0,
    );
    await js(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            throw Error('synthetic denial');
          },
        },
      });
    });
    await button('Copy raw');
    await wait(() => document.activeElement?.id === 'raw-ciphertext');
    assert.equal(
      await js(
        () =>
          document.querySelectorAll('.glyph-plate .glyph-cell[data-character]')
            .length,
      ),
      512,
    );
    assert.equal(
      await js(
        () =>
          document.querySelectorAll('.glyph-plate [data-kind="null"]').length,
      ),
      64,
    );
    await button('Encrypt another message');
    assert.equal(await js(() => document.querySelector('#message').value), '');
    report.checks.push({
      rsaBits: bits,
      passed: true,
      scope:
        'custom key, fingerprint gate, native crypto/independent Go, exact raw/SVG/PNG/JSON, print payload/nulls, copy fallback and reset',
    });
  }
  await button('Clear everything');
  await js(() =>
    [...document.querySelectorAll('summary')]
      .find((n) => n.textContent.trim() === 'Recover raw ciphertext locally')
      .click(),
  );
  await set('#recovery-text', raw);
  await button('Validate raw ciphertext');
  await wait(() => !!document.querySelector('#recovered-raw'));
  assert.equal(
    await js(() => document.querySelector('#recovered-raw').value),
    raw,
  );
  await button('Clear recovery');
  await button('Printed rows');
  await set('#recovery-envelope', metadata.context.envelopeSHA256);
  await set('#recovery-fingerprint', metadata.context.recipientFingerprint);
  await set('#recovery-total', String(raw.length));
  for (const p of metadata.pages) {
    await set('#recovery-page', String(p.pageIndex + 1));
    await set('#recovery-page-code', p.digest.slice(0, 12));
    await set(
      '#recovery-rows',
      p.rows
        .map((r) => r.rowIndex + 1 + ' ' + r.raw + ' ' + r.checkCode)
        .join('\n'),
    );
    await button('Check rows / add complete page');
  }
  assert.equal(
    await js(() => document.querySelector('#recovered-raw').value),
    raw,
  );
  await button('Clear recovery');
  assert.deepEqual(
    await js(() => [localStorage.length, sessionStorage.length]),
    [0, 0],
  );
  assert.equal(await js(() => document.querySelectorAll('[style]').length), 0);
  assert.deepEqual(
    await js(
      () =>
        /** @type {Window & {__zodiacTestCsp: string[]}} */ (window)
          .__zodiacTestCsp,
    ),
    [],
  );
  assert.deepEqual(remoteRequests, []);
  assert.deepEqual(runtimeErrors, []);
  report.checks.push({
    passed: true,
    scope:
      'raw and printed-row recovery; no page HTTP requests, runtime errors, CSP violations, style attributes or local/session storage',
  });
  report.passed = true;
  console.log(
    'Stock stable Firefox ' +
      report.browserVersion +
      ': both RSA sizes and offline flow passed.',
  );
} catch (e) {
  report.passed = false;
  report.failure = e.message;
  process.exitCode = 1;
  console.error(e.stack ?? e.message ?? String(e));
} finally {
  if (session && endpoint)
    await fetch(endpoint + '/session/' + session, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000),
    }).catch(() => {});
  socket?.close();
  service?.kill();
  if (previous) await writeFile(generated, previous);
  else
    await unlink(generated).catch((e) => {
      if (e.code !== 'ENOENT') throw e;
    });
  await mkdir('artifacts/en04', { recursive: true });
  await writeFile(
    'artifacts/en04/stable-firefox-results.json',
    JSON.stringify(report, null, 2) + '\n',
  );
}
