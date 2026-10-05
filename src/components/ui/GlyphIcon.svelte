<script lang="ts">
  import type { Glyph } from '../../lib/symbols/manifest';
  let { glyph, size = 24 }: { glyph: Pick<Glyph, 'nodes'>; size?: 16 | 24 } =
    $props();
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  {#each glyph.nodes as [tag, attributes]}<svelte:element
      this={tag}
      {...attributes}
    />{/each}
</svg>
