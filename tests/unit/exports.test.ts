import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { encodeBase64URL } from '../../src/lib/codecs/base64url';
import { compactLayout, exportBundle } from '../../src/lib/export/layout';
import {
  oneLineSVG,
  pageSVG,
  compactSVG,
  PNG_NOTICE_HEIGHT,
  archivalPNGSource,
} from '../../src/lib/export/svg';
import { BASE64URL_ALPHABET } from '../../src/lib/symbols/manifest';
import { assemblePages } from '../../src/lib/codecs/recovery';

function fixture(size = 438, bits: 3072 | 4096 = 3072) {
  const bytes = Uint8Array.from({ length: size }, (_, i) => i % 256);
  return {
    raw: encodeBase64URL(bytes),
    checksum: createHash('sha256').update(bytes).digest('hex'),
    recipient: {
      bits,
      fingerprint: 'ab'.repeat(32),
      name: 'DO NOT EXPORT <message>',
      source: 'custom' as const,
    },
  };
}
describe('trusted exports, exact ordering and raster bounds', () => {
  it('retains all characters in the complete strip and all checked pages, independently of the preview', async () => {
    const result = fixture(),
      bundle = await exportBundle(result),
      svg = oneLineSVG(bundle);
    const emitted = [
      ...svg.matchAll(
        /<use href="#s64l1-(\d+)" x="(\d+)" y="0" width="24" height="24" data-offset="(\d+)"\/>/g,
      ),
    ];
    expect(emitted).toHaveLength(584);
    expect(emitted.map((m) => BASE64URL_ALPHABET[Number(m[1])]).join('')).toBe(
      result.raw,
    );
    emitted.forEach((m, i) => {
      expect(Number(m[2])).toBe(i * 24);
      expect(Number(m[3])).toBe(i);
    });
    expect(bundle.pages.map((p) => p.raw).join('')).toBe(result.raw);
    expect(
      await assemblePages(
        bundle.context,
        bundle.pages.map((p) => ({ ...p, checkCode: p.digest.slice(0, 12) })),
      ),
    ).toEqual({ raw: result.raw, checksum: result.checksum });
    const last = pageSVG(bundle, 1);
    expect([...last.matchAll(/<use /g)].length).toBe(72);
    expect(last).toContain(bundle.pages[1]!.digest.slice(0, 12));
    for (const row of bundle.pages[1]!.rows)
      expect(last).toContain(row.checkCode);
    expect(svg + last).not.toContain(result.recipient.name);
    expect(svg).not.toMatch(
      /<(?:script|style|image|foreignObject)|\s(?:style|on\w+)=|href="[^#]/,
    );
    expect(svg).toContain('&quot;raw&quot;:&quot;' + result.raw);
  });
  it('fits the 584-character two-archival-page example into one complete mixed PNG with all payload/nulls', async () => {
    const bundle = await exportBundle(fixture()),
      compact = compactSVG(bundle)!;
    expect(compact.width).toBe(816);
    expect(compact.height).toBeLessThanOrEqual(4096);
    expect([...compact.svg.matchAll(/data-offset="/g)].length).toBe(584);
    expect([...compact.svg.matchAll(/data-after-offset="/g)].length).toBe(73);
    expect(compact.svg).toContain('scale(-1 1)');
    expect(compact.svg).toContain('rotate(180)');
    expect(compact.svg).toContain('Attach ciphertext.txt too');
    expect(archivalPNGSource(bundle, 1).height).toBeLessThanOrEqual(4096);
  });
  it('checks the exact complete-image boundary and truthful page fallback', () => {
    let largest = 0;
    for (let length = 550; length <= 88102; length++)
      if (compactLayout(length, PNG_NOTICE_HEIGHT)) largest = length;
    const layout = compactLayout(largest, PNG_NOTICE_HEIGHT)!;
    expect(layout.height).toBeLessThanOrEqual(4096);
    expect(layout.width * layout.height).toBeLessThanOrEqual(16_000_000);
    expect(compactLayout(largest + 1, PNG_NOTICE_HEIGHT)).toBeNull();
    expect(compactLayout(88102, PNG_NOTICE_HEIGHT)).toBeNull();
    expect(() => compactLayout(88103, PNG_NOTICE_HEIGHT)).toThrow();
  });
  it('serializes the maximum envelope below the future 16 MiB cap with exact final offsets', async () => {
    const result = fixture(66076, 4096),
      bundle = await exportBundle(result),
      svg = oneLineSVG(bundle);
    expect(result.raw.length).toBe(88102);
    expect(bundle.pages).toHaveLength(173);
    expect(Buffer.byteLength(svg)).toBeLessThan(16 * 1024 * 1024);
    expect([...svg.matchAll(/<use /g)].length).toBe(88102);
    expect(svg).toContain('data-offset="88101"');
    expect(pageSVG(bundle, 172)).toContain('characters 88065-88102');
    expect(compactSVG(bundle)).toBeNull();
    expect(() => pageSVG(bundle, 173)).toThrow();
  });
  it('rejects changed identities, invalid ciphertext and unsupported sizes without emitting files', async () => {
    const result = fixture();
    await expect(
      exportBundle({ ...result, checksum: '00'.repeat(32) }),
    ).rejects.toThrow('checksum');
    await expect(
      exportBundle({ ...result, raw: result.raw + '=' }),
    ).rejects.toThrow();
    await expect(
      exportBundle({
        ...result,
        recipient: { ...result.recipient, fingerprint: '<unsafe>' },
      }),
    ).rejects.toThrow();
  });
});
