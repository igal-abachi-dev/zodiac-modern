// Capture additional local vectors without changing the frozen S64L1 alphabet.
import { createHash } from 'node:crypto';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve('node_modules/@lucide/svelte');
const packageInfo = JSON.parse(
  await readFile(resolve(root, 'package.json'), 'utf8'),
);
if (packageInfo.version !== '1.51.0')
  throw Error('Review new mixed-view geometry explicitly.');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const index = await readFile(resolve(root, 'dist/icons/index.js'), 'utf8');
const vectors = [],
  provenance = [];
const tags = new Set([
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon',
]);
const attributes = new Set([
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'width',
  'height',
  'x1',
  'x2',
  'y1',
  'y2',
  'points',
]);
for (const name of ['CircleOff', 'Crosshair', 'Skull', 'CircleDashed']) {
  const slug = name.replace(
    /[A-Z]/g,
    (c, i) => (i ? '-' : '') + c.toLowerCase(),
  );
  if (!index.includes(`default as ${name} } from './${slug}.svelte'`))
    throw Error(`Missing named export: ${name}`);
  const file = `dist/icons/${slug}.svelte`;
  const source = await readFile(resolve(root, file));
  const match = source.toString('utf8').match(/const iconData = (\{[^\n]+\});/);
  if (!match) throw Error('Missing fixed vector JSON.');
  const data = JSON.parse(match[1]);
  if (
    data.name !== slug ||
    data.size !== 24 ||
    !Array.isArray(data.node) ||
    !data.node.length
  )
    throw Error('Unexpected vector.');
  for (const [tag, attrs] of data.node) {
    if (!tags.has(tag) || !Object.keys(attrs).length)
      throw Error('Unexpected primitive.');
    for (const [key, value] of Object.entries(attrs))
      if (
        !attributes.has(key) ||
        typeof value !== 'string' ||
        !/^[0-9a-zA-Z., +\-]+$/.test(value)
      )
        throw Error('Unexpected geometry.');
  }
  vectors.push({ name, nodes: data.node });
  provenance.push({
    name,
    file,
    sourceSHA256: hash(source),
    vectorSHA256: hash(JSON.stringify(data.node)),
  });
}
if (new Set(provenance.map((v) => v.vectorSHA256)).size !== 4)
  throw Error('Duplicate additional vectors.');
const manifest = {
  presentation: 'S64M1',
  baseMap: 'S64L1',
  package: '@lucide/svelte',
  version: packageInfo.version,
  packageIntegrity:
    'sha512-FNoBtfrnQS1LV7yRm8T8pF6OH72BzCyPOWrOmVcpqGGLFmQZndRB4h0qhzUKqPq2JNkSfF7f4tUaiCwdY4WFfg==',
  source: 'https://github.com/lucide-icons/lucide/tree/1.51.0/packages/svelte',
  license: 'docs/licenses/lucide-1.51.0.txt',
  licenseSHA256: hash(await readFile(resolve(root, 'LICENSE'))),
  literal: { zeroBasedOffsetModulo: 4, equals: 0 },
  mirror: { zeroBasedOffsetModulo: 56, equals: 24 },
  rotate: { zeroBasedOffsetModulo: 56, equals: 52, degrees: 180 },
  nulls: {
    afterPayloadCharacters: 8,
    rotation: ['CircleOff', 'CircleDashed', 'Skull'],
    incompleteGroup: 'no null',
  },
  viewOverrides: {},
  canonicalVectorsSHA256: hash(JSON.stringify(vectors)),
  vectors: provenance,
};
const target = 'src/lib/symbols/s64m1-paths.ts';
const manifestPath = 'docs/mixed-view-manifest.json';
if (process.argv.includes('--check')) {
  const stored = JSON.parse(await readFile(manifestPath, 'utf8'));
  const { mixedViewVectors } = await import(
    pathToFileURL(resolve(target)).href
  );
  if (
    JSON.stringify(stored) !== JSON.stringify(manifest) ||
    JSON.stringify(mixedViewVectors) !== JSON.stringify(vectors)
  )
    throw Error('Frozen mixed-view geometry/provenance changed.');
  if (
    hash(await readFile(manifest.license)) !== manifest.licenseSHA256 ||
    hash(await readFile('public/licenses/lucide-1.51.0.txt')) !==
      manifest.licenseSHA256
  )
    throw Error('Missing exact delivered license.');
  console.log(
    'S64M1: all 4 additional named exports, vectors and provenance match.',
  );
} else {
  for (const file of [target, manifestPath]) {
    try {
      await access(file);
      throw Error('Existing mixed view is frozen; use --check.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await writeFile(
    target,
    '// Frozen @lucide/svelte 1.51.0 view-only geometry. ISC/MIT: docs/licenses/lucide-1.51.0.txt.\nexport const mixedViewVectors = ' +
      JSON.stringify(vectors, null, 2) +
      ' as const;\n',
    { flag: 'wx' },
  );
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', {
    flag: 'wx',
  });
  console.log('Captured four S64M1 vectors; S64L1 unchanged.');
}
