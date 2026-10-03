export const MAX_MESSAGE_BYTES = 65_536;
export const AES_KEY_BYTES = 32;
export const NONCE_BYTES = 12;
export const TAG_BYTES = 16;
export const MAX_ENVELOPE_BYTES =
  512 + NONCE_BYTES + TAG_BYTES + MAX_MESSAGE_BYTES;
export const MAX_RAW_CHARS = Math.ceil((MAX_ENVELOPE_BYTES * 4) / 3);
export type RSABits = 3072 | 4096;
export function wrappedKeyBytes(bits: RSABits): number {
  if (bits !== 3072 && bits !== 4096) throw new Error('Unsupported RSA size.');
  return bits / 8;
}
