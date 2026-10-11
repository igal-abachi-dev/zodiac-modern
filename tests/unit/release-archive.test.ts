import { mkdtemp, writeFile, rm, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { manifestEntries } from '../../scripts/release-manifest.mjs';

const windows = process.platform === 'win32';
const runArchive = (root: string, zip: string) =>
  spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-File',
      'scripts/New-ZodiacCandidateArchive.ps1',
      '-Stage',
      root,
      '-Destination',
      zip,
    ],
    { encoding: 'utf8', windowsHide: true, timeout: 20_000 },
  );

it.skipIf(!windows)(
  'checks actual ZIP bytes against the manifest and refuses overwrite/duplicate paths',
  async () => {
    const root = await mkdtemp(resolve('.cache/release-archive-'));
    try {
      await writeFile(join(root, 'sender.html'), 'synthetic public file');
      const manifest = {
        schema: 'ZODIAC-RELEASE-CANDIDATE-1',
        files: await manifestEntries(root),
      };
      await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
      const zip = join(root, 'candidate.zip');
      expect(runArchive(root, zip).status).toBe(0);
      expect(runArchive(root, zip).status).not.toBe(0);
      await writeFile(
        join(root, 'manifest.json'),
        JSON.stringify({
          ...manifest,
          files: [...manifest.files, ...manifest.files],
        }),
      );
      const duplicate = join(root, 'duplicate.zip');
      expect(runArchive(root, duplicate).status).not.toBe(0);
      await expect(access(duplicate)).rejects.toThrow();
      await writeFile(
        join(root, 'manifest.json'),
        JSON.stringify({
          ...manifest,
          files: [{ ...manifest.files[0], sha256: '0'.repeat(64) }],
        }),
      );
      const result = runArchive(root, join(root, 'wrong-hash.zip'));
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Archive bytes differ from manifest');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  30_000,
);

it.skipIf(!windows)(
  'dry-runs protected certificate provisioning without producing credentials or receipts',
  async () => {
    const root = await mkdtemp(resolve('.cache/signing-preflight-'));
    try {
      const destination = join(root, 'public-only');
      const result = spawnSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-File',
          'scripts/New-ZodiacSigningCertificate.ps1',
          '-PublicOutputDirectory',
          destination,
          '-WhatIf',
        ],
        { encoding: 'utf8', windowsHide: true, timeout: 20_000 },
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('What if:');
      await expect(access(destination)).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  30_000,
);
