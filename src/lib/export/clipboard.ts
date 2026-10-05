export function imageClipboardAvailable(): boolean {
  return (
    window.isSecureContext &&
    typeof ClipboardItem !== 'undefined' &&
    typeof navigator.clipboard?.write === 'function' &&
    (!ClipboardItem.supports || ClipboardItem.supports('image/png'))
  );
}
// Invoke write in the click turn; the PNG promise retains browser user activation.
export function copyPNG(png: Promise<Blob>): Promise<void> {
  if (!imageClipboardAvailable()) {
    void png.catch(() => {});
    return Promise.reject(new Error('Image clipboard unavailable.'));
  }
  try {
    return navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
  } catch (error) {
    void png.catch(() => {});
    return Promise.reject(error);
  }
}
