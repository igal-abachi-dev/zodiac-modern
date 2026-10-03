import { createHash, createPublicKey } from 'node:crypto';

export function validatePublicPEM(pem) {
  if (typeof pem !== 'string' || Buffer.byteLength(pem) > 16384)
    throw new Error('Public PEM exceeds limit.');
  const match =
    /^[ \t\r\n]*-----BEGIN PUBLIC KEY-----\r?\n([A-Za-z0-9+/=\r\n]+)-----END PUBLIC KEY-----[ \t\r\n]*$/.exec(
      pem,
    );
  if (!match) throw new Error('Supply exactly one SPKI PUBLIC KEY PEM.');
  const base64 = match[1].replace(/[\r\n]/g, '');
  const der = Buffer.from(base64, 'base64');
  if (der.toString('base64') !== base64) throw new Error('Invalid PEM Base64.');
  const key = createPublicKey({ key: der, format: 'der', type: 'spki' });
  const bits = key.asymmetricKeyDetails?.modulusLength;
  if (
    key.asymmetricKeyType !== 'rsa' ||
    (bits !== 3072 && bits !== 4096) ||
    key.asymmetricKeyDetails.publicExponent !== 65537n
  )
    throw new Error('RSA-3072/4096 with exponent 65537 required.');
  const canonical = key.export({ format: 'der', type: 'spki' });
  if (!canonical.equals(der))
    throw new Error('SPKI must contain exactly one canonical DER object.');
  return {
    pem: key.export({ format: 'pem', type: 'spki' }).toString(),
    bits,
    fingerprint: createHash('sha256').update(canonical).digest('hex'),
  };
}
