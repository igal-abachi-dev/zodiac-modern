export type RecipientKey = {
  key: CryptoKey;
  bits: 3072 | 4096;
  fingerprint: string;
};
export async function importPublicKey(pem: string): Promise<RecipientKey> {
  if (new TextEncoder().encode(pem).length > 16384)
    throw new Error('Public PEM exceeds limit.');
  const match =
    /^[ \t\r\n]*-----BEGIN PUBLIC KEY-----\r?\n([A-Za-z0-9+/=\r\n]+)-----END PUBLIC KEY-----[ \t\r\n]*$/.exec(
      pem,
    );
  if (!match?.[1]) throw new Error('Supply exactly one SPKI PUBLIC KEY PEM.');
  const base64 = match[1].replace(/[\r\n]/g, '');
  const der = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  if (
    btoa(Array.from(der, (byte) => String.fromCharCode(byte)).join('')) !==
    base64
  )
    throw new Error('Invalid PEM Base64.');
  const key = await crypto.subtle.importKey(
    'spki',
    der,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt'],
  );
  const algorithm = key.algorithm as RsaHashedKeyAlgorithm;
  if (
    (algorithm.modulusLength !== 3072 && algorithm.modulusLength !== 4096) ||
    algorithm.publicExponent.length !== 3 ||
    algorithm.publicExponent[0] !== 1 ||
    algorithm.publicExponent[1] !== 0 ||
    algorithm.publicExponent[2] !== 1
  )
    throw new Error('RSA-3072/4096 with exponent 65537 required.');
  const canonical = new Uint8Array(await crypto.subtle.exportKey('spki', key));
  if (
    canonical.length !== der.length ||
    canonical.some((byte, i) => byte !== der[i])
  )
    throw new Error('SPKI must be canonical complete DER.');
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', canonical),
  );
  return {
    key,
    bits: algorithm.modulusLength,
    fingerprint: Array.from(digest, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join(''),
  };
}
