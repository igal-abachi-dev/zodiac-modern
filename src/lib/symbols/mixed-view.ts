// S64M1 is visual presentation only. It never changes raw ciphertext or checks.
import { MAX_RAW_CHARS } from '../crypto/profile';
import {
  GLYPHS,
  PREVIEW_CHARACTERS,
  glyphFor,
  type Glyph,
  type GlyphNode,
} from './manifest';
import { mixedViewVectors } from './s64m1-paths';
export const MIXED_VIEW_PROFILE = 'S64M1';
type Vector = Readonly<{ name: string; nodes: readonly GlyphNode[] }>;
const vectors: readonly Vector[] = Object.freeze(
  mixedViewVectors.map((v) =>
    Object.freeze({
      name: v.name,
      nodes: Object.freeze(
        v.nodes.map(
          ([tag, attrs]) =>
            Object.freeze([tag, Object.freeze({ ...attrs })]) as GlyphNode,
        ),
      ),
    }),
  ),
);
export const NULL_GLYPHS = Object.freeze(vectors.slice(0, 3));
export const MIXED_VIEW_GLYPHS: readonly Glyph[] = Object.freeze(
  GLYPHS.map((g) =>
    g.character === 'j' ? Object.freeze({ ...g, ...vectors[3]! }) : g,
  ),
);
if (
  NULL_GLYPHS.map((g) => g.name).join(',') !== 'CircleOff,Crosshair,Skull' ||
  MIXED_VIEW_GLYPHS[35]!.name !== 'CircleDashed' ||
  new Set(MIXED_VIEW_GLYPHS.map((g) => JSON.stringify(g.nodes))).size !== 64 ||
  MIXED_VIEW_GLYPHS.some((g) =>
    NULL_GLYPHS.some(
      (n) => JSON.stringify(g.nodes) === JSON.stringify(n.nodes),
    ),
  )
)
  throw Error('Invalid mixed-view null reservation.');
export type MixedViewToken =
  | Readonly<{ kind: 'glyph'; character: string; offset: number; glyph: Glyph }>
  | Readonly<{
      kind: 'literal';
      character: string;
      offset: number;
      orientation: 'normal' | 'mirrored' | 'rotated';
    }>
  | Readonly<{ kind: 'null'; afterOffset: number; glyph: Vector }>;
export function mixedViewTokens(
  raw: string,
  startOffset = 0,
): readonly MixedViewToken[] {
  if (
    !Number.isSafeInteger(startOffset) ||
    startOffset < 0 ||
    raw.length > PREVIEW_CHARACTERS ||
    startOffset + raw.length > MAX_RAW_CHARS
  )
    throw Error('Mixed preview exceeds the payload bounds.');
  const tokens: MixedViewToken[] = [];
  for (let index = 0; index < raw.length; index++) {
    const character = raw[index]!;
    const base = glyphFor(character); // Reject every unmapped character, including literal slots.
    const offset = startOffset + index;
    tokens.push(
      Object.freeze(
        offset % 4 === 0
          ? {
              kind: 'literal',
              character,
              offset,
              orientation:
                offset % 56 === 24
                  ? 'mirrored'
                  : offset % 56 === 52
                    ? 'rotated'
                    : 'normal',
            }
          : {
              kind: 'glyph',
              character,
              offset,
              glyph: MIXED_VIEW_GLYPHS[GLYPHS.indexOf(base)]!,
            },
      ),
    );
    if ((offset + 1) % 8 === 0)
      tokens.push(
        Object.freeze({
          kind: 'null',
          afterOffset: offset,
          glyph: NULL_GLYPHS[(Math.floor((offset + 1) / 8) - 1) % 3]!,
        }),
      );
  }
  return Object.freeze(tokens);
}
