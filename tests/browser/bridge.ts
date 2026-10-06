import { encryptMessage } from '../../src/lib/crypto/hybrid';
import { importPublicKey } from '../../src/lib/crypto/public-key';
import {
  decodeBase64URL,
  encodeBase64URL,
} from '../../src/lib/codecs/base64url';
declare global {
  interface Window {
    zodiacTest: {
      encryptMessage: typeof encryptMessage;
      importPublicKey: typeof importPublicKey;
      decryptEnvelopeForTest: (
        privatePkcs8: number[],
        raw: string,
      ) => Promise<number[]>;
      decodeBase64URL: typeof decodeBase64URL;
      encodeBase64URL: typeof encodeBase64URL;
    };
  }
}
window.zodiacTest = {
  encryptMessage,
  importPublicKey,
  async decryptEnvelopeForTest(privatePkcs8, raw) {
    const keyBytes = Uint8Array.from(privatePkcs8);
    const envelope = decodeBase64URL(raw);
    let aesBytes: Uint8Array | undefined;
    let plaintext: Uint8Array | undefined;
    try {
      const rsa = await crypto.subtle.importKey(
        'pkcs8',
        keyBytes,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt'],
      );
      const modulusBytes =
        (rsa.algorithm as RsaHashedKeyAlgorithm).modulusLength / 8;
      const wrappedKey = envelope.subarray(0, modulusBytes);
      const nonce = envelope.subarray(wrappedKey.length, wrappedKey.length + 12);
      const tag = envelope.subarray(wrappedKey.length + 12, wrappedKey.length + 28);
      const ciphertext = envelope.subarray(wrappedKey.length + 28);
      const aad = new Uint8Array(wrappedKey.length + nonce.length);
      aad.set(wrappedKey);
      aad.set(nonce, wrappedKey.length);
      const wrappedAes = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        rsa,
        wrappedKey,
      );
      aesBytes = new Uint8Array(wrappedAes);
      const aes = await crypto.subtle.importKey(
        'raw',
        aesBytes,
        'AES-GCM',
        false,
        ['decrypt'],
      );
      const webCryptoCiphertext = new Uint8Array(ciphertext.length + tag.length);
      webCryptoCiphertext.set(ciphertext);
      webCryptoCiphertext.set(tag, ciphertext.length);
      plaintext = new Uint8Array(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 },
          aes,
          webCryptoCiphertext,
        ),
      );
      return Array.from(plaintext);
    } finally {
      keyBytes.fill(0);
      aesBytes?.fill(0);
      plaintext?.fill(0);
    }
  },
  decodeBase64URL,
  encodeBase64URL,
};
