import { mount, tick, unmount } from 'svelte';
import PrintDocument from '../../components/ui/PrintDocument.svelte';
import type { ExportBundle } from './layout';
import { integer } from './checks';
export type PrintSession = Readonly<{ close: () => void }>;
// Build only from the immutable export bundle, never the editor/current preview.
export async function preparePrint(
  bundle: ExportBundle,
  pages: readonly number[],
): Promise<PrintSession> {
  if (document.querySelector('.zodiac-print-root'))
    throw Error('A print document is already open.');
  if (
    !pages.length ||
    pages.length > bundle.pages.length ||
    new Set(pages).size !== pages.length ||
    pages.some((p, i) => i > 0 && p <= pages[i - 1]!)
  )
    throw Error('Select ordered unique print pages.');
  pages.forEach((p) => integer(p, bundle.pages.length - 1));
  const root = document.createElement('div');
  root.className = 'zodiac-print-root';
  document.body.append(root);
  const component = mount(PrintDocument, {
    target: root,
    props: { bundle, pages },
  });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    window.removeEventListener('afterprint', close);
    document.body.classList.remove('print-active');
    void unmount(component);
    root.remove();
  };
  try {
    document.body.classList.add('print-active');
    window.addEventListener('afterprint', close);
    await tick();
    return { close };
  } catch (error) {
    close();
    throw error;
  }
}
