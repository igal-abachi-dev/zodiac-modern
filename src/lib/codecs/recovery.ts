import { decodeBase64URL } from './base64url';
import { MAX_RAW_CHARS } from '../crypto/profile';
import { CHECK_PROFILE, ENCRYPTION_PROFILE, validateContext, pageDigest, rowDigest, checkTranscribedPage, sha256, type CheckContext, type CheckedPage, type TranscribedPage } from '../export/checks';
export const MAX_RECOVERY_TEXT = MAX_RAW_CHARS * 2;
export async function recoverRaw(text: string, cleanASCIIWhitespace = false): Promise<Readonly<{ raw: string; checksum: string }>> {
  if (text.length > MAX_RECOVERY_TEXT) throw Error('Recovery text exceeds the input limit.');
  const raw = cleanASCIIWhitespace ? text.replace(/[\t\n\r ]/g, '') : text;
  const bytes = decodeBase64URL(raw);
  if (bytes.length < 412) throw Error('Raw ciphertext is shorter than a supported envelope.');
  return Object.freeze({ raw, checksum: await sha256(bytes) });
}
export async function createCheckPages(raw: string, recipientFingerprint: string): Promise<Readonly<{ context: CheckContext; pages: readonly CheckedPage[] }>> {
  const recovered = await recoverRaw(raw);
  const context: CheckContext = Object.freeze({ check: CHECK_PROFILE, profile: ENCRYPTION_PROFILE, map: 'S64L1', envelopeSHA256: recovered.checksum, recipientFingerprint, totalRawCharacters: raw.length, pageCount: Math.ceil(raw.length / 512) });
  validateContext(context);
  const pages: CheckedPage[] = [];
  for (let pageIndex = 0; pageIndex < context.pageCount; pageIndex++) {
    const startOffset = pageIndex * 512, chunk = raw.slice(startOffset, startOffset + 512);
    const rows = await Promise.all(Array.from({ length: Math.ceil(chunk.length / 16) }, async (_, rowIndex) => {
      const offset = startOffset + rowIndex * 16, row = chunk.slice(rowIndex * 16, rowIndex * 16 + 16);
      const full = await rowDigest(context, pageIndex, rowIndex, offset, row);
      return Object.freeze({ rowIndex, startOffset: offset, raw: row, digest: full, checkCode: full.slice(0, 8) });
    }));
    pages.push(Object.freeze({ pageIndex, startOffset, raw: chunk, digest: await pageDigest(context, pageIndex, startOffset, chunk), rows: Object.freeze(rows) }));
  }
  return Object.freeze({ context, pages: Object.freeze(pages) });
}
export async function assemblePages(context: CheckContext, pages: readonly TranscribedPage[]): Promise<Readonly<{ raw: string; checksum: string }>> {
  validateContext(context);
  if (pages.length !== context.pageCount) throw Error('All printed pages are required; missing or extra pages.');
  const chunks: string[] = [];
  for (const [index, page] of pages.entries()) {
    if (page.pageIndex !== index) throw Error('Pages must be complete, unique and in printed order.');
    const checked = await checkTranscribedPage(context, page);
    if (!('raw' in checked)) throw Error(`Page ${index + 1} is incomplete.`);
    chunks.push(checked.raw);
  }
  const result = await recoverRaw(chunks.join(''));
  if (result.raw.length !== context.totalRawCharacters || result.checksum !== context.envelopeSHA256) throw Error('Whole-envelope checksum mismatch after assembly.');
  return result;
}
// Human labels are one-based; the fixed check schema is zero-based.
export function parsePrintedRows(text: string, pageIndex: number): TranscribedPage['rows'] {
  if (text.length > 4096 || !Number.isSafeInteger(pageIndex) || pageIndex < 0 || pageIndex > 172) throw Error('Invalid printed page or row input limit.');
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length || lines.length > 32) throw Error('Enter at most 32 rows per page.');
  return Object.freeze(lines.map((line) => {
    const match = /^([1-9][0-9]?) +([A-Za-z0-9_-]{1,16}) +([a-f0-9]{8}|[a-f0-9]{64})$/.exec(line.trim());
    if (!match) throw Error('Use one line per row: printed row number, exact raw text, check code (separated by spaces).');
    const rowIndex = Number(match[1]) - 1;
    if (rowIndex >= 32) throw Error('Printed row numbers must be 1 to 32.');
    return Object.freeze({ rowIndex, startOffset: pageIndex * 512 + rowIndex * 16, raw: match[2]!, checkCode: match[3]! });
  }));
}
