import { encodeBase64URL } from '../codecs/base64url';
import { encodeMessage } from '../validation/input';
import type { RecipientKey } from './public-key';
import { serializeEnvelope } from '../codecs/envelope';
import {
  AES_KEY_BYTES,
  NONCE_BYTES,
  TAG_BYTES,
  wrappedKeyBytes,
} from './profile';

export class EncryptionError extends Error {
  constructor(
    message = 'Unable to encrypt locally. Retry with the selected recipient.',
  ) {
    super(message);
    this.name = 'EncryptionError';
  }
}
export function encryptionAvailable(): boolean {
  return (
    globalThis.isSecureContext === true &&
    typeof globalThis.crypto?.subtle?.encrypt === 'function'
  );
}

// Shared by isolated interoperability tests and EN-04's feasibility probe.
// The production workspace does not enable this until its integrated gates pass.
export async function encryptMessage(text: string, recipient: RecipientKey) {
  if (!encryptionAvailable())
    throw new EncryptionError(
      'Use HTTPS or a supported local sender with native WebCrypto.',
    );
  const algorithm = recipient.key.algorithm as RsaHashedKeyAlgorithm;
  if (
    recipient.key.type !== 'public' ||
    algorithm.name !== 'RSA-OAEP' ||
    algorithm.hash?.name !== 'SHA-256' ||
    algorithm.modulusLength !== recipient.bits ||
    algorithm.publicExponent?.length !== 3 ||
    algorithm.publicExponent[0] !== 1 ||
    algorithm.publicExponent[1] !== 0 ||
    algorithm.publicExponent[2] !== 1 ||
    !recipient.key.usages.includes('encrypt')
  )
    throw new EncryptionError('Choose a validated RSA public recipient.');
  wrappedKeyBytes(recipient.bits);
  const plaintext = encodeMessage(text);
  const rawKey = new Uint8Array(AES_KEY_BYTES);
  let aesKey: CryptoKey | null = null;
  try {
    crypto.getRandomValues(rawKey);
    const wrapped = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipient.key, rawKey),
    );
    if (wrapped.length !== recipient.bits / 8)
      throw new Error('Invalid wrapped key size.');
    aesKey = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, [
      'encrypt',
    ]);
    rawKey.fill(0);
    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
    const aad = new Uint8Array(wrapped.length + nonce.length);
    aad.set(wrapped);
    aad.set(nonce, wrapped.length);
    const sealed = new Uint8Array(
      await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: nonce,
          additionalData: aad,
          tagLength: TAG_BYTES * 8,
        },
        aesKey,
        plaintext,
      ),
    );
    if (sealed.length !== plaintext.length + TAG_BYTES)
      throw new Error('Invalid ciphertext size.');
    const envelope = serializeEnvelope(
      {
        wrappedKey: wrapped,
        nonce,
        tag: sealed.subarray(sealed.length - TAG_BYTES),
        ciphertext: sealed.subarray(0, sealed.length - TAG_BYTES),
      },
      recipient.bits,
    );
    return {
      raw: encodeBase64URL(envelope),
      envelope,
      fingerprint: recipient.fingerprint,
      bits: recipient.bits,
    };
  } catch {
    throw new EncryptionError();
  } finally {
    rawKey.fill(0);
    plaintext.fill(0);
    aesKey = null;
  }
}
