import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { filesAt } from './walk-files.mjs';

export async function checkArtifact(root = 'dist', mode = 'production') {
  const files = await filesAt(root);
  for (const path of files) {
    if (
      /\.(?:go|zip|exe|dll|pk8|key|der|map|env)$/i.test(path) ||
      /(?:receiver|fixtures|node_modules|functions|api|_worker|_server)[\\/]/i.test(
        path,
      ) ||
      /(?:^|[\\/])(?:\.env(?:\.[^\\/]*)?|_worker\.js)$/i.test(path)
    )
      throw new Error(`Forbidden hosted artifact: ${path}`);
    const bytes = await readFile(path);
    if (bytes.includes(Buffer.from('PRIVATE KEY-----')))
      throw new Error('Private key material found in hosted output.');
    if (/\.(?:html|js|css|svg|pem)$/.test(path)) {
      const text = bytes.toString('utf8');
      // Inspect markup, not property assignments in generated script bodies.
      const markup = text
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
      if (
        /\.(?:html|svg)$/.test(path) &&
        /<[^>]*\s(?:style|on[a-z]+)\s*=/i.test(markup)
      )
        throw new Error('Inline style or event handler found.');
      if (
        /<(?:iframe|object|embed|foreignObject)\b/i.test(markup) ||
        /<link\b[^>]*\brel\s*=\s*["'](?:prefetch|preconnect|dns-prefetch)/i.test(
          markup,
        )
      )
        throw new Error(
          'Unapproved embedded content or speculative network integration.',
        );
      if (
        /\b(?:fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon\s*\(|localStorage|sessionStorage|indexedDB|caches\.open|serviceWorker\.register|new\s+(?:Shared)?Worker\s*\()/i.test(
          text,
        ) &&
        /\.(?:js|html)$/.test(path)
      )
        throw new Error(
          'Unapproved network or persistence API in hosted artifact.',
        );
      if (
        /\.subtle\.decrypt\s*\(|\b(?:privateDER|ParsePKCS8PrivateKey|ZODIAC_TEST_|ZODIAC_OPENSSL|sourceMappingURL)\b/.test(
          text,
        ) ||
        /(?:process\.env|import\.meta\.env)[^;\n]*(?:PRIVATE_KEY|PASSPHRASE|SECRET)/.test(
          text,
        )
      )
        throw new Error(
          'Receiver, test, secret environment or source-map code found.',
        );
      if (
        /<[^>]*\s(?:style|on[a-z]+)\s*=/i.test(markup) &&
        path.endsWith('.html')
      )
        throw new Error('Inline style or event handler found.');
      if (
        /<[^>]*\s(?:src|srcset|poster)\s*=\s*["'][^"']*(?:https?:)?\/\//i.test(
          text,
        ) ||
        /<(?!a\b)[^>]*\s(?:href|xlink:href)\s*=\s*["'](?:https?:)?\/\//i.test(
          markup,
        ) ||
        /(?:@import\s+|url\(\s*["']?)(?:[^;]*?)https?:/i.test(text)
      )
        throw new Error('Remote runtime resource found.');
    }
  }
  if (mode === 'production') {
    const generated = await readFile(
      'src/generated/default-recipient.ts',
      'utf8',
    );
    if (
      generated.includes('"source":"fixture"') ||
      generated.includes('= null')
    )
      throw new Error('Production recipient required.');
    const manifest = JSON.parse(
      await readFile('receiver/tests/fixtures/manifest.json', 'utf8'),
    );
    for (const fixture of manifest.fixtures) {
      for (const path of files.filter((p) => /\.(html|js|pem)$/.test(p))) {
        if ((await readFile(path, 'utf8')).includes(fixture.fingerprint))
          throw new Error('Fixture fingerprint leaked into production.');
      }
    }
  }
  console.log(`Artifact checked: ${files.length} static files, mode ${mode}.`);
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
)
  await checkArtifact();
