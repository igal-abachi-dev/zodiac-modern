import { encodeBase64URL } from '../codecs/base64url';
import { encodeMessage } from '../validation/input';
import type { RecipientKey } from './public-key';

// Shared by isolated interoperability tests and EN-04's feasibility probe.
// The production workspace does not enable this until its integrated gates pass.
export async function encryptMessage(text: string, recipient: RecipientKey) {
  if (!globalThis.isSecureContext || !globalThis.crypto?.subtle)
    throw new Error('Secure context and native WebCrypto required.');
  const plaintext = encodeMessage(text);
  const rawKey = new Uint8Array(32);
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
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const aad = new Uint8Array(wrapped.length + nonce.length);
    aad.set(wrapped);
    aad.set(nonce, wrapped.length);
    const sealed = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 },
        aesKey,
        plaintext,
      ),
    );
    if (sealed.length !== plaintext.length + 16)
      throw new Error('Invalid ciphertext size.');
    const envelope = new Uint8Array(aad.length + sealed.length);
    envelope.set(aad);
    envelope.set(sealed.subarray(sealed.length - 16), aad.length);
    envelope.set(sealed.subarray(0, sealed.length - 16), aad.length + 16);
    return {
      raw: encodeBase64URL(envelope),
      envelope,
      fingerprint: recipient.fingerprint,
      bits: recipient.bits,
    };
  } finally {
    rawKey.fill(0);
    plaintext.fill(0);
    aesKey = null;
  }
}
