import { defaultRecipient } from '../src/generated/default-recipient';
import { importPublicKey } from '../src/lib/crypto/public-key';
import { encryptMessage } from '../src/lib/crypto/hybrid';
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const publicInput = element<HTMLTextAreaElement>('public-key');
const message = element<HTMLTextAreaElement>('message');
const raw = element<HTMLTextAreaElement>('raw');
const status = element<HTMLParagraphElement>('status');
const encrypt = element<HTMLButtonElement>('encrypt');
let generation = 0;
publicInput.value = defaultRecipient?.pem ?? '';
status.textContent =
  isSecureContext && crypto?.subtle
    ? 'Native WebCrypto is available. Synthetic probe only.'
    : 'Native WebCrypto is unavailable under this browser’s default file settings.';
element<HTMLInputElement>('key-file').addEventListener(
  'change',
  async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const snapshot = ++generation;
    try {
      if (file.size > 16384) throw new Error();
      const pem = await file.text();
      await importPublicKey(pem);
      if (generation === snapshot) publicInput.value = pem;
    } catch {
      status.textContent =
        'Supply one supported PUBLIC KEY PEM, at most 16 KiB.';
    }
  },
);
publicInput.addEventListener('input', () => {
  generation++;
  raw.value = '';
});
encrypt.addEventListener('click', async () => {
  if (encrypt.disabled) return;
  const snapshot = ++generation;
  encrypt.disabled = true;
  try {
    const recipient = await importPublicKey(publicInput.value);
    const result = await encryptMessage(message.value, recipient);
    if (snapshot !== generation) return;
    raw.value = result.raw;
    message.value = '';
    status.textContent = `Synthetic encryption complete. RSA-${recipient.bits}; SHA-256 ${recipient.fingerprint}`;
  } catch {
    if (snapshot === generation)
      status.textContent =
        'Encryption failed. Check WebCrypto, the public key and exact UTF-8 input.';
  } finally {
    encrypt.disabled = false;
  }
});
element('reset').addEventListener('click', () => {
  generation++;
  publicInput.value = '';
  message.value = '';
  raw.value = '';
  element<HTMLInputElement>('key-file').value = '';
  status.textContent =
    'Current fields cleared; browser undo and internal copies cannot be guaranteed erased.';
});
element('copy').addEventListener('click', async () => {
  try {
    if (!raw.value) return;
    await navigator.clipboard.writeText(raw.value);
    status.textContent = 'Raw ciphertext copied.';
  } catch {
    raw.focus();
    raw.select();
    status.textContent =
      'Clipboard unavailable. Copy the selected raw text manually.';
  }
});
element('download').addEventListener('click', () => {
  if (!raw.value) return;
  const url = URL.createObjectURL(
    new Blob([raw.value], { type: 'text/plain;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'zodiac-ciphertext-synthetic.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
