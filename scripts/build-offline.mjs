import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { prepareRecipient } from './prepare-recipient.mjs';
await prepareRecipient('fixture');
const compiled = await build({
  entryPoints: ['offline/entry.ts'],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  minify: true,
  target: ['chrome120', 'firefox120'],
});
const script = compiled.outputFiles[0].text.replaceAll(
  '</script',
  '<\\/script',
);
const style =
  'body{background:#10141e;color:#f0eee8;font-family:system-ui;line-height:1.6;margin:0}main{max-width:65rem;padding:2rem;margin:auto}textarea{display:block;box-sizing:border-box;width:100%;min-height:7rem;margin:.5rem 0 1rem;font:inherit}button,input{font:inherit;margin:.5rem;padding:.5rem}:focus-visible{outline:3px solid #e2c48a;outline-offset:3px}p{overflow-wrap:anywhere}';
const hash = (body) => createHash('sha256').update(body).digest('base64');
const csp = `default-src 'none'; script-src 'sha256-${hash(script)}'; script-src-attr 'none'; style-src 'sha256-${hash(style)}'; style-src-attr 'none'; img-src blob: data:; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
const shell = (await readFile('offline/shell.html', 'utf8'))
  .replace(
    '<!--CSP-->',
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
  )
  .replace('<!--STYLE-->', `<style>${style}</style>`)
  .replace('<!--SCRIPT-->', `<script>${script}</script>`);
if (/\b(?:src|href)=["'](?!blob:)/.test(shell))
  throw new Error(
    'Offline probe must not reference adjacent or external files.',
  );
const root = 'artifacts/offline probe שלום';
await mkdir(root, { recursive: true });
const filename = `${root}/zodiac-synthetic-probe.html`;
await writeFile(filename, shell);
await writeFile(
  filename + '.sha256',
  createHash('sha256').update(shell).digest('hex') +
    '  zodiac-synthetic-probe.html\n',
);
console.log(
  `Wrote fully bundled synthetic feasibility probe: ${filename}. Full-flow/review selection gate remains open.`,
);
