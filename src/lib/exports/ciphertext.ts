// Explicit public ciphertext export. Clipboard/files persist outside tab state.
export function downloadCiphertext(raw: string): void {
  const url = URL.createObjectURL(
    new Blob([raw], { type: 'text/plain;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'ciphertext.txt';
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
