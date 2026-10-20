import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'packages/design/generated');
await mkdir(resolve(out, 'fonts'), { recursive: true });
await mkdir(resolve(out, 'icons'), { recursive: true });
const sources = [
  ...['400', '500', '600'].map((w) => [
    'inter',
    `inter-latin-${w}-normal.woff2`,
  ]),
  ['noto-sans-hebrew', 'noto-sans-hebrew-hebrew-400-normal.woff2'],
];
for (const [font, file] of sources)
  await copyFile(
    resolve(root, `node_modules/@fontsource/${font}/files/${file}`),
    resolve(out, 'fonts', file),
  );
for (const icon of [
  'orbit',
  'lock-keyhole',
  'unlock-keyhole',
  'arrow-down-to-line',
  'arrow-up-from-line',
  'info',
  'x',
  'check',
  'shield-check',
])
  await copyFile(
    resolve(root, `node_modules/lucide-static/icons/${icon}.svg`),
    resolve(out, 'icons', `${icon}.svg`),
  );
const result = spawnSync(
  process.execPath,
  [
    resolve(root, 'node_modules/@tailwindcss/cli/dist/index.mjs'),
    '-i',
    resolve(root, 'packages/design/src/styles.css'),
    '-o',
    resolve(out, 'design.css'),
    '--minify',
  ],
  { cwd: root, stdio: 'inherit' },
);
if (result.status !== 0) process.exit(result.status || 1);
const finite = Array.from(
  { length: 101 },
  (_, i) => `.progress-fill[data-value="${i}"]{width:${i}%}`,
).join('');
await writeFile(
  resolve(out, 'design.css'),
  (await readFile(resolve(out, 'design.css'), 'utf8')) + '\n' + finite + '\n',
);
