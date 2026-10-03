// Public key export is explicit, local and separate from message exports.
export function downloadPublicKey(pem: string): void {
  const url = URL.createObjectURL(
    new Blob([pem], { type: 'application/x-pem-file' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'recipient-public.pem';
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
