import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function filesAt(root) {
  const result = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const item of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const path = join(root, item.name);
    if (item.isSymbolicLink()) throw new Error('File trees must not contain symlinks.');
    if (item.isDirectory()) result.push(...await filesAt(path));
    else if (item.isFile()) result.push(path);
    else throw new Error('File trees must contain ordinary files and directories.');
  }
  return result;
}
