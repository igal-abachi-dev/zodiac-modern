import {
  BASE64URL_ALPHABET,
  GLYPHS,
  glyphFor,
  type GlyphNode,
} from '../symbols/manifest';
import { MIXED_VIEW_GLYPHS, NULL_GLYPHS } from '../symbols/mixed-view';
import { glyphLicense } from '../symbols/license';
import {
  CELL,
  compactLayout,
  mixedSequence,
  metadata,
  type ExportBundle,
} from './layout';
import { integer } from './checks';

export const TRANSPORT = 'S64SVG1';
export const exportLicense = glyphLicense.replace(
  /The following Lucide icons[\s\S]*?(?=The MIT License)/,
  'Some vectors derive from Feather; its MIT notice follows.\n\n',
);
export function escapeXML(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]!,
  );
}
function nodes(items: readonly GlyphNode[]): string {
  return items
    .map(
      ([tag, attributes]) =>
        `<${tag}${Object.entries(attributes)
          .map(([key, value]) => ` ${key}="${escapeXML(value)}"`)
          .join('')}/>`,
    )
    .join('');
}
function definitions(mixed = false): string {
  const glyphs = mixed ? [...MIXED_VIEW_GLYPHS, ...NULL_GLYPHS] : GLYPHS;
  return `<defs>${glyphs.map((g, i) => `<symbol id="${mixed ? 's64m1' : 's64l1'}-${String(i).padStart(2, '0')}" viewBox="0 0 24 24" fill="none" stroke="#202938" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${nodes(g.nodes)}</symbol>`).join('')}</defs>`;
}
function root(
  width: number,
  height: number,
  data: object,
  content: string,
  mixed = false,
): string {
  const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>Zodiac Modern ciphertext artwork</title><metadata id="zodiac-metadata">${escapeXML(JSON.stringify({ ...data, attribution: '@lucide/svelte 1.51.0; frozen local vectors', license: glyphLicense }))}</metadata>${definitions(mixed)}${content}</svg>`;
  if (new TextEncoder().encode(text).length > 16 * 1024 * 1024)
    throw Error('SVG exceeds its file limit.');
  return text;
}
function text(x: number, y: number, value: string, size = 12): string {
  return `<text x="${x}" y="${y}" font-family="monospace" font-size="${size}" fill="#202938">${escapeXML(value)}</text>`;
}
function use(character: string, offset: number, x: number, y: number): string {
  glyphFor(character);
  return `<use href="#s64l1-${String(BASE64URL_ALPHABET.indexOf(character)).padStart(2, '0')}" x="${x}" y="${y}" width="24" height="24" data-offset="${offset}"/>`;
}
export function oneLineSVG(bundle: ExportBundle): string {
  return root(
    bundle.raw.length * CELL,
    CELL,
    { ...metadata(bundle), layout: 'strip', cellWidth: CELL },
    Array.from(bundle.raw, (c, i) => use(c, i, i * CELL, 0)).join(''),
  );
}
export function pageSVG(
  bundle: ExportBundle,
  pageIndex: number,
  partial = true,
): string {
  integer(pageIndex, bundle.pages.length - 1);
  const page = bundle.pages[pageIndex]!;
  const content =
    `<rect width="680" height="944" fill="#fff"/>` +
    text(
      0,
      20,
      `${partial ? 'PARTIAL - ' : ''}Zodiac Modern - page ${pageIndex + 1} of ${bundle.pages.length}`,
      16,
    ) +
    text(0, 40, `${bundle.context.profile} | RSA-${bundle.rsaBits}`, 11) +
    text(0, 56, `Recipient: ${bundle.context.recipientFingerprint}`, 11) +
    text(0, 72, `Envelope:  ${bundle.context.envelopeSHA256}`, 11) +
    text(
      0,
      88,
      `S64CHECK1 page check: ${page.digest.slice(0, 12)} | raw total ${bundle.raw.length}`,
      12,
    ) +
    text(
      0,
      104,
      `S64L1 | characters ${page.startOffset + 1}-${page.startOffset + page.raw.length} | row raw / check`,
      11,
    ) +
    page.rows
      .map(
        (row) =>
          Array.from(row.raw, (c, i) =>
            use(c, row.startOffset + i, i * CELL, 120 + row.rowIndex * CELL),
          ).join('') +
          text(
            400,
            136 + row.rowIndex * CELL,
            `${String(row.rowIndex + 1).padStart(2, '0')} ${row.raw.padEnd(16, ' ')} ${row.checkCode}`,
            12.7,
          ),
      )
      .join('') +
    text(
      0,
      908,
      'Recover using all raw rows in order. Checks are public, not authentication.',
      11,
    ) +
    text(
      0,
      924,
      'Attach ciphertext.txt too. The receiver cannot decrypt image/SVG artwork.',
      11,
    );
  return root(
    680,
    944,
    {
      transport: TRANSPORT,
      layout: 'page',
      partial,
      rsaBits: bundle.rsaBits,
      ...bundle.context,
      ...page,
    },
    content,
  );
}
export function licenseLines(columns = 110): readonly string[] {
  return exportLicense.split('\n').flatMap((line) => {
    const output: string[] = [];
    while (line.length > columns) {
      let end = line.lastIndexOf(' ', columns);
      if (end < 1) end = columns;
      output.push(line.slice(0, end));
      line = line.slice(end).trimStart();
    }
    output.push(line);
    return output;
  });
}
export const PNG_NOTICE_HEIGHT = 32 + licenseLines(100).length * 11;
export function compactSVG(
  bundle: ExportBundle,
): Readonly<{ svg: string; width: number; height: number }> | null {
  const layout = compactLayout(bundle.raw.length, PNG_NOTICE_HEIGHT);
  if (!layout) return null;
  const tokens = mixedSequence(bundle.raw);
  const content =
    `<rect width="${layout.width}" height="${layout.height}" fill="#fff"/>` +
    text(
      24,
      24,
      `Zodiac Modern - complete artwork | ${bundle.raw.length} raw characters | S64M1`,
      13,
    ) +
    text(
      24,
      44,
      'Attach ciphertext.txt too; the receiver cannot decrypt this image.',
      12,
    ) +
    text(24, 64, `Recipient: ${bundle.context.recipientFingerprint}`, 10) +
    text(24, 82, `Envelope:  ${bundle.context.envelopeSHA256}`, 10) +
    text(
      24,
      100,
      'Letters carry payload; CircleOff / CircleDashed / Skull are skipped nulls.',
      11,
    ) +
    tokens
      .map((token, index) => {
        const x = 24 + (index % 32) * CELL,
          y = 120 + Math.floor(index / 32) * CELL;
        if (token.kind === 'literal') {
          const value = text(-7, 8, token.character, 22);
          return `<g data-offset="${token.offset}" transform="translate(${x + 12} ${y + 12})${token.orientation === 'mirrored' ? ' scale(-1 1)' : token.orientation === 'rotated' ? ' rotate(180)' : ''}">${value}</g>`;
        }
        const id =
          token.kind === 'null'
            ? 64 + NULL_GLYPHS.indexOf(token.glyph)
            : BASE64URL_ALPHABET.indexOf(token.character);
        return `<use href="#s64m1-${String(id).padStart(2, '0')}" x="${x}" y="${y}" width="24" height="24"${token.kind === 'null' ? ` data-after-offset="${token.afterOffset}"` : ` data-offset="${token.offset}"`}/>`;
      })
      .join('') +
    licenseLines(100)
      .map((line, i) => text(24, 148 + layout.rows * CELL + i * 11, line, 10))
      .join('');
  return {
    ...layout,
    svg: root(
      layout.width,
      layout.height,
      {
        ...metadata(bundle),
        layout: 'compact',
        presentation: 'S64M1',
        tokenCount: tokens.length,
        columns: 32,
      },
      content,
      true,
    ),
  };
}
export function archivalPNGSource(
  bundle: ExportBundle,
  pageIndex: number,
): { svg: string; width: number; height: number } {
  const base = pageSVG(bundle, pageIndex),
    lines = licenseLines(90),
    height = 976 + lines.length * 11;
  const footer = lines
    .map((line, i) => text(0, 960 + i * 11, line, 10))
    .join('');
  return {
    width: 680,
    height,
    svg: base
      .replace(
        'height="944" viewBox="0 0 680 944"',
        `height="${height}" viewBox="0 0 680 ${height}"`,
      )
      .replace('</svg>', `${footer}</svg>`),
  };
}
