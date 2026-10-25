import { packager } from '@electron/packager';
import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses';
import { mkdir, cp, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve(import.meta.dirname, '..'),
  stage = resolve(root, '.cache/package-input');
// Remove only our fixed, generated staging tree, never a caller-provided path.
if (stage !== resolve(root, '.cache', 'package-input')) throw Error('Invalid staging path');
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
await cp(resolve(root, 'native'), resolve(stage, 'native'), { recursive: true });
await cp(resolve(root, 'notices'), resolve(stage, 'notices'), { recursive: true });
await copyFile(
  resolve(root, '.cache/THIRD-PARTY-NOTICES.txt'),
  resolve(stage, 'notices/THIRD-PARTY-NOTICES.txt'),
);
await cp(resolve(root, 'dist'), resolve(stage, 'renderer'), { recursive: true });
await copyFile(resolve(root, '.cache/assets.json'), resolve(stage, 'assets.json'));
await writeFile(
  resolve(stage, 'package.json'),
  JSON.stringify({
    name: 'neutronstar-electron',
    version: '0.1.0',
    type: 'module',
    main: 'native/main.mjs',
    description: 'NeutronStar GUI benchmark',
    author: 'Zodiac Modern contributors',
  }),
);
const outputs = await packager({
  dir: stage,
  out: resolve(root, 'out'),
  name: 'NeutronStar-Electron',
  platform: 'win32',
  arch: 'x64',
  electronVersion: '45.0.0',
  asar: true,
  overwrite: true,
  prune: false,
  executableName: 'NeutronStar-Electron',
});
const executable = resolve(outputs[0], 'NeutronStar-Electron.exe');
await flipFuses(executable, {
  version: FuseVersion.V1,
  [FuseV1Options.RunAsNode]: false,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  [FuseV1Options.EnableNodeCliInspectArguments]: false,
  [FuseV1Options.OnlyLoadAppFromAsar]: true,
});
await writeFile(
  resolve(root, '.cache/build-receipt.json'),
  JSON.stringify(
    {
      schema: 1,
      electron: '45.0.0',
      sha256: createHash('sha256')
        .update(await readFile(executable))
        .digest('hex'),
      asarSha256: createHash('sha256')
        .update(await readFile(resolve(outputs[0], 'resources/app.asar')))
        .digest('hex'),
      comparison: 'Not run',
    },
    null,
    2,
  ),
);
console.log(executable);
