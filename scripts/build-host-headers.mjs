import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { securityHeaders } from '../config/security-policy.ts';
import { filesAt } from './walk-files.mjs';
export async function expectedHeaders(root) {
  const scripts = new Set();
  const styles = new Set();
  const hash = (body) =>
    `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
  for (const path of await filesAt(root)) {
    if (!path.endsWith('.html')) continue;
    const html = await readFile(path, 'utf8');
    for (const match of html.matchAll(
      /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
    )) {
      if (!/\bsrc\s*=/.test(match[1]) && match[2]) scripts.add(hash(match[2]));
    }
    for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
      styles.add(hash(match[1]));
  }
  return securityHeaders([...scripts].sort(), [...styles].sort());
}
export async function buildHeaders(root) {
  const headers = await expectedHeaders(root);
  await writeFile(
    join(root, '.security-headers.json'),
    JSON.stringify(headers, null, 2) + '\n',
  );
  await writeFile(
    join(root, '_headers'),
    '/*\n' +
      Object.entries(headers)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join('\n') +
      '\n',
  );
  return headers;
}
