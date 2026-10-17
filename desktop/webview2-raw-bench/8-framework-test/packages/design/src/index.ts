export const copy = Object.freeze({
  title: 'NeutronStar GUI Bench',
  subtitle: 'A UI-only simulation for comparing desktop frontends.',
  badge: 'SIMULATION · NO FILES OR CRYPTOGRAPHY.',
  about: 'About this test',
  aboutText:
    'Actions are UI-only simulations. No files, cryptography, Go CLI, network or native bridge are involved.',
  privacy:
    'Local interface. Synthetic data. Nothing is encrypted or decrypted.',
});
export { allowedDialogMetadata } from './style-policy';
export const dialogOptions = {
  id: 'about',
  ids: {
    trigger: 'about-trigger',
    content: 'about-content',
    title: 'about-title',
    description: 'about-description',
    closeTrigger: 'about-close',
  },
  modal: false,
  trapFocus: true,
  preventScroll: false,
  restoreFocus: true,
  closeOnEscape: true,
  closeOnInteractOutside: true,
  initialFocusEl: () => document.getElementById('about-close'),
  finalFocusEl: () => document.getElementById('about-trigger'),
};
// Public Ark/Zag props retain events, refs, ARIA and IDs. External CSS supplies
// geometry; no generated inline style is ever attached to the DOM.
export function cssProps<T extends object>(props: T): Omit<T, 'style'> {
  const { style: _, ...rest } = props as T & { style?: unknown };
  return rest;
}
export async function assetsReady(): Promise<void> {
  await Promise.all([
    document.fonts.load('400 14px Inter'),
    document.fonts.load('500 14px Inter'),
    document.fonts.load('600 24px Inter'),
    document.fonts.load('400 14px "Noto Sans Hebrew"', 'שלום'),
    document.fonts.load('400 14px "Noto Sans Arabic"', 'مرحبًا'),
    ...Array.from(document.images, (image) => image.decode()),
  ]);
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}
