import { readdir, readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { mime } from '../native/policy.mjs';
const root = resolve(import.meta.dirname, '..'),
  dist = resolve(root, 'dist'),
  files = [];
async function walk(dir) {
  for (const name of await readdir(dir)) {
    const path = resolve(dir, name),
      stat = await lstat(path);
    if (stat.isSymbolicLink()) throw Error('Linked asset');
    if (stat.isDirectory()) {
      await walk(path);
      continue;
    }
    const bytes = await readFile(path),
      ext = extname(path);
    if (!(ext in mime) || bytes.length > 32 * 1024 * 1024) throw Error('Unsupported asset');
    if (
      ext === '.html' &&
      /<style\b|\sstyle\s*=|\son\w+\s*=|<script(?![^>]*\bsrc=)/i.test(bytes.toString())
    )
      throw Error('Inline HTML');
    files.push({
      path: relative(dist, path).replaceAll('\\', '/'),
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
}
await walk(dist);
if (!files.some((f) => f.path === 'index.html')) throw Error('Missing entry');
await mkdir(resolve(root, '.cache'), { recursive: true });
await writeFile(resolve(root, '.cache/assets.json'), JSON.stringify({ schema: 1, files }, null, 2));
console.log(`Audited ${files.length} production assets`);
