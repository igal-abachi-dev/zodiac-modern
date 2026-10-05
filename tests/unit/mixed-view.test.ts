import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  BASE64URL_ALPHABET,
  GLYPHS,
  glyphFor,
} from '../../src/lib/symbols/manifest';
import {
  MIXED_VIEW_GLYPHS,
  NULL_GLYPHS,
  mixedViewTokens,
} from '../../src/lib/symbols/mixed-view';
it('keeps payload characters distinct from reserved nulls and retains the original frozen alphabet', () => {
  const tokens = mixedViewTokens(BASE64URL_ALPHABET);
  const payload = tokens.filter((t) => t.kind !== 'null');
  expect(payload.map((t) => t.character).join('')).toBe(BASE64URL_ALPHABET);
  expect(payload.map((t) => t.kind)).toEqual(
    Array.from({ length: 64 }, (_, i) => (i % 4 === 0 ? 'literal' : 'glyph')),
  );
  expect(
    tokens
      .filter((t) => t.kind === 'null')
      .map((t) => [t.afterOffset, t.glyph.name]),
  ).toEqual([
    [7, 'CircleOff'],
    [15, 'Crosshair'],
    [23, 'Skull'],
    [31, 'CircleOff'],
    [39, 'Crosshair'],
    [47, 'Skull'],
    [55, 'CircleOff'],
    [63, 'Crosshair'],
  ]);
  expect(payload[24]).toMatchObject({
    character: 'Y',
    kind: 'literal',
    orientation: 'mirrored',
  });
  expect(payload[52]).toMatchObject({
    character: '0',
    kind: 'literal',
    orientation: 'rotated',
  });
  expect(
    payload.filter((t) => t.kind === 'literal' && t.orientation === 'normal'),
  ).toHaveLength(14);
  expect(payload[35]).toMatchObject({
    character: 'j',
    glyph: { name: 'CircleDashed' },
  });
  expect(glyphFor('j').name).toBe('Crosshair');
  expect(GLYPHS.map((g) => g.character).join('')).toBe(BASE64URL_ALPHABET);
  expect(
    new Set(MIXED_VIEW_GLYPHS.map((g) => JSON.stringify(g.nodes))).size,
  ).toBe(64);
  expect(
    MIXED_VIEW_GLYPHS.some((g) =>
      NULL_GLYPHS.some(
        (n) => JSON.stringify(g.nodes) === JSON.stringify(n.nodes),
      ),
    ),
  ).toBe(false);
  expect(
    tokens
      .filter((t) => t.kind === 'null')
      .every((t) => !('character' in t) && !('offset' in t)),
  ).toBe(true);
  expect(Object.isFrozen(NULL_GLYPHS[0]!.nodes[0]![1])).toBe(true);
  const checked = spawnSync(
    process.execPath,
    ['scripts/freeze-mixed-view.mjs', '--check'],
    { encoding: 'utf8', windowsHide: true },
  );
  expect(checked.status, checked.stderr).toBe(0);
});
it('continues rotation, orientations and exact raw order across every preview at maximum size', () => {
  const raw = BASE64URL_ALPHABET.repeat(Math.ceil(88102 / 64)).slice(0, 88102);
  let assembled = '',
    nullCount = 0,
    literalCount = 0,
    alteredCount = 0;
  for (let offset = 0; offset < raw.length; offset += 512) {
    const tokens = mixedViewTokens(raw.slice(offset, offset + 512), offset);
    expect(tokens.length).toBeLessThanOrEqual(576);
    for (const token of tokens) {
      if (token.kind === 'null') {
        expect(token.afterOffset % 8).toBe(7);
        expect(token.glyph.name).toBe(
          ['CircleOff', 'Crosshair', 'Skull'][nullCount % 3],
        );
        nullCount++;
      } else {
        expect(token.offset).toBe(assembled.length);
        assembled += token.character;
        if (token.kind === 'literal') {
          literalCount++;
          if (token.orientation !== 'normal') alteredCount++;
        }
      }
    }
  }
  expect(assembled).toBe(raw);
  expect(nullCount).toBe(Math.floor(raw.length / 8));
  expect(literalCount).toBe(Math.ceil(raw.length / 4));
  expect(alteredCount).toBe(Math.floor(literalCount / 7));
  expect(mixedViewTokens(raw.slice(512, 520), 512).at(-1)).toMatchObject({
    kind: 'null',
    afterOffset: 519,
    glyph: { name: 'Crosshair' },
  });
  expect(
    mixedViewTokens(raw.slice(-6), 88096).filter((t) => t.kind === 'null'),
  ).toHaveLength(0);
});
it('rejects invalid payloads even in literal slots and bounds preview positions', () => {
  for (const raw of ['=', '?', '\n', '\ud800', 'A A', 'A'.repeat(513)])
    expect(() => mixedViewTokens(raw)).toThrow();
  for (const offset of [-1, 0.5, NaN, Infinity, 88103])
    expect(() => mixedViewTokens('A', offset)).toThrow();
  expect(() => mixedViewTokens('AA', 88101)).toThrow();
  expect(mixedViewTokens('A', 88101)).toHaveLength(1);
  expect(mixedViewTokens('A'.repeat(7))).toHaveLength(7);
  expect(mixedViewTokens('A'.repeat(8))).toHaveLength(9);
});
