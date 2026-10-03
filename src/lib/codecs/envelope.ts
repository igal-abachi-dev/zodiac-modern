import {
  MAX_MESSAGE_BYTES,
  NONCE_BYTES,
  TAG_BYTES,
  wrappedKeyBytes,
  type RSABits,
} from '../crypto/profile';

export type EnvelopeParts = Readonly<{
  wrappedKey: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
  ciphertext: Uint8Array;
}>;
export function envelopeBytes(bits: RSABits, plaintextBytes: number): number {
  if (
    !Number.isInteger(plaintextBytes) ||
    plaintextBytes < 0 ||
    plaintextBytes > MAX_MESSAGE_BYTES
  )
    throw new Error('Invalid message byte length.');
  return wrappedKeyBytes(bits) + NONCE_BYTES + TAG_BYTES + plaintextBytes;
}
export function rawCharacters(bits: RSABits, plaintextBytes: number): number {
  return Math.ceil((envelopeBytes(bits, plaintextBytes) * 4) / 3);
}
export function splitEnvelope(bytes: Uint8Array, bits: RSABits): EnvelopeParts {
  const wrapped = wrappedKeyBytes(bits);
  const minimum = envelopeBytes(bits, 0);
  if (
    bytes.length < minimum ||
    bytes.length > envelopeBytes(bits, MAX_MESSAGE_BYTES)
  )
    throw new Error('Invalid envelope byte length.');
  return Object.freeze({
    wrappedKey: bytes.subarray(0, wrapped),
    nonce: bytes.subarray(wrapped, wrapped + NONCE_BYTES),
    tag: bytes.subarray(wrapped + NONCE_BYTES, minimum),
    ciphertext: bytes.subarray(minimum),
  });
}
export function serializeEnvelope(
  parts: EnvelopeParts,
  bits: RSABits,
): Uint8Array<ArrayBuffer> {
  const { wrappedKey, nonce, tag, ciphertext } = parts;
  if (
    wrappedKey.length !== wrappedKeyBytes(bits) ||
    nonce.length !== NONCE_BYTES ||
    tag.length !== TAG_BYTES
  )
    throw new Error('Invalid envelope field length.');
  const result = new Uint8Array(envelopeBytes(bits, ciphertext.length));
  result.set(wrappedKey);
  result.set(nonce, wrappedKey.length);
  result.set(tag, wrappedKey.length + nonce.length);
  result.set(ciphertext, wrappedKey.length + nonce.length + tag.length);
  return result;
}
