import { frozenGlyphs } from './s64l1-paths';
export const SYMBOL_MAP = 'S64L1';
export const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const PREVIEW_CHARACTERS = 512;
export type GlyphNode = readonly [string, Readonly<Record<string, string>>];
export type Glyph = Readonly<{
  character: string;
  name: string;
  nodes: readonly GlyphNode[];
}>;
export const GLYPHS: readonly Glyph[] = Object.freeze(
  frozenGlyphs.map((glyph) =>
    Object.freeze({
      ...glyph,
      nodes: Object.freeze(
        glyph.nodes.map(
          ([tag, attrs]) =>
            Object.freeze([tag, Object.freeze({ ...attrs })]) as GlyphNode,
        ),
      ),
    }),
  ),
);
if (
  GLYPHS.length !== 64 ||
  GLYPHS.map((g) => g.character).join('') !== BASE64URL_ALPHABET ||
  new Set(GLYPHS.map((g) => JSON.stringify(g.nodes))).size !== 64
)
  throw Error('Invalid frozen glyph map.');
export function glyphFor(character: string): Glyph {
  const index =
    character.length === 1 ? BASE64URL_ALPHABET.indexOf(character) : -1;
  const glyph = GLYPHS[index];
  if (!glyph) throw Error('Unmapped ciphertext character.');
  return glyph;
}
export function glyphSequence(raw: string): readonly Glyph[] {
  if (raw.length > 88_102) throw Error('Glyph sequence exceeds the raw limit.');
  return Object.freeze(Array.from(raw, glyphFor));
}
