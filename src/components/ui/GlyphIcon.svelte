<script lang="ts">
  import type { Glyph } from '../../lib/symbols/manifest';
  let { glyph }: { glyph: Glyph } = $props();
</script>

<svg
  viewBox="0 0 24 24"
  width="24"
  height="24"
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
