import { decodeBase64URL } from '../codecs/base64url';

export type RecipientKey = {
  key: CryptoKey;
  bits: 3072 | 4096;
  fingerprint: string;
};
export const MAX_PUBLIC_PEM_BYTES = 16384;
type PublicKeyErrorCode =
  'too-large' | 'format' | 'unsupported' | 'noncanonical' | 'unavailable';
const messages: Record<PublicKeyErrorCode, string> = {
  'too-large':
    'Public key must be one SPKI PUBLIC KEY PEM no larger than 16 KiB.',
  format:
    'Supply exactly one valid SPKI PUBLIC KEY PEM. Private keys, certificates and PKCS#1 RSA PUBLIC KEY files are not accepted.',
  unsupported:
    'Use an RSA-3072 or RSA-4096 SPKI PUBLIC KEY with exponent 65537.',
  noncanonical:
    'The public key must contain one complete canonical SPKI DER object encoded as canonical PEM Base64.',
  unavailable:
    'Public-key import requires a secure context and native WebCrypto.',
};
export class PublicKeyImportError extends Error {
  constructor(public readonly code: PublicKeyErrorCode) {
    super(messages[code]);
    this.name = 'PublicKeyImportError';
  }
}
export async function importPublicKey(pem: string): Promise<RecipientKey> {
  // Reject a large JS string before allocating its UTF-8 encoding. Accepted
  // PEM grammar is ASCII, so code-unit length is its exact byte length.
  if (typeof pem !== 'string') throw new PublicKeyImportError('format');
  if (pem.length > MAX_PUBLIC_PEM_BYTES)
    throw new PublicKeyImportError('too-large');
  const match =
    /^[ \t\r\n]*-----BEGIN PUBLIC KEY-----\r?\n([A-Za-z0-9+/=\r\n]+)-----END PUBLIC KEY-----[ \t\r\n]*$/.exec(
      pem,
    );
  if (!match?.[1]) throw new PublicKeyImportError('format');
  const base64 = match[1].replace(/[\r\n]/g, '');
  let der: Uint8Array<ArrayBuffer>;
  try {
    der = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  } catch {
    throw new PublicKeyImportError('format');
  }
  if (
    btoa(Array.from(der, (byte) => String.fromCharCode(byte)).join('')) !==
    base64
  )
    throw new PublicKeyImportError('noncanonical');
  const subtle = globalThis.crypto?.subtle;
  if (!globalThis.isSecureContext || !subtle)
    throw new PublicKeyImportError('unavailable');
  let key: CryptoKey;
  try {
    // Extractability is intentional for public SPKI canonicalization. Ephemeral
    // AES key imports use a separate nonextractable policy in hybrid.ts.
    key = await subtle.importKey(
      'spki',
      der,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt'],
    );
  } catch {
    throw new PublicKeyImportError('format');
  }
  const algorithm = key.algorithm as RsaHashedKeyAlgorithm;
  if (
    (algorithm.modulusLength !== 3072 && algorithm.modulusLength !== 4096) ||
    algorithm.publicExponent.length !== 3 ||
    algorithm.publicExponent[0] !== 1 ||
    algorithm.publicExponent[1] !== 0 ||
    algorithm.publicExponent[2] !== 1
  )
    throw new PublicKeyImportError('unsupported');
  let publicJWK: JsonWebKey;
  try {
    publicJWK = await subtle.exportKey('jwk', key);
  } catch {
    throw new PublicKeyImportError('unavailable');
  }
  // Firefox can round algorithm.modulusLength to a whole-byte boundary. Check
  // the actual native-exported integer: exactly 384/512 bytes with its top bit
  // set. This is a representation check, not a custom ASN.1/RSA implementation.
  if (
    publicJWK.kty !== 'RSA' ||
    publicJWK.e !== 'AQAB' ||
    typeof publicJWK.n !== 'string' ||
    publicJWK.n.length > 683
  )
    throw new PublicKeyImportError('unsupported');
  let modulus: Uint8Array;
  try {
    modulus = decodeBase64URL(publicJWK.n);
  } catch {
    throw new PublicKeyImportError('unsupported');
  }
  if (
    (modulus.length !== 384 && modulus.length !== 512) ||
    (modulus[0]! & 0x80) === 0 ||
    algorithm.modulusLength !== modulus.length * 8
  )
    throw new PublicKeyImportError('unsupported');
  let canonical: Uint8Array<ArrayBuffer>;
  try {
    canonical = new Uint8Array(await subtle.exportKey('spki', key));
  } catch {
    throw new PublicKeyImportError('unavailable');
  }
  if (
    canonical.length !== der.length ||
    canonical.some((byte, i) => byte !== der[i])
  )
    throw new PublicKeyImportError('noncanonical');
  let digest: Uint8Array<ArrayBuffer>;
  try {
    digest = new Uint8Array(await subtle.digest('SHA-256', canonical));
  } catch {
    throw new PublicKeyImportError('unavailable');
  }
  return {
    key,
    bits: (modulus.length * 8) as 3072 | 4096,
    fingerprint: Array.from(digest, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join(''),
  };
}
