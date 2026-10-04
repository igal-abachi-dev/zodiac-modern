// External public transcription checks. They never enter the encrypted envelope.
import { MAX_RAW_CHARS } from '../crypto/profile';
export const CHECK_PROFILE = 'S64CHECK1';
export const ENCRYPTION_PROFILE = 'rsa-oaep-sha256-aes256gcm-v1';
export const ARCHIVAL_PAGE_CHARACTERS = 512;
export const ARCHIVAL_ROW_CHARACTERS = 16;
export type CheckContext = Readonly<{
  check: 'S64CHECK1';
  profile: typeof ENCRYPTION_PROFILE;
  map: 'S64L1';
  envelopeSHA256: string;
  recipientFingerprint: string;
  totalRawCharacters: number;
  pageCount: number;
}>;
export type TranscribedRow = Readonly<{
  rowIndex: number;
  startOffset: number;
  raw: string;
  checkCode: string;
}>;
export type TranscribedPage = Readonly<{
  pageIndex: number;
  startOffset: number;
  checkCode: string;
  rows: readonly TranscribedRow[];
}>;
export type CheckedPage = Readonly<{
  pageIndex: number;
  startOffset: number;
  raw: string;
  digest: string;
  rows: readonly (TranscribedRow & { digest: string })[];
}>;
export function integer(value: number, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum)
    throw Error('Invalid check position or length.');
}
export function validateContext(context: CheckContext): void {
  if (
    context.check !== CHECK_PROFILE ||
    context.profile !== ENCRYPTION_PROFILE ||
    context.map !== 'S64L1' ||
    !/^[a-f0-9]{64}$/.test(context.envelopeSHA256) ||
    !/^[a-f0-9]{64}$/.test(context.recipientFingerprint)
  )
    throw Error('Use the complete printed S64CHECK1 identity context.');
  integer(context.totalRawCharacters, MAX_RAW_CHARS);
  if (
    context.totalRawCharacters < 550 ||
    context.totalRawCharacters % 4 === 1 ||
    context.pageCount !==
      Math.ceil(context.totalRawCharacters / ARCHIVAL_PAGE_CHARACTERS)
  )
    throw Error('Invalid total length or page count.');
}
function position(
  context: CheckContext,
  pageIndex: number,
  startOffset: number,
  raw: string,
  rowIndex?: number,
): void {
  validateContext(context);
  integer(pageIndex, context.pageCount - 1);
  integer(startOffset, context.totalRawCharacters - 1);
  const pageStart = pageIndex * ARCHIVAL_PAGE_CHARACTERS;
  const pageLength = Math.min(
    ARCHIVAL_PAGE_CHARACTERS,
    context.totalRawCharacters - pageStart,
  );
  if (rowIndex !== undefined)
    integer(rowIndex, Math.ceil(pageLength / ARCHIVAL_ROW_CHARACTERS) - 1);
  const expectedStart = pageStart + (rowIndex ?? 0) * ARCHIVAL_ROW_CHARACTERS;
  const expectedLength =
    rowIndex === undefined
      ? pageLength
      : Math.min(
          ARCHIVAL_ROW_CHARACTERS,
          context.totalRawCharacters - expectedStart,
        );
  if (
    startOffset !== expectedStart ||
    raw.length !== expectedLength ||
    !/^[A-Za-z0-9_-]+$/.test(raw)
  )
    throw Error('Wrong character count, offset or raw alphabet.');
}
export async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}
async function digest(values: readonly (string | number)[]): Promise<string> {
  return sha256(new TextEncoder().encode(JSON.stringify(values)));
}
export function pageDigest(
  context: CheckContext,
  pageIndex: number,
  startOffset: number,
  raw: string,
): Promise<string> {
  position(context, pageIndex, startOffset, raw);
  return digest([
    CHECK_PROFILE,
    'page',
    context.profile,
    context.map,
    context.envelopeSHA256,
    context.recipientFingerprint,
    context.totalRawCharacters,
    pageIndex,
    context.pageCount,
    startOffset,
    raw,
  ]);
}
export function rowDigest(
  context: CheckContext,
  pageIndex: number,
  rowIndex: number,
  startOffset: number,
  raw: string,
): Promise<string> {
  position(context, pageIndex, startOffset, raw, rowIndex);
  return digest([
    CHECK_PROFILE,
    'row',
    context.profile,
    context.map,
    context.envelopeSHA256,
    context.recipientFingerprint,
    context.totalRawCharacters,
    pageIndex,
    context.pageCount,
    rowIndex,
    startOffset,
    raw,
  ]);
}
export function codeMatches(
  code: string,
  full: string,
  prefix: 8 | 12,
): boolean {
  return (
    (code.length === prefix || code.length === 64) &&
    /^[a-f0-9]+$/.test(code) &&
    full.startsWith(code)
  );
}
export async function checkTranscribedPage(
  context: CheckContext,
  page: TranscribedPage,
): Promise<CheckedPage | { checkedRows: number }> {
  validateContext(context);
  integer(page.pageIndex, context.pageCount - 1);
  if (page.startOffset !== page.pageIndex * ARCHIVAL_PAGE_CHARACTERS)
    throw Error('Page offset does not match its printed position.');
  if (!Array.isArray(page.rows) || !page.rows.length || page.rows.length > 32)
    throw Error('Enter one to 32 printed rows.');
  const rows: (TranscribedRow & { digest: string })[] = [];
  let previous = -1;
  for (const row of page.rows) {
    if (row.rowIndex <= previous)
      throw Error(`Page ${page.pageIndex + 1}: duplicate or reordered row.`);
    let full: string;
    try {
      full = await rowDigest(
        context,
        page.pageIndex,
        row.rowIndex,
        row.startOffset,
        row.raw,
      );
    } catch {
      throw Error(
        `Page ${page.pageIndex + 1}, row ${row.rowIndex + 1}: invalid position, length or raw characters.`,
      );
    }
    if (!codeMatches(row.checkCode, full, 8))
      throw Error(
        `Page ${page.pageIndex + 1}, row ${row.rowIndex + 1}: check mismatch. Check the text and printed identity/position.`,
      );
    rows.push(Object.freeze({ ...row, digest: full }));
    previous = row.rowIndex;
  }
  const count = Math.ceil(
    Math.min(512, context.totalRawCharacters - page.startOffset) / 16,
  );
  if (rows.length !== count || rows.some((row, i) => row.rowIndex !== i))
    return Object.freeze({ checkedRows: rows.length });
  const raw = rows.map((r) => r.raw).join('');
  const full = await pageDigest(context, page.pageIndex, page.startOffset, raw);
  if (!codeMatches(page.checkCode, full, 12))
    throw Error(
      `Page ${page.pageIndex + 1}: page check mismatch. Rows pass; check page identity, order and completeness.`,
    );
  return Object.freeze({
    pageIndex: page.pageIndex,
    startOffset: page.startOffset,
    raw,
    digest: full,
    rows: Object.freeze(rows),
  });
}
