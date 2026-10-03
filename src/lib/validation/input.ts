export function validateText(text: string): void {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff))
        throw new Error('Unpaired UTF-16 surrogate.');
    } else if (code >= 0xdc00 && code <= 0xdfff)
      throw new Error('Unpaired UTF-16 surrogate.');
  }
}
export function encodeMessage(text: string): Uint8Array<ArrayBuffer> {
  validateText(text);
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 65536) {
    bytes.fill(0);
    throw new Error('Message exceeds 65536 UTF-8 bytes.');
  }
  return bytes;
}
