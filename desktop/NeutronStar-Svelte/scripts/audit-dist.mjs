import { readdir, readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const directory = resolve(root, 'dist');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const allowed = new Set(['.html', '.js', '.mjs', '.css', '.json', '.txt', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2']);
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if ((await lstat(path)).isSymbolicLink()) throw new Error(`Symlink: ${path}`);
    files.push(...(entry.isDirectory() ? await walk(path) : [path]));
  }
  return files.sort();
}
const files = [];
for (const path of await walk(directory)) {
  const bytes = await readFile(path), extension = extname(path);
  if (!allowed.has(extension) || bytes.length > 32 * 1024 * 1024) throw new Error(`Asset policy: ${path}`);
  const text = bytes.toString('utf8');
  if (extension === '.html' && /<style\b|\sstyle\s*=|\son\w+\s*=|<script(?![^>]*\bsrc=)/i.test(text)) throw new Error(`Inline executable/style HTML: ${path}`);
  if (extension === '.js' && /NeutronStar smoke:|Synthetic frontend assertion:|neutronstarWorkload|Supplemental renderer workload|neutronstarDiagnostics|neutronstar.browser-diagnostics/.test(text)) throw new Error(`Test code in production: ${path}`);
  files.push({ path: relative(directory, path).replaceAll('\\', '/'), bytes: bytes.length, sha256: hash(bytes) });
}
if (!files.some((f) => f.path === 'index.html')) throw new Error('Missing index.html');
for (const common of await walk(resolve(root, 'packages/design/generated'))) {
  const name = relative(resolve(root, 'packages/design/generated'), common);
  if (hash(await readFile(resolve(directory, name))) !== hash(await readFile(common))) throw new Error(`Common asset mismatch: ${name}`);
}
const manifest = { schema: 1, fixture: 'starlight-en-he-v2', state: 'nanostores-1.5.5', lockSha256: hash(await readFile(resolve(root, 'pnpm-lock.yaml'))), files };
await mkdir(resolve(root, '.cache'), { recursive: true });
await writeFile(resolve(root, '.cache/frontend-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Production asset audit passed: ${files.length} files. Manifest: .cache/frontend-manifest.json`);
