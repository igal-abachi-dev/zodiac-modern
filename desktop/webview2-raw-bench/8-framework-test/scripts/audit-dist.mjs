import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const hash = (b) => createHash('sha256').update(b).digest('hex');
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)],
      ),
    )
  ).flat();
}
const css = await readFile(
  resolve(root, 'packages/design/generated/design.css'),
);
const lock = await readFile(resolve(root, 'pnpm-lock.yaml'));
const baseline = JSON.parse(
  await readFile(resolve(root, 'dependency-baseline.json')),
);
const runner = resolve(
  root,
  '../NeutronStar-Host/out/clang-cl-ninja-x64/Release/neutronstar_host_runner.exe',
);
let revision = 'unavailable';
try {
  revision = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
} catch {}
await mkdir(resolve(root, '.cache/manifests'), { recursive: true });
const commonDir=resolve(root,'packages/design/generated');
const commonFiles=await walk(commonDir);
const sharedSources=(await Promise.all(['bench-domain','bench-contract','design'].map(p=>walk(resolve(root,`packages/${p}/src`))))).flat();
for (const app of [
  'vanilla',
  'svelte',
  'react',
  'vue',
  'solid',
  'lit',
  'preact',
  'alpine',
  'htmx',
]) {
  const dir = resolve(root, `apps/${app}/dist`);
  const files = await walk(dir);
  const assets = [];
  for (const file of files) {
    const bytes = await readFile(file);
    if (
      ![
        '.html',
        '.js',
        '.mjs',
        '.css',
        '.json',
        '.txt',
        '.svg',
        '.png',
        '.jpg',
        '.jpeg',
        '.webp',
        '.ico',
        '.woff',
        '.woff2',
      ].includes(extname(file))
    )
      throw new Error('Unsupported file ' + file);
    if (bytes.length > 32 * 1024 * 1024) throw new Error('Oversize asset');
    const text = bytes.toString();
    if (
      extname(file) === '.html' &&
      /<style\b|\sstyle\s*=|\son\w+\s*=|<script(?![^>]*\bsrc=)/i.test(text)
    )
      throw new Error('Inline HTML script/style/handler ' + file);
    if (
      extname(file) === '.js' &&
      /NeutronStar smoke:|Synthetic frontend assertion:|neutronstarWorkload|Supplemental renderer workload|neutronstarDiagnostics|neutronstar.browser-diagnostics/.test(text)
    )
      throw new Error('Test code leaked into production');
    assets.push({
      path: relative(dir, file).replaceAll('\\', '/'),
      bytes: bytes.length,
      sha256: hash(bytes),
    });
  }
  if (hash(await readFile(resolve(dir, 'design.css'))) !== hash(css))
    throw new Error('Shared CSS mismatch');
  for(const common of commonFiles){const name=relative(commonDir,common);if(hash(await readFile(resolve(dir,name)))!==hash(await readFile(common)))throw new Error('Common asset mismatch: '+app+'/'+name);}
  const sourceFiles=[...sharedSources,...await walk(resolve(root,`apps/${app}/src`))];
  const sourceHashes=await Promise.all(sourceFiles.map(async file=>({path:relative(root,file).replaceAll('\\','/'),sha256:hash(await readFile(file))})));
  const pkg = JSON.parse(
    await readFile(resolve(root, `apps/${app}/package.json`)),
  );
  const manifest = {
    app,
    scenario: 'controlled-renderer-shared-state',
    revision,
    sources: sourceHashes,
    worktree: 'source hashes below; commit may have uncommitted changes',
    host_sha256: hash(await readFile(runner)),
    host_policy: { decorations: true, memory_target: 'normal', bridge: false },
    runtime: 'record actual runtime from each host report',
    profile:
      'per-variant isolated; fresh for correctness; retained/fresh separated for measurements',
    node: process.version,
    tooling: baseline,
    dependencies: pkg.dependencies,
    dependency_patches: app === 'htmx' ? [{
      package: 'htmx.org@2.0.11', path: 'patches/htmx.org@2.0.11.patch',
      sha256: hash(await readFile(resolve(root, 'patches/htmx.org@2.0.11.patch'))),
    }] : [],
    lock_sha256: hash(lock),
    css_sha256: hash(css),
    total_asset_bytes: assets.reduce((s, a) => s + a.bytes, 0),
    javascript_bytes: assets
      .filter((a) => a.path.endsWith('.js'))
      .reduce((s, a) => s + a.bytes, 0),
    assets,
    performance: 'not measured',
  };
  await writeFile(
    resolve(root, `.cache/manifests/${app}.json`),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log(
    `${app}: ${manifest.javascript_bytes} JS bytes; ${manifest.total_asset_bytes} total asset bytes`,
  );
}
