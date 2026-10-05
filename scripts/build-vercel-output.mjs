import { cp, mkdir, mkdtemp, readFile, rename, rm, realpath, lstat } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { checkPolicy } from './check-policy.mjs';
import { filesAt } from './walk-files.mjs';
import { writeFile } from 'node:fs/promises';

export async function buildVercelOutput(root, destination = '.vercel/output') {
  const headers = await checkPolicy(root);
  const target = resolve(destination),
    workspace = resolve('.');
  const rel = relative(workspace, target);
  // Replacement is only for generated output inside this workspace.
  if (
    !rel ||
    rel === '..' ||
    rel.startsWith(`..${sep}`) ||
    rel.includes(':') ||
    target !== resolve('.vercel/output')
  )
    throw Error('Unsafe generated Vercel output path.');
  await mkdir(resolve('.vercel'), { recursive: true });
  if ((await realpath('.vercel')).toLowerCase() !== resolve('.vercel').toLowerCase())
    throw Error('Vercel output parent must be an ordinary workspace directory.');
  const current = await lstat(target).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (current?.isSymbolicLink())
    throw Error('Vercel output must not be a link or junction.');
  const staging = await mkdtemp(resolve('.vercel/output-staging-'));
  try {
    await cp(root, join(staging, 'static'), {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
    // Internal build metadata belongs outside hosted files, including on Vercel.
    for (const name of ['.security-headers.json', '_headers'])
      await rm(join(staging, 'static', name));
    const files = await filesAt(join(staging, 'static'));
    const overrides = {};
    for (const file of files) {
      const path = relative(join(staging, 'static'), file).replaceAll(
        '\\',
        '/',
      );
      if (path === 'index.html') overrides[path] = { path: '' };
      else if (path.endsWith('/index.html'))
        overrides[path] = { path: path.slice(0, -11) + '/' };
    }
    await writeFile(
      join(staging, 'config.json'),
      JSON.stringify(
        {
          version: 3,
          routes: [
            { src: '/(.*)', headers, continue: true },
            { handle: 'filesystem' },
          ],
          overrides,
        },
        null,
        2,
      ) + '\n',
    );
    // Both target and disposable staging are fixed, checked generated paths.
    await rm(target, { recursive: true, force: true });
    await rename(staging, target);
    const config = JSON.parse(
      await readFile(join(target, 'config.json'), 'utf8'),
    );
    if (JSON.stringify(config.routes[0].headers) !== JSON.stringify(headers))
      throw Error('Vercel policy serialization failed.');
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
