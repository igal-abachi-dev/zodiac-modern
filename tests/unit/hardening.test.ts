import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { expect, it } from 'vitest';
import { buildHeaders } from '../../scripts/build-host-headers.mjs';
import { checkPolicy } from '../../scripts/check-policy.mjs';
import {
  checkArtifact,
  rejectFixtureMaterial,
} from '../../scripts/check-artifact.mjs';
import { contentSecurityPolicy } from '../../config/security-policy';

it('detects stale built hashes and provider policy divergence, with a shared restrictive file policy', async () => {
  const root = await mkdtemp(resolve('.cache/hardening-policy-'));
  try {
    await writeFile(
      join(root, 'index.html'),
      '<script>console.log("public build")</script><style>body{color:black}</style>',
    );
    await buildHeaders(root);
    await expect(checkPolicy(root)).resolves.toHaveProperty(
      'X-Frame-Options',
      'DENY',
    );
    const before = await readFile(join(root, 'index.html'), 'utf8');
    await writeFile(
      join(root, 'index.html'),
      before.replace('public build', 'altered build'),
    );
    await expect(checkPolicy(root)).rejects.toThrow('exact built');
    await buildHeaders(root);
    await writeFile(
      join(root, '_headers'),
      '/*\n  Content-Security-Policy: default-src *\n',
    );
    await expect(checkPolicy(root)).rejects.toThrow('Provider headers');
    expect(() => contentSecurityPolicy(["'unsafe-inline'"], [])).toThrow(
      'Invalid CSP',
    );
    const local = contentSecurityPolicy([], [], true);
    for (const directive of [
      "connect-src 'none'",
      "worker-src 'none'",
      "style-src-attr 'none'",
      "form-action 'none'",
    ])
      expect(local).toContain(directive);
    expect(local).not.toContain("'self'");
    expect(local).not.toContain('frame-ancestors');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('refuses hosted receiver, test, source-map, persistence and speculative-resource artifacts', async () => {
  const pem = await readFile(
    'receiver/tests/fixtures/keys/openssl-3.5-3072-public.pem',
    'utf8',
  );
  const body = pem.replace(/-----[^\n]+-----/g, '').replace(/\s/g, '');
  expect(() =>
    rejectFixtureMaterial(JSON.stringify({ key: pem }), [], [body]),
  ).toThrow('Fixture public key');
  expect(() => rejectFixtureMaterial(pem, [], [body])).toThrow(
    'Fixture public key',
  );
  expect(() =>
    rejectFixtureMaterial(
      'public release copy',
      ['synthetic-fingerprint'],
      [body],
    ),
  ).not.toThrow();
  const root = await mkdtemp(resolve('.cache/hardening-artifact-'));
  try {
    for (const [file, text] of [
      ['index.html', '<svg style="color:red"></svg>'],
      ['drawing.svg', '<svg><path onload="alert(1)" /></svg>'],
      ['index.html', '<link rel="prefetch" href="/next/">'],
      ['index.html', '<iframe src="/receive/"></iframe>'],
      ['code.js', 'fetch("/collect")'],
      ['code.js', 'navigator.sendBeacon("/collect", draft)'],
      ['code.js', 'localStorage.setItem("draft", value)'],
      ['code.js', 'crypto.subtle.decrypt("AES-GCM", key, bytes)'],
      ['code.js', '//# sourceMappingURL=code.js.map'],
      ['code.js.map', '{}'],
      ['private.pem', '-----BEGIN ENCRYPTED PRIVATE KEY-----'],
      ['.env.production', 'API_SECRET=x'],
      ['api/route.js', 'console.log("server")'],
    ] as const) {
      await mkdir(join(root, file.includes('/') ? 'api' : ''), {
        recursive: true,
      });
      await writeFile(join(root, file), text);
      await expect(checkArtifact(root, 'custom'), file).rejects.toThrow();
      await rm(join(root, file));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
