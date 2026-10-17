// User-approved 2026-10-17 exception, identical across all nine renderers.
// One non-nested dialog: these Zag metadata counters must both remain zero.
// User also approved pointer-events:auto on this same content element.
// No body styles, geometry, colors, positioning or arbitrary CSS is allowed.
export function allowedDialogMetadata(
  id: string,
  scope: string | null,
  part: string | null,
  value: string | null,
): boolean {
  if (value === null) return true;
  if (id !== 'about-content' || scope !== 'dialog' || part !== 'content')
    return false;
  const declarations = value
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  return declarations.every(
    (s) =>
      /^(--layer-index|--nested-layer-count)\s*:\s*0$/.test(s) ||
      /^pointer-events\s*:\s*auto$/.test(s),
  );
}
