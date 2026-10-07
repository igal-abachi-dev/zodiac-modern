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
  it('retains the complete S64M1 artwork and all checked raw pages, independently of the preview', async () => {
    const result = fixture(),
      bundle = await exportBundle(result),
      svg = oneLineSVG(bundle);
    expect(svg).toContain('presentation&quot;:&quot;S64M1');
    expect([...svg.matchAll(/data-offset="\d+"/g)]).toHaveLength(584);
    expect([...svg.matchAll(/data-after-offset="\d+"/g)]).toHaveLength(73);
    expect(svg).toContain('scale(-1 1)');
    expect(svg).toContain('rotate(180)');
    expect(svg).toContain('layout&quot;:&quot;mixed-grid');
    expect(bundle.pages.map((p) => p.raw).join('')).toBe(result.raw);
    expect(
      await assemblePages(
        bundle.context,
        bundle.pages.map((p) => ({ ...p, checkCode: p.digest.slice(0, 12) })),
      ),
    ).toEqual({ raw: result.raw, checksum: result.checksum });
    const last = pageSVG(bundle, 1);
    expect(last).toContain('S64M1');
    expect([...last.matchAll(/data-after-offset="\d+"/g)].length).toBe(9);
    expect([
      ...last.matchAll(/href="#s64m1-6[456]"[^>]*data-after-offset="\d+"/g),
    ]).toHaveLength(9);
    expect([...last.matchAll(/data-offset="\d+"/g)].length).toBe(72);
    expect(last).toContain('rsa-oaep-sha256-aes256gcm-v1 | RSA-3072');
    expect(last).toContain('x="440" y="1121"');
    expect(last).not.toContain('text rows below');
    expect(last).toContain('columns&quot;:16');
    expect(last).toContain('scale(-1 1)');
    expect(last).toContain('Symbols');
    expect(last).toContain('Recipient: abababababab');
    expect(last).not.toContain('Zodiac Modern - page');
    expect(last).not.toContain('S64CHECK1 page check');
    expect(last).not.toContain('Recover using all raw rows');
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
    expect([...svg.matchAll(/data-offset="\d+"/g)].length).toBe(88102);
    expect([...svg.matchAll(/data-after-offset="\d+"/g)].length).toBe(11012);
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
