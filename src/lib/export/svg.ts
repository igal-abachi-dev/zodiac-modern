import {
  BASE64URL_ALPHABET,
  GLYPHS,
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
  const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>Symbols artwork</title><metadata id="zodiac-metadata">${escapeXML(JSON.stringify({ ...data, attribution: '@lucide/svelte 1.51.0; frozen local vectors', license: glyphLicense }))}</metadata>${definitions(mixed)}${content}</svg>`;
  if (new TextEncoder().encode(text).length > 16 * 1024 * 1024)
    throw Error('SVG exceeds its file limit.');
  return text;
}
function text(x: number, y: number, value: string, size = 12): string {
  return `<text x="${x}" y="${y}" font-family="monospace" font-size="${size}" fill="#202938">${escapeXML(value)}</text>`;
}
function maskFingerprint(fingerprint: string): string {
  return `${fingerprint.slice(0, 12)}${'*'.repeat(Math.max(0, fingerprint.length - 15))}${fingerprint.slice(-3)}`;
}
function renderMixedTokens(
  tokens: ReturnType<typeof mixedSequence>,
  left: number,
  top: number,
  columns = 32,
  cell = CELL,
): string {
  return tokens
    .map((token, index) => {
      const x = left + (index % columns) * cell;
      const y = top + Math.floor(index / columns) * cell;
      if (token.kind === 'literal') {
        const value = text(-5, 6, token.character, cell * 0.9);
        return `<g data-offset="${token.offset}" transform="translate(${x + cell / 2} ${y + cell / 2})${token.orientation === 'mirrored' ? ' scale(-1 1)' : token.orientation === 'rotated' ? ' rotate(180)' : ''}">${value}</g>`;
      }
      const id =
        token.kind === 'null'
          ? 64 + NULL_GLYPHS.indexOf(token.glyph)
          : BASE64URL_ALPHABET.indexOf(token.character);
      return `<use href="#s64m1-${String(id).padStart(2, '0')}" x="${x}" y="${y}" width="${cell}" height="${cell}"${token.kind === 'null' ? ` data-after-offset="${token.afterOffset}"` : ` data-offset="${token.offset}"`}/>`;
    })
    .join('');
}
export function oneLineSVG(bundle: ExportBundle): string {
  const tokens = mixedSequence(bundle.raw);
  const rows = Math.ceil(tokens.length / 32);
  const width = 816;
  const height = 128 + rows * CELL;
  return root(
    width,
    height,
    {
      ...metadata(bundle),
      layout: 'mixed-grid',
      presentation: 'S64M1',
      columns: 32,
      tokenCount: tokens.length,
    },
    text(
      24,
      24,
      `Zodiac Modern - complete artwork | ${bundle.raw.length} raw characters | S64M1`,
      13,
    ) +
      text(
        24,
        44,
        'Attach ciphertext.txt too; the receiver cannot decrypt this artwork.',
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
      renderMixedTokens(tokens, 24, 120),
    true,
  );
}
export function pageSVG(
  bundle: ExportBundle,
  pageIndex: number,
  partial = true,
): string {
  integer(pageIndex, bundle.pages.length - 1);
  const page = bundle.pages[pageIndex]!;
  const tokens = mixedSequence(page.raw, page.startOffset);
  const artworkRows =
    renderMixedTokens(tokens, 24, 76, 16, 20) +
    page.rows
      .map((row) => {
        const start = page.startOffset + row.rowIndex * 16;
        const priorTokens = row.rowIndex * 18;
        const rowTokenCount =
          row.raw.length +
          Math.floor((start + row.raw.length) / 8) -
          Math.floor(start / 8);
        const baseline = 76 + ((priorTokens + rowTokenCount / 2) / 16) * 20 + 5;
        return text(
          400,
          baseline,
          `${String(row.rowIndex + 1).padStart(2, '0')} ${row.raw.padEnd(16, ' ')} ${row.checkCode}`,
          16,
        );
      })
      .join('');
  const content =
    `<rect width="816" height="1133" fill="#fff"/>` +
    text(
      24,
      20,
      `Recipient: ${maskFingerprint(bundle.context.recipientFingerprint)}`,
      11,
    ) +
    text(24, 36, `Envelope:  ${bundle.context.envelopeSHA256}`, 11) +
    text(
      24,
      52,
      `Page check: ${page.digest.slice(0, 12)} | raw total ${bundle.raw.length}`,
      12,
    ) +
    text(
      24,
      68,
      `Symbols | characters ${page.startOffset + 1}-${page.startOffset + page.raw.length}`,
      11,
    ) +
    artworkRows +
    text(
      440,
      1121,
      `${bundle.context.profile} | RSA-${bundle.rsaBits}`,
      9,
    ) +
    text(
      700,
      1121,
      `${partial ? 'PARTIAL · ' : ''}Page ${pageIndex + 1} of ${bundle.pages.length}`,
      9,
    );
  return root(
    816,
    1133,
    {
      transport: TRANSPORT,
      layout: 'page',
      presentation: 'S64M1',
      columns: 16,
      tokenCount: tokens.length,
      partial,
      check: bundle.context.check,
      envelopeSHA256: bundle.context.envelopeSHA256,
      recipientFingerprint: bundle.context.recipientFingerprint,
      totalRawCharacters: bundle.context.totalRawCharacters,
      pageCount: bundle.context.pageCount,
      ...page,
    },
    content,
    true,
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
    renderMixedTokens(tokens, 24, 120) +
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
    height = 1165 + lines.length * 11;
  const footer = lines
    .map((line, i) => text(0, 1149 + i * 11, line, 10))
    .join('');
  return {
    width: 816,
    height,
    svg: base
      .replace(
        'height="1133" viewBox="0 0 816 1133"',
        `height="${height}" viewBox="0 0 816 ${height}"`,
      )
      .replace('</svg>', `${footer}</svg>`),
  };
}
