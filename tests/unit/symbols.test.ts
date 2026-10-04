import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  GLYPHS,
  BASE64URL_ALPHABET,
  glyphFor,
  glyphSequence,
} from '../../src/lib/symbols/manifest';
it('pins all 64 distinct vector entries, source hashes, names and license provenance', () => {
  expect(GLYPHS.map((g) => g.character).join('')).toBe(BASE64URL_ALPHABET);
  expect(new Set(GLYPHS.map((g) => JSON.stringify(g.nodes))).size).toBe(64);
  expect(glyphSequence(BASE64URL_ALPHABET).map((g) => g.name)).toEqual(
    GLYPHS.map((g) => g.name),
  );
  const checked = spawnSync(
    process.execPath,
    ['scripts/freeze-glyphs.mjs', '--check'],
    { encoding: 'utf8', windowsHide: true },
  );
  expect(checked.status, checked.stderr).toBe(0);
  expect(checked.stdout).toContain('all 64 named exports');
  expect(Object.isFrozen(GLYPHS[0]!.nodes[0]![1])).toBe(true);
  for (const char of ['', 'AA', '=', '?', '\n', '🌙'])
    expect(() => glyphFor(char)).toThrow('Unmapped');
  expect(() => glyphSequence('A'.repeat(88103))).toThrow();
});
