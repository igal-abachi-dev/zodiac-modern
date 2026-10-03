import { MAX_MESSAGE_BYTES } from '../crypto/profile';
export class InputError extends Error {}
export function validateText(text: string): void {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff))
        throw new InputError('Message contains an unpaired UTF-16 surrogate.');
    } else if (code >= 0xdc00 && code <= 0xdfff)
      throw new InputError('Message contains an unpaired UTF-16 surrogate.');
  }
}
export function utf8ByteLength(text: string): number {
  validateText(text);
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) count++;
    else if (code < 0x800) count += 2;
    else if (code < 0xd800 || code > 0xdbff) count += 3;
    else {
      count += 4;
      i++;
    }
  }
  return count;
}
export function validateMessage(text: string, allowEmpty = false): number {
  const bytes = utf8ByteLength(text);
  if (!allowEmpty && bytes === 0)
    throw new InputError('Enter a message before encrypting.');
  if (bytes > MAX_MESSAGE_BYTES)
    throw new InputError('Message exceeds 65,536 UTF-8 bytes.');
  return bytes;
}
export function encodeMessage(text: string): Uint8Array<ArrayBuffer> {
  validateMessage(text, true);
  return new TextEncoder().encode(text);
}
