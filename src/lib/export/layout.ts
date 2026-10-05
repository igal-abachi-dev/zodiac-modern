import type { MessageResult } from '../crypto/workspace';
import { decodeBase64URL } from '../codecs/base64url';
import { createCheckPages } from '../codecs/recovery';
import {
  ENCRYPTION_PROFILE,
  type CheckContext,
  type CheckedPage,
} from './checks';
import { MAX_RAW_CHARS } from '../crypto/profile';
import { mixedViewTokens, type MixedViewToken } from '../symbols/mixed-view';

export type ArtworkResult = Pick<
  MessageResult,
  'raw' | 'checksum' | 'recipient'
>;
export type ExportBundle = Readonly<{
  raw: string;
  rsaBits: 3072 | 4096;
  context: CheckContext;
  pages: readonly CheckedPage[];
}>;
export const CELL = 24;
export const RASTER_LIMIT = 4096;
export const RASTER_PIXELS = 16_000_000;
export function validateResult(result: ArtworkResult): void {
  if (
    !/^[a-f0-9]{64}$/.test(result.checksum) ||
    !/^[a-f0-9]{64}$/.test(result.recipient.fingerprint) ||
    ![3072, 4096].includes(result.recipient.bits) ||
    !result.raw.length ||
    result.raw.length > MAX_RAW_CHARS
  )
    throw Error('Invalid artwork identity.');
  const bytes = decodeBase64URL(result.raw);
  if (
    bytes.length < result.recipient.bits / 8 + 28 ||
    bytes.length > result.recipient.bits / 8 + 28 + 65536
  )
    throw Error('Invalid artwork envelope length.');
}
export async function exportBundle(
  result: ArtworkResult,
): Promise<ExportBundle> {
  validateResult(result);
  const checked = await createCheckPages(
    result.raw,
    result.recipient.fingerprint,
  );
  if (checked.context.envelopeSHA256 !== result.checksum)
    throw Error('Artwork checksum mismatch.');
  return Object.freeze({
    raw: result.raw,
    rsaBits: result.recipient.bits,
    ...checked,
  });
}
export function mixedSequence(raw: string): readonly MixedViewToken[] {
  const tokens: MixedViewToken[] = [];
  for (let offset = 0; offset < raw.length; offset += 512)
    tokens.push(...mixedViewTokens(raw.slice(offset, offset + 512), offset));
  return tokens;
}
export function compactLayout(
  rawLength: number,
  noticeHeight: number,
): Readonly<{
  width: number;
  height: number;
  rows: number;
  tokenCount: number;
}> | null {
  if (
    !Number.isSafeInteger(rawLength) ||
    rawLength < 1 ||
    rawLength > MAX_RAW_CHARS ||
    !Number.isSafeInteger(noticeHeight) ||
    noticeHeight < 0
  )
    throw Error('Invalid raster layout.');
  const tokenCount = rawLength + Math.floor(rawLength / 8),
    rows = Math.ceil(tokenCount / 32);
  const width = 816,
    height = 128 + rows * CELL + noticeHeight;
  return height <= RASTER_LIMIT && width * height <= RASTER_PIXELS
    ? { width, height, rows, tokenCount }
    : null;
}
export function metadata(bundle: ExportBundle): object {
  return {
    transport: 'S64SVG1',
    profile: ENCRYPTION_PROFILE,
    map: 'S64L1',
    imagePresentation: 'S64M1',
    raw: bundle.raw,
    rawCharacters: bundle.raw.length,
    rsaBits: bundle.rsaBits,
    recipientFingerprint: bundle.context.recipientFingerprint,
    envelopeSHA256: bundle.context.envelopeSHA256,
    context: bundle.context,
    pages: bundle.pages,
  };
}
