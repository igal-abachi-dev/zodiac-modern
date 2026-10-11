import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import {
  manifestEntries,
  validateEntryName,
  verifyManifest,
} from '../../scripts/release-manifest.mjs';

it('rejects traversal, Windows alternate paths and ambiguous archive names', () => {
  for (const name of [
    '../key.pem',
    '/absolute',
    'C:/key.pem',
    'a\\b',
    'a//b',
    'a/./b',
    'a/../b',
    'a./b',
    'a:b',
    'a\0b',
  ])
    expect(() => validateEntryName(name)).toThrow('Unsafe');
  expect(validateEntryName('hosted/_astro/result.ab123.js')).toBe(
    'hosted/_astro/result.ab123.js',
  );
});

it('detects changed bytes, extra files, duplicate paths and circular manifest hashing', async () => {
  const root = await mkdtemp(resolve('.cache/release-manifest-'));
  try {
    await mkdir(join(root, 'hosted'));
    await writeFile(join(root, 'hosted/index.html'), 'public synthetic sender');
    const manifest = {
      schema: 'ZODIAC-RELEASE-CANDIDATE-1',
      files: await manifestEntries(root),
    };
    await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
    await expect(verifyManifest(root, manifest)).resolves.toHaveLength(1);
    await expect(
      verifyManifest(root, {
        ...manifest,
        files: [...manifest.files, ...manifest.files],
      }),
    ).rejects.toThrow('Duplicate');
    await expect(
      verifyManifest(root, {
        ...manifest,
        files: [{ ...manifest.files[0], path: 'manifest.json' }],
      }),
    ).rejects.toThrow('self-hashed');
    await writeFile(
      join(root, 'hosted/index.html'),
      'changed public synthetic sender',
    );
    await expect(verifyManifest(root, manifest)).rejects.toThrow(
      'bytes changed',
    );
    await writeFile(join(root, 'hosted/index.html'), 'public synthetic sender');
    await writeFile(join(root, 'unexpected.txt'), 'unlisted');
    await expect(verifyManifest(root, manifest)).rejects.toThrow('file set');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
