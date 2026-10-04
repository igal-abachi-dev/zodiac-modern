import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { checkArtifact } from '../../scripts/check-artifact.mjs';
it('allows user-directed documentation links but rejects remote runtime assets', async () => {
  const root = mkdtempSync(resolve('.cache/artifact-resources-'));
  try {
    writeFileSync(
      `${root}/index.html`,
      '<a href="https://example.com/documentation">Documentation</a>',
    );
    await expect(checkArtifact(root, 'custom')).resolves.toBeUndefined();
    for (const asset of [
      '<script src="https://example.com/run.js"></script>',
      '<link rel="stylesheet" href="https://example.com/theme.css">',
      '<img src="//example.com/image.png">',
      '<svg><use href="https://example.com/icons.svg#icon"></use></svg>',
      '<style>body { background: url(https://example.com/image.png) }</style>',
    ]) {
      writeFileSync(`${root}/index.html`, asset);
      await expect(checkArtifact(root, 'custom')).rejects.toThrow(
        'Remote runtime resource',
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
