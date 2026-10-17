import {
  readdir,
  readFile,
  writeFile,
  realpath,
  mkdir,
} from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve(import.meta.dirname, '..');
const packages = new Map();
async function inspect(path) {
  try {
    const p = await realpath(path);
    const meta = JSON.parse(await readFile(resolve(p, 'package.json'), 'utf8'));
    const key = meta.name + '@' + meta.version;
    if (packages.has(key)) return;
    const files = (await readdir(p)).filter((n) =>
      /^(licen[cs]e|copying|notice|ofl)(\.|$)/i.test(n),
    );
    const texts = [];
    for (const f of files) {
      try {
        texts.push({ file: f, text: await readFile(resolve(p, f), 'utf8') });
      } catch {}
    }
    packages.set(key, {
      name: meta.name,
      version: meta.version,
      license: meta.license || 'See package terms',
      repository: meta.repository,
      licenseFiles: texts,
    });
  } catch {}
}
const virtual = resolve(root, 'node_modules/.pnpm');
for (const entry of await readdir(virtual, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name === 'node_modules') continue;
  const modules = resolve(virtual, entry.name, 'node_modules');
  let children;
  try {
    children = await readdir(modules, { withFileTypes: true });
  } catch {
    continue;
  }
  for (const c of children) {
    if (c.name.startsWith('@')) {
      for (const sub of await readdir(resolve(modules, c.name))) {
        await inspect(resolve(modules, c.name, sub));
      }
    } else if (c.name !== '.bin') await inspect(resolve(modules, c.name));
  }
}
const inventory = [...packages.values()].sort((a, b) =>
  (a.name + a.version).localeCompare(b.name + b.version),
);
await mkdir(resolve(root, 'licenses'), { recursive: true });
await writeFile(
  resolve(root, 'licenses/dependencies.json'),
  JSON.stringify(inventory, null, 2) + '\n',
);
let text =
  '# Third-party dependency notices\n\nGenerated from the installed exact-lockfile graph, including build/test tools and transitive dependencies. This inventory is not a legal review. Fontsource font files retain their SIL Open Font License; Lucide retains its ISC license. The application bundles a subset of this graph; build tools do not ship as browser runtimes. Full available package license/notice texts are retained in [licenses/dependencies.json](licenses/dependencies.json).\n\n| Package | Version | Declared license |\n| --- | --- | --- |\n';
for (const p of inventory)
  text += `| ${p.name} | ${p.version} | ${typeof p.license === 'string' ? p.license : JSON.stringify(p.license)} |\n`;
await writeFile(resolve(root, 'THIRD-PARTY-NOTICES.md'), text);
console.log(`Recorded ${inventory.length} installed package notices.`);
