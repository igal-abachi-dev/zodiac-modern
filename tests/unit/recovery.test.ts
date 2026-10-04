import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { encodeBase64URL } from '../../src/lib/codecs/base64url';
import { recoverRaw, createCheckPages, assemblePages, parsePrintedRows } from '../../src/lib/codecs/recovery';
import { pageDigest, rowDigest, checkTranscribedPage, validateContext, type TranscribedPage } from '../../src/lib/export/checks';
const fingerprint = 'ab'.repeat(32);
const raw = encodeBase64URL(new Uint8Array(438));
async function fixture(value = raw) {
  const bundle = await createCheckPages(value, fingerprint);
  const pages: TranscribedPage[] = bundle.pages.map((p) => ({ pageIndex: p.pageIndex, startOffset: p.startOffset, checkCode: p.digest.slice(0, 12), rows: p.rows }));
  return { ...bundle, pages };
}
const digest = (values: unknown[]) => createHash('sha256').update(JSON.stringify(values), 'utf8').digest('hex');
describe('S64CHECK1 external context and bounded raw recovery', () => {
  it('matches independent compact-JSON SHA-256 vectors for first and short final rows/pages', async () => {
    const { context, pages } = await fixture();
    const final = pages[1]!, row = final.rows.at(-1)!;
    expect(context.envelopeSHA256).toBe(createHash('sha256').update(new Uint8Array(438)).digest('hex'));
    expect(row.raw).toHaveLength(8);
    expect(await pageDigest(context, 1, 512, 'A'.repeat(72))).toBe(digest(['S64CHECK1', 'page', context.profile, 'S64L1', context.envelopeSHA256, fingerprint, 584, 1, 2, 512, 'A'.repeat(72)]));
    expect(await rowDigest(context, 1, 4, 576, row.raw)).toBe(digest(['S64CHECK1', 'row', context.profile, 'S64L1', context.envelopeSHA256, fingerprint, 584, 1, 2, 4, 576, row.raw]));
    expect((await assemblePages(context, pages)).raw).toBe(raw);
  });
  it('locates a changed row before the rest of the page or bundle is present', async () => {
    const { context, pages } = await fixture();
    const original = pages[0]!, row = original.rows[12]!;
    expect(await checkTranscribedPage(context, { ...original, checkCode: '', rows: [row] })).toEqual({ checkedRows: 1 });
    await expect(checkTranscribedPage(context, { ...original, rows: [{ ...row, raw: 'B' + row.raw.slice(1) }] })).rejects.toThrow('Page 1, row 13: check mismatch');
    await expect(checkTranscribedPage({ ...context, recipientFingerprint: 'cd'.repeat(32) }, { ...original, rows: [row] })).rejects.toThrow('row 13: check mismatch');
    await expect(checkTranscribedPage(context, { ...original, pageIndex: 1, startOffset: 512, rows: [row] })).rejects.toThrow('invalid position');
  });
  it('rejects missing/duplicate/reordered/overlapping pages and rows, wrong page context and codes', async () => {
    const { context, pages } = await fixture();
    for (const list of [pages.slice(1), [pages[1]!, pages[0]!], [pages[0]!, pages[0]!]]) await expect(assemblePages(context, list)).rejects.toThrow();
    const first = pages[0]!;
    await expect(checkTranscribedPage(context, { ...first, startOffset: 1 })).rejects.toThrow('Page offset');
    await expect(checkTranscribedPage(context, { ...first, rows: [first.rows[0]!, first.rows[0]!] })).rejects.toThrow('duplicate');
    await expect(checkTranscribedPage(context, { ...first, rows: [first.rows[1]!, first.rows[0]!] })).rejects.toThrow('reordered');
    await expect(assemblePages(context, [{ ...first, rows: first.rows.slice(1) }, pages[1]!])).rejects.toThrow('incomplete');
    await expect(checkTranscribedPage(context, { ...first, checkCode: '0'.repeat(12) })).rejects.toThrow('Rows pass');
    await expect(checkTranscribedPage(context, { ...first, rows: [{ ...first.rows[0]!, checkCode: first.rows[0]!.checkCode.toUpperCase() }] })).rejects.toThrow('check mismatch');
    for (const patch of [{ map: 'unknown' }, { profile: 'unknown' }, { totalRawCharacters: 585 }, { pageCount: 3 }, { totalRawCharacters: Infinity }, { envelopeSHA256: 'ABC' }]) expect(() => validateContext({ ...context, ...patch } as typeof context)).toThrow();
  });
  it('always checks the full envelope after all public row/page checks pass', async () => {
    const { context, pages } = await fixture();
    const wrong = { ...context, envelopeSHA256: 'cd'.repeat(32) };
    const recomputed = await Promise.all(pages.map(async (p) => ({ ...p, checkCode: (await pageDigest(wrong, p.pageIndex, p.startOffset, p.rows.map((r) => r.raw).join(''))).slice(0, 12), rows: await Promise.all(p.rows.map(async (r) => ({ ...r, checkCode: (await rowDigest(wrong, p.pageIndex, r.rowIndex, r.startOffset, r.raw)).slice(0, 8) }))) })));
    await expect(assemblePages(wrong, recomputed)).rejects.toThrow('Whole-envelope checksum mismatch');
  });
  it('keeps cleaning explicit, preserves canonical bytes and refuses aliases, foreign markup and excessive input', async () => {
    await expect(recoverRaw(raw + '\n')).rejects.toThrow();
    expect((await recoverRaw(' \t' + raw.slice(0, 16) + '\r\n' + raw.slice(16), true)).raw).toBe(raw);
    for (const text of ['\ufeff' + raw, raw + '\u00a0', raw + '=', 'A'.repeat(551).slice(0, -1) + 'B', '<svg><script>alert(1)</script></svg>', 'A'.repeat(176205), 'AA']) await expect(recoverRaw(text, true)).rejects.toThrow();
    expect(() => parsePrintedRows('1 ABCDEFGHIJKLMNOP 1234abcd', 0)).not.toThrow();
    for (const text of ['0 A 1234abcd', '33 A 1234abcd', '1 A 123', '1 <svg> 1234abcd', '1 A 1234abcd\n'.repeat(33)]) expect(() => parsePrintedRows(text, 0)).toThrow();
  });
  it('recovers the maximum envelope through all 173 pages without dropping its short final row', async () => {
    const maximum = encodeBase64URL(Uint8Array.from({ length: 66076 }, (_, i) => i % 256));
    expect(maximum).toHaveLength(88102);
    const { context, pages } = await fixture(maximum);
    expect(pages).toHaveLength(173);
    expect(pages.at(-1)!.rows.at(-1)!.raw).toHaveLength(6);
    expect((await assemblePages(context, pages)).raw).toBe(maximum);
  }, 15000);
});
