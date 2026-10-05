import { RASTER_LIMIT, RASTER_PIXELS } from './layout';
export async function rasterizePNG(
  source: { svg: string; width: number; height: number },
  signal?: AbortSignal,
): Promise<Blob> {
  if (
    ![source.width, source.height].every(
      (n) => Number.isSafeInteger(n) && n > 0 && n <= RASTER_LIMIT,
    ) ||
    source.width * source.height > RASTER_PIXELS
  )
    throw Error('Artwork exceeds bitmap bounds.');
  signal?.throwIfAborted();
  const url = URL.createObjectURL(
    new Blob([source.svg], { type: 'image/svg+xml' }),
  );
  const canvas = document.createElement('canvas'),
    image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => finish(new Error('Artwork cancelled.'));
      const finish = (error?: Error) => {
        signal?.removeEventListener('abort', abort);
        error ? reject(error) : resolve();
      };
      signal?.addEventListener('abort', abort, { once: true });
      image.onload = () => finish();
      image.onerror = () => finish(new Error('Artwork rendering failed.'));
      image.src = url;
    });
    signal?.throwIfAborted();
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    if (!context) throw Error('Artwork canvas unavailable.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, source.width, source.height);
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(new Error('PNG encoding failed.')),
        'image/png',
      ),
    );
    signal?.throwIfAborted();
    return blob;
  } finally {
    image.onload = image.onerror = null;
    image.removeAttribute('src');
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 0;
  }
}
