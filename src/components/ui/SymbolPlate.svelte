<script lang="ts">
  import {
    GLYPHS,
    PREVIEW_CHARACTERS,
    glyphSequence,
  } from '../../lib/symbols/manifest';
  import GlyphIcon from './GlyphIcon.svelte';
  import GlyphLicense from './GlyphLicense.svelte';
  let { raw }: { raw: string } = $props();
  let page = $state(0);
  const pageCount = $derived(Math.ceil(raw.length / PREVIEW_CHARACTERS));
  const selected = $derived(Math.min(page, Math.max(0, pageCount - 1)));
  const offset = $derived(selected * PREVIEW_CHARACTERS);
  const glyphs = $derived(
    glyphSequence(raw.slice(offset, offset + PREVIEW_CHARACTERS)),
  );
</script>

<section aria-label="Celestial glyph plate">
  <p>
    Celestial map S64L1 · Characters {offset + 1}–{offset + glyphs.length} of {raw.length}
    · Preview {selected + 1} of {pageCount}
  </p>
  <p>
    Glyphs are reversible presentation, not extra security. Send the raw
    ciphertext or .txt file too. The receiver cannot decrypt an image or SVG.
  </p>
  <div class="glyph-plate" dir="ltr" aria-hidden="true">
    {#each glyphs as glyph, index}<span
        class="glyph-cell"
        data-character={glyph.character}
        data-offset={offset + index}><GlyphIcon {glyph} /></span
      >{/each}
  </div>
  <div class="plate-controls">
    <button
      type="button"
      disabled={selected === 0}
      onclick={() => (page = selected - 1)}>Previous glyph page</button
    >
    <button
      type="button"
      disabled={selected + 1 >= pageCount}
      onclick={() => (page = selected + 1)}>Next glyph page</button
    >
  </div>
  <p class="muted">
    Preview rows use 16 columns, or 8 on small screens. Global character offsets
    stay fixed; archival recovery uses 512-character pages and 16-character
    rows. Raw copy/download always includes the entire result.
  </p>
  <details>
    <summary>Glyph legend: all 64 characters</summary>
    <ul class="glyph-legend" dir="ltr">
      {#each GLYPHS as glyph}<li>
          <GlyphIcon {glyph} /><code>{glyph.character}</code><span
            >{glyph.name}</span
          >
        </li>{/each}
    </ul>
    <p>
      Similar outlines are intentional: Star/Sparkle, CircleDot/Target/Disc,
      Scan/Focus and Sparkles/MoonStar need care when transcribing. Use printed
      raw rows and their checks rather than relying on icon recognition.
    </p>
  </details>
  <GlyphLicense />
</section>

<style>
  .glyph-plate {
    display: grid;
    grid-template-columns: repeat(16, minmax(0, 1fr));
    gap: 0.25rem;
    max-width: 48rem;
    margin-block: 1rem;
  }
  .glyph-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.25rem;
  }
  .glyph-cell:nth-child(32n + 1),
  .glyph-cell:nth-child(32n + 2),
  .glyph-cell:nth-child(32n + 3),
  .glyph-cell:nth-child(32n + 4),
  .glyph-cell:nth-child(32n + 5),
  .glyph-cell:nth-child(32n + 6),
  .glyph-cell:nth-child(32n + 7),
  .glyph-cell:nth-child(32n + 8),
  .glyph-cell:nth-child(32n + 9),
  .glyph-cell:nth-child(32n + 10),
  .glyph-cell:nth-child(32n + 11),
  .glyph-cell:nth-child(32n + 12),
  .glyph-cell:nth-child(32n + 13),
  .glyph-cell:nth-child(32n + 14),
  .glyph-cell:nth-child(32n + 15),
  .glyph-cell:nth-child(32n + 16) {
    background: var(--color-bg);
  }
  .plate-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .glyph-legend {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    list-style: none;
    padding: 0;
    gap: 0.75rem;
  }
  .glyph-legend li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  @media (max-width: 600px) {
    .glyph-plate {
      grid-template-columns: repeat(8, minmax(0, 1fr));
    }
  }
  @media print {
    .glyph-plate {
      color: #000;
      background: #fff;
    }
    .plate-controls {
      display: none;
    }
  }
</style>
