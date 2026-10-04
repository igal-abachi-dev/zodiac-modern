import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { filesAt } from './walk-files.mjs';

export async function checkArtifact(root = 'dist', mode = 'production') {
  const files = await filesAt(root);
  for (const path of files) {
    if (
      /\.(?:go|zip|exe|dll|pk8|key|der)$/i.test(path) ||
      /(?:receiver|fixtures|node_modules|functions)[\\/]/.test(path)
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
