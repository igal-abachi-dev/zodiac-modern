import { createHash } from 'node:crypto';
import { readFile, lstat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { filesAt } from './walk-files.mjs';

export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');

export function validateEntryName(name) {
  if (
    typeof name !== 'string' ||
    !/^[A-Za-z0-9_.\/-]+$/.test(name) ||
    name.startsWith('/') ||
    name.split('/').some((part) => !part || part === '.' || part === '..') ||
    name.split('/').some((part) => /[.]$/.test(part)) ||
    name
      .split('/')
      .some((part) =>
        /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part),
      )
  )
    throw Error('Unsafe release entry name.');
  return name;
}

export async function manifestEntries(root) {
  const base = resolve(root);
  if ((await lstat(base)).isSymbolicLink())
    throw Error('Release root must not be a link.');
  const entries = [];
  for (const path of await filesAt(base)) {
    const name = validateEntryName(relative(base, path).replaceAll('\\', '/'));
    if (name === 'manifest.json') continue;
    const bytes = await readFile(path);
    entries.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

export async function verifyManifest(root, manifest) {
  if (manifest.schema !== 'ZODIAC-RELEASE-CANDIDATE-1')
    throw Error('Unsupported candidate manifest.');
  if (!Array.isArray(manifest.files) || !manifest.files.length)
    throw Error('Empty manifest.');
  const actual = await manifestEntries(root);
  const actualNames = new Set(actual.map((entry) => entry.path));
  if (
    new Set(actual.map((entry) => entry.path.toLowerCase())).size !==
    actual.length
  )
    throw Error('Ambiguous release file names.');
  const names = new Set();
  for (const entry of manifest.files) {
    validateEntryName(entry.path);
    const collision = entry.path.toLowerCase();
    if (names.has(collision) || collision === 'manifest.json')
      throw Error('Duplicate or self-hashed manifest entry.');
    names.add(collision);
    if (!actualNames.has(entry.path))
      throw Error('Release file set differs from manifest.');
    if (
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0 ||
      !/^[a-f0-9]{64}$/.test(entry.sha256 ?? '')
    )
      throw Error('Invalid manifest entry.');
    const bytes = await readFile(join(root, entry.path));
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256)
      throw Error(`Release bytes changed: ${entry.path}`);
  }
  if (
    actual.length !== manifest.files.length ||
    actual.some((entry) => !names.has(entry.path.toLowerCase()))
  )
    throw Error('Release file set differs from manifest.');
  return actual;
}
