<script lang="ts">
  import { tick } from 'svelte';
  import { PREVIEW_CHARACTERS } from '../../lib/symbols/manifest';
  import {
    MIXED_VIEW_PROFILE,
    MIXED_VIEW_GLYPHS,
    NULL_GLYPHS,
    mixedViewTokens,
  } from '../../lib/symbols/mixed-view';
  import GlyphIcon from './GlyphIcon.svelte';
  import GlyphLicense from './GlyphLicense.svelte';
  let { raw }: { raw: string } = $props();
  let page = $state(0);
  let compactLegend = $state(false);
  let plate = $state<HTMLDivElement>();
  const pageCount = $derived(Math.ceil(raw.length / PREVIEW_CHARACTERS));
  const selected = $derived(Math.min(page, Math.max(0, pageCount - 1)));
  const offset = $derived(selected * PREVIEW_CHARACTERS);
  const payloadLength = $derived(
    Math.min(PREVIEW_CHARACTERS, raw.length - offset),
  );
  const tokens = $derived(
    mixedViewTokens(raw.slice(offset, offset + PREVIEW_CHARACTERS), offset),
  );
  async function changePage(next: number) {
    page = next;
    await tick();
    plate?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
</script>

<section aria-label="Celestial glyph plate">
  <p>
    Celestial mixed view {MIXED_VIEW_PROFILE} · Characters {offset +
      1}–{offset + payloadLength} of {raw.length}
    · Preview {selected + 1} of {pageCount}
  </p>
  <p>
    Symbols, letters and nulls are visual presentation, not extra security. Send
    the raw ciphertext or .txt file too. The receiver cannot decrypt an image or
    SVG.
  </p>
  <div class="glyph-plate" bind:this={plate} dir="ltr" aria-hidden="true">
    {#each tokens as token}<span
        class="glyph-cell"
        data-kind={token.kind}
        data-glyph={token.kind === 'literal' ? undefined : token.glyph.name}
        data-character={token.kind === 'null' ? undefined : token.character}
        data-offset={token.kind === 'null' ? undefined : token.offset}
        data-after-offset={token.kind === 'null'
          ? token.afterOffset
          : undefined}
        >{#if token.kind === 'literal'}<span
            class="payload-character"
            class:mirrored={token.orientation === 'mirrored'}
            class:rotated={token.orientation === 'rotated'}
            >{token.character}</span
          >{:else}<GlyphIcon glyph={token.glyph} />{/if}</span
      >{/each}
  </div>
  <div class="plate-controls">
    <button
      type="button"
      disabled={selected === 0}
      onclick={() => changePage(0)}>First glyph page</button
    >
    <button
      type="button"
      disabled={selected === 0}
      onclick={() => changePage(selected - 1)}>Previous glyph page</button
    >
    <button
      type="button"
      disabled={selected + 1 >= pageCount}
      onclick={() => changePage(selected + 1)}>Next glyph page</button
    >
    <button
      type="button"
      disabled={selected + 1 >= pageCount}
      onclick={() => changePage(pageCount - 1)}>Last glyph page</button
    >
  </div>
  <p class="muted">
    Preview rows use 16 columns, or 8 on small screens. Global character offsets
    stay fixed. Null cells do not count as payload; archival recovery uses
    512-character pages and 16-character rows. Raw copy/download always includes
    the entire result.
  </p>
  <details>
    <summary>Glyph legend: all 64 characters</summary>
    <button
      type="button"
      aria-pressed={compactLegend}
      onclick={() => (compactLegend = !compactLegend)}
      >Small legend glyphs (16 px)</button
    >
    <ul class="glyph-legend" dir="ltr">
      {#each MIXED_VIEW_GLYPHS as glyph}<li>
          <GlyphIcon {glyph} size={compactLegend ? 16 : 24} /><code
            >{glyph.character}</code
          ><span>{glyph.name}</span>
        </li>{/each}
    </ul>
    <p>
      Raw characters appear at payload positions 1, 5, 9…; one in seven of those
      literal slots is transformed, alternating mirrored and rotated 180°. Read
      these characters normally; they carry payload and are not decoys. After
      every eight payload characters, skip one null, rotating through the three
      shapes below. Nulls encode nothing and are never copied into raw
      ciphertext.
    </p>
    <ul
      class="null-legend"
      aria-label="Null symbols: skip these cells"
      dir="ltr"
    >
      {#each NULL_GLYPHS as glyph}<li>
          <GlyphIcon {glyph} /><span>{glyph.name} · null</span>
        </li>{/each}
    </ul>
    <p>
      CircleDashed is a null in S64M1; j keeps its original Crosshair glyph. The
      original frozen S64L1 alphabet and raw recovery checks stay unchanged.
    </p>
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
  .payload-character {
    display: inline-block;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 1.5rem;
    line-height: 1;
    font-weight: 500;
  }
  .payload-character.mirrored {
    transform: scaleX(-1);
  }
  .payload-character.rotated {
    transform: rotate(180deg);
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
  .glyph-legend,
  .null-legend {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    list-style: none;
    padding: 0;
    gap: 0.75rem;
  }
  .glyph-legend li,
  .null-legend li {
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
