export type PublicRecipientData = {
  name: string;
  pem: string;
  bits: 3072 | 4096;
  fingerprint: string;
  source: 'production' | 'fixture';
};
