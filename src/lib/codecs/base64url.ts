import { MAX_ENVELOPE_BYTES, MAX_RAW_CHARS } from '../crypto/profile';
export function encodeBase64URL(bytes: Uint8Array): string {
  if (bytes.length > MAX_ENVELOPE_BYTES)
    throw new Error('Encoded bytes exceed the envelope limit.');
  const parts: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 4096) {
    let part = '';
    for (const byte of bytes.subarray(offset, offset + 4096))
      part += String.fromCharCode(byte);
    parts.push(part);
  }
  return btoa(parts.join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
export function decodeBase64URL(raw: string): Uint8Array<ArrayBuffer> {
  if (
    raw.length > MAX_RAW_CHARS ||
    raw.length % 4 === 1 ||
    !/^[A-Za-z0-9_-]*$/.test(raw)
  )
    throw new Error('Invalid canonical Base64URL.');
  const decoded = atob(
    raw.replaceAll('-', '+').replaceAll('_', '/') +
      '='.repeat((4 - (raw.length % 4)) % 4),
  );
  const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  if (encodeBase64URL(bytes) !== raw)
    throw new Error('Noncanonical Base64URL pad bits.');
  return bytes;
}
