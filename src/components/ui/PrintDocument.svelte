<script lang="ts">
  import type { ExportBundle } from '../../lib/export/layout';
  import { pageSVG } from '../../lib/export/svg';
  let { bundle, pages }: { bundle: ExportBundle; pages: readonly number[] } =
    $props();
</script>

<div class="print-document" dir="ltr">
  {#each pages as page}
    <section class="print-page" aria-label={`Archival page ${page + 1}`}>
      {@html pageSVG(bundle, page, pages.length !== bundle.pages.length)}
    </section>
  {/each}
</div>

<style>
  .print-document {
    display: none;
  }
  @media print {
    @page {
      margin: 20mm;
    }
    :global(body.print-active) {
      margin: 0;
      background: #fff;
      color: #000;
    }
    :global(body.print-active > :not(.zodiac-print-root)) {
      display: none !important;
    }
    :global(body:not(.print-active) > *) {
      display: none !important;
    }
    .print-document {
      display: block;
      margin: 0;
      width: 170mm;
    }
    .print-page {
      break-after: page;
      break-inside: avoid;
      width: 170mm;
    }
    .print-page :global(svg) {
      display: block;
      width: 170mm;
      height: 236mm;
    }
  }
</style>
