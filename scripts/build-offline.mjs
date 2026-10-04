import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { prepareRecipient } from './prepare-recipient.mjs';
import { compile } from 'svelte/compiler';
const mode = process.argv[2] ?? 'fixture';
if (!['fixture', 'custom', 'production'].includes(mode))
  throw Error('Invalid offline build mode.');
await prepareRecipient(mode);
const styles = [];
const compiled = await build({
  entryPoints: ['offline/entry.ts'],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  minify: true,
  target: ['chrome120', 'firefox120'],
  conditions: ['browser'],
  plugins: [
    {
      name: 'inline-svelte',
      setup(builder) {
        builder.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
          const component = compile(await readFile(path, 'utf8'), {
            filename: path,
            generate: 'client',
            css: 'external',
            dev: false,
          });
          if (component.css) styles.push(component.css.code);
          return { contents: component.js.code, loader: 'js' };
        });
      },
    },
  ],
});
const script = compiled.outputFiles[0].text.replaceAll(
  '</script',
  '<\\/script',
);
const style = [
  await readFile('src/styles/tokens.css', 'utf8'),
  (await readFile('src/styles/global.css', 'utf8')).replace(
    "@import './tokens.css';",
    '',
  ),
  ...styles,
].join('\n');
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
  `Wrote fully bundled ${mode} sender prototype: ${filename} (${Buffer.byteLength(shell)} bytes). Full-flow/review selection gate remains open.`,
);
