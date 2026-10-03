import type { RecipientKey } from '../lib/crypto/public-key';

export type SelectedRecipient = Readonly<
  RecipientKey & {
    name: string;
    pem: string;
    source: 'production' | 'fixture' | 'custom';
    filename?: string;
  }
>;
