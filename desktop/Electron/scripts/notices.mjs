import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const blocks = [
  'NeutronStar Electron resolved dependency notices. This intentionally includes development/build packages as a superset of renderer dependencies. Electron runtime LICENSE and LICENSES.chromium.html are retained alongside the packaged executable.',
];
const store = resolve(root, 'node_modules/.pnpm');
const seen = new Set();
for (const item of await readdir(store, { withFileTypes: true })) {
  if (!item.isDirectory() || item.name === 'node_modules') continue;
  const modules = join(store, item.name, 'node_modules');
  for (const child of await readdir(modules, { withFileTypes: true })) {
    if (!child.isDirectory()) continue;
    const dirs = child.name.startsWith('@')
      ? (await readdir(join(modules, child.name))).map((name) => join(modules, child.name, name))
      : [join(modules, child.name)];
    for (const dir of dirs) {
      let pkg;
      try {
        pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
      } catch {
        continue;
      }
      const id = `${pkg.name}@${pkg.version}`;
      if (seen.has(id)) continue;
      seen.add(id);
      blocks.push(`\n=== ${id} | ${JSON.stringify(pkg.license ?? 'see package metadata')} ===`);
      for (const name of await readdir(dir)) {
        if (/^(license|copying|notice|third.party.notices|ofl)([._-].*)?$/i.test(name)) {
          try {
            blocks.push(await readFile(join(dir, name), 'utf8'));
          } catch {
            /* directory, not a license text */
          }
        }
      }
    }
  }
}
await mkdir(resolve(root, '.cache'), { recursive: true });
await writeFile(resolve(root, '.cache/THIRD-PARTY-NOTICES.txt'), blocks.join('\n'));
console.log(`Recorded notices for ${seen.size} resolved packages`);
