// One-time capture of reviewed, local vector geometry; never a runtime icon loader.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const names = (
  'Sun Moon MoonStar Eclipse Star Sparkles Sparkle Orbit Compass Atom Flame Droplets Wind Waves Mountain Anchor Eye Key Shield Crown Gem Feather Scale Hourglass Infinity Pyramid ' +
  'Circle CircleDot Square SquareDot Triangle Diamond Hexagon Octagon Pentagon Crosshair Target Disc Radar Aperture Focus Scan ScanEye Layers Boxes Shapes Spline Radius Component Workflow Network Fingerprint ' +
  'Globe Cpu Binary Activity Zap Cross Asterisk Hash Radio Terminal Minus Equal'
).split(' ');
const root = resolve('node_modules/@lucide/svelte');
const packageInfo = JSON.parse(
  await readFile(resolve(root, 'package.json'), 'utf8'),
);
if (packageInfo.version !== '1.51.0')
  throw Error('Review a new map version rather than silently updating S64L1.');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const glyphs = [],
  sources = [];
const exports = await readFile(resolve(root, 'dist/icons/index.js'), 'utf8');
// Waves was renamed in Lucide v1; explicitly resolve before freezing, never substitute at runtime.
const corrections = {
  Waves: 'WavesHorizontal',
  Fingerprint: 'FingerprintPattern',
};
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
for (const [index, name] of names.entries()) {
  const resolvedName = corrections[name] ?? name;
  const slug = resolvedName.replace(
    /[A-Z]/g,
    (c, i) => (i ? '-' : '') + c.toLowerCase(),
  );
  if (!exports.includes(`default as ${resolvedName} } from './${slug}.svelte'`))
    throw Error(`Missing named export: ${resolvedName}`);
  const file = `dist/icons/${slug}.svelte`;
  const source = await readFile(resolve(root, file));
  const match = source.toString('utf8').match(/const iconData = (\{[^\n]+\});/);
  if (!match) throw Error(`No fixed JSON vector data: ${name}`);
  const data = JSON.parse(match[1]);
  if (
    data.name !== slug ||
    data.size !== 24 ||
    !Array.isArray(data.node) ||
    !data.node.length
  )
    throw Error(`Unexpected icon: ${name}`);
  for (const [tag, attrs] of data.node) {
    if (!tags.has(tag) || !Object.keys(attrs).length)
      throw Error('Unexpected vector primitive.');
    for (const [key, value] of Object.entries(attrs))
      if (
        !attributes.has(key) ||
        typeof value !== 'string' ||
        !/^[0-9a-zA-Z., +\-]+$/.test(value)
      )
        throw Error('Unexpected geometry.');
  }
  glyphs.push({
    character: alphabet[index],
    name: resolvedName,
    nodes: data.node,
  });
  sources.push({
    character: alphabet[index],
    name,
    resolvedName,
    file,
    sourceSHA256: hash(source),
    vectorSHA256: hash(JSON.stringify(data.node)),
    correction: corrections[name]
      ? `${name} -> ${resolvedName}: explicit Lucide v1 name correction`
      : null,
  });
}
if (
  glyphs.length !== 64 ||
  new Set(sources.map((s) => s.vectorSHA256)).size !== 64
)
  throw Error('Map must have 64 unique vectors.');
const target = 'src/lib/symbols/s64l1-paths.ts';
const canonical = JSON.stringify(glyphs);
const manifest = {
  map: 'S64L1',
  alphabet,
  package: '@lucide/svelte',
  version: packageInfo.version,
  packageIntegrity:
    'sha512-FNoBtfrnQS1LV7yRm8T8pF6OH72BzCyPOWrOmVcpqGGLFmQZndRB4h0qhzUKqPq2JNkSfF7f4tUaiCwdY4WFfg==',
  source: 'https://github.com/lucide-icons/lucide/tree/1.51.0/packages/svelte',
  license: 'docs/licenses/lucide-1.51.0.txt',
  licenseSHA256: hash(await readFile(resolve(root, 'LICENSE'))),
  canonicalVectorsSHA256: hash(canonical),
  glyphs: sources,
};
if (process.argv.includes('--check')) {
  const stored = JSON.parse(
    await readFile('docs/glyph-map-manifest.json', 'utf8'),
  );
  if (JSON.stringify(stored) !== JSON.stringify(manifest))
    throw Error('Frozen map provenance changed.');
  const source = await readFile(target, 'utf8');
  const data = JSON.parse(
    source.slice(source.indexOf('['), source.lastIndexOf(']') + 1),
  );
  if (JSON.stringify(data) !== canonical)
    throw Error('Frozen geometry changed.');
  console.log('S64L1: all 64 named exports, vectors and provenance match.');
} else {
  try {
    await access(target);
    throw Error('Existing map is frozen; use --check.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir('src/lib/symbols', { recursive: true });
  await mkdir('docs/licenses', { recursive: true });
  await writeFile(
    target,
    '// Frozen @lucide/svelte 1.51.0 geometry. ISC/MIT notices: docs/licenses/lucide-1.51.0.txt.\nexport const frozenGlyphs = ' +
      JSON.stringify(glyphs, null, 2) +
      ' as const;\n',
    { flag: 'wx' },
  );
  await writeFile(
    'docs/glyph-map-manifest.json',
    JSON.stringify(manifest, null, 2) + '\n',
    { flag: 'wx' },
  );
  await writeFile(
    'docs/licenses/lucide-1.51.0.txt',
    await readFile(resolve(root, 'LICENSE')),
    { flag: 'wx' },
  );
  console.log(
    'Captured 64 vectors; review evidence is required before release.',
  );
}
