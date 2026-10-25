import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
for (const dir of ['public/fonts', 'public/icons'])
  await mkdir(resolve(root, dir), { recursive: true });
for (const weight of [400, 500, 600])
  await copyFile(
    resolve(root, `node_modules/@fontsource/inter/files/inter-latin-${weight}-normal.woff2`),
    resolve(root, `public/fonts/inter-latin-${weight}-normal.woff2`),
  );
await copyFile(
  resolve(
    root,
    'node_modules/@fontsource/noto-sans-hebrew/files/noto-sans-hebrew-hebrew-400-normal.woff2',
  ),
  resolve(root, 'public/fonts/noto-sans-hebrew-hebrew-400-normal.woff2'),
);
for (const icon of [
  'orbit',
  'info',
  'shield-check',
  'lock-keyhole',
  'unlock-keyhole',
  'arrow-down-to-line',
  'arrow-up-from-line',
])
  await copyFile(
    resolve(root, `node_modules/lucide-static/icons/${icon}.svg`),
    resolve(root, `public/icons/${icon}.svg`),
  );
const result = spawnSync(
  process.execPath,
  [
    resolve(root, 'node_modules/@tailwindcss/cli/dist/index.mjs'),
    '-i',
    'src/design.css',
    '-o',
    'public/design.css',
    '--minify',
  ],
  { cwd: root, stdio: 'inherit' },
);
if (result.status !== 0) process.exit(result.status ?? 1);
await writeFile(
  resolve(root, 'public/design.css'),
  (await readFile(resolve(root, 'public/design.css'), 'utf8')) +
    '\n' +
    Array.from({ length: 101 }, (_, i) => `.progress-fill[data-value="${i}"]{width:${i}%}`).join(
      '',
    ),
);
