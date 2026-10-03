import { encryptMessage, EncryptionError } from './hybrid';
import { InputError, validateMessage } from '../validation/input';
import type { SelectedRecipient } from '../../types/recipient';

export type RecipientSnapshot = Readonly<
  Pick<
    SelectedRecipient,
    'name' | 'bits' | 'fingerprint' | 'source' | 'filename'
  >
>;
export type MessageResult = Readonly<{
  raw: string;
  checksum: string;
  recipient: RecipientSnapshot;
  plaintextBytes: number;
}>;
export type WorkspaceState = Readonly<{
  phase: 'editing' | 'encrypting' | 'result' | 'error';
  draft: string;
  recipient: SelectedRecipient | null;
  result: MessageResult | null;
  error: string;
}>;
type Encrypt = typeof encryptMessage;
type Digest = (bytes: Uint8Array<ArrayBuffer>) => Promise<string>;
async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}
// In-memory operation state. Test adapters exercise races/failures separately
// from real-browser native WebCrypto interoperability.
export class Workspace {
  #state: WorkspaceState = Object.freeze({
    phase: 'editing',
    draft: '',
    recipient: null,
    result: null,
    error: '',
  });
  #generation = 0;
  #listeners = new Set<(state: WorkspaceState) => void>();
  constructor(
    private readonly encrypt: Encrypt = encryptMessage,
    private readonly digest: Digest = sha256,
  ) {}
  get state(): WorkspaceState {
    return this.#state;
  }
  subscribe(listener: (state: WorkspaceState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => {
      this.#listeners.delete(listener);
    };
  }
  #publish(patch: Partial<WorkspaceState>): void {
    this.#state = Object.freeze({ ...this.#state, ...patch });
    for (const listener of this.#listeners) listener(this.#state);
  }
  setDraft(draft: string): void {
    if (this.#state.phase === 'encrypting' || this.#state.result) return;
    this.#publish({ draft, phase: 'editing', error: '' });
  }
  selectRecipient(recipient: SelectedRecipient | null): void {
    if (this.#state.phase === 'encrypting' || this.#state.result) return;
    this.#publish({ recipient, phase: 'editing', error: '' });
  }
  async submit(): Promise<boolean> {
    if (this.#state.phase === 'encrypting' || this.#state.result) return false;
    const recipient = this.#state.recipient;
    if (!recipient) {
      this.#publish({
        phase: 'error',
        error: 'Choose a validated public recipient first.',
      });
      return false;
    }
    let plaintextBytes: number;
    try {
      plaintextBytes = validateMessage(this.#state.draft);
    } catch (error) {
      this.#publish({
        phase: 'error',
        error:
          error instanceof InputError
            ? error.message
            : 'Unable to validate this message.',
      });
      return false;
    }
    const id = ++this.#generation;
    const snapshot: RecipientSnapshot = Object.freeze({
      name: recipient.name,
      bits: recipient.bits,
      fingerprint: recipient.fingerprint,
      source: recipient.source,
      ...(recipient.filename ? { filename: recipient.filename } : {}),
    });
    this.#publish({ phase: 'encrypting', error: '' });
    try {
      const encrypted = await this.encrypt(this.#state.draft, recipient);
      if (id !== this.#generation) return false;
      const checksum = await this.digest(encrypted.envelope);
      if (id !== this.#generation) return false;
      this.#publish({
        phase: 'result',
        draft: '',
        result: Object.freeze({
          raw: encrypted.raw,
          checksum,
          recipient: snapshot,
          plaintextBytes,
        }),
      });
      return true;
    } catch (error) {
      if (id !== this.#generation) return false;
      this.#publish({
        phase: 'error',
        result: null,
        error:
          error instanceof EncryptionError || error instanceof InputError
            ? error.message
            : 'Unable to encrypt locally. Your draft is available for retry.',
      });
      return false;
    }
  }
  anotherMessage(): void {
    if (this.#state.phase === 'encrypting') return;
    this.#generation++;
    this.#publish({ phase: 'editing', draft: '', result: null, error: '' });
  }
  clear(): void {
    this.#generation++;
    this.#publish({
      phase: 'editing',
      draft: '',
      recipient: null,
      result: null,
      error: '',
    });
  }
}
