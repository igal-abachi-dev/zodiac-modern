<script lang="ts">
  import { onMount } from 'svelte';
  import type { ArtworkResult, ExportBundle } from '../../lib/export/layout';
  import {
    exportBundle,
    compactLayout,
    metadata,
  } from '../../lib/export/layout';
  import {
    oneLineSVG,
    pageSVG,
    compactSVG,
    archivalPNGSource,
    PNG_NOTICE_HEIGHT,
  } from '../../lib/export/svg';
  import { rasterizePNG } from '../../lib/export/png';
  import { downloadBlob } from '../../lib/export/downloads';
  import { imageClipboardAvailable, copyPNG } from '../../lib/export/clipboard';
  import { preparePrint, type PrintSession } from '../../lib/export/print';
  let { result }: { result: ArtworkResult } = $props();
  let selectedPage = $state(1),
    scope = $state('all'),
    notice = $state(''),
    busy = $state(false);
  let ready = $state(false),
    imageCopySupported = $state(false),
    fallbackURL = $state('');
  let alive = true,
    printSession: PrintSession | undefined;
  const abort = new AbortController();
  let bundlePromise: Promise<ExportBundle> | undefined;
  const pageCount = $derived(Math.ceil(result.raw.length / 512));
  const complete = $derived(
    !!compactLayout(result.raw.length, PNG_NOTICE_HEIGHT),
  );
  const pageIndex = $derived(
    Number.isSafeInteger(selectedPage) &&
      selectedPage >= 1 &&
      selectedPage <= pageCount
      ? selectedPage - 1
      : 0,
  );
  const pageValid = $derived(
    Number.isSafeInteger(selectedPage) &&
      selectedPage >= 1 &&
      selectedPage <= pageCount,
  );
  const imageLabel = $derived(
    complete
      ? 'Copy artwork image'
      : `Copy artwork page ${pageIndex + 1} of ${pageCount}`,
  );
  onMount(() => {
    ready = true;
    imageCopySupported = imageClipboardAvailable();
    return () => {
      alive = false;
      abort.abort();
      printSession?.close();
      if (fallbackURL) URL.revokeObjectURL(fallbackURL);
      bundlePromise = undefined;
    };
  });
  function bundle(): Promise<ExportBundle> {
    return (bundlePromise ??= exportBundle(result).catch((error) => {
      bundlePromise = undefined;
      throw error;
    }));
  }
  async function png(pageOnly = false): Promise<Blob> {
    const index = pageIndex,
      useComplete = complete && !pageOnly;
    const data = await bundle();
    abort.signal.throwIfAborted();
    const source = useComplete
      ? compactSVG(data)
      : archivalPNGSource(data, index);
    if (!source) throw Error('Choose a bounded artwork page.');
    return rasterizePNG(source, abort.signal);
  }
  async function action(run: () => Promise<void>, success: string) {
    if (busy) return;
    busy = true;
    notice = '';
    try {
      await run();
      if (alive) notice = success;
    } catch {
      if (alive)
        notice =
          'Artwork action unavailable. Keep ciphertext.txt; SVG and PNG downloads remain available. Retry or copy the raw text manually.';
    } finally {
      if (alive) busy = false;
    }
  }
  function saveSVG(full: boolean) {
    const index = pageIndex;
    void action(async () => {
      const data = await bundle();
      abort.signal.throwIfAborted();
      downloadBlob(
        new Blob([full ? oneLineSVG(data) : pageSVG(data, index)], {
          type: 'image/svg+xml',
        }),
        full
          ? 'ciphertext-strip.svg'
          : `ciphertext-page-${index + 1}-of-${pageCount}.svg`,
      );
    }, 'Artwork download requested. Attach ciphertext.txt too.');
  }
  function savePNG(pageOnly = false) {
    const filename =
      complete && !pageOnly
        ? 'ciphertext-artwork.png'
        : `ciphertext-page-${pageIndex + 1}-of-${pageCount}.png`;
    void action(async () => {
      const blob = await png(pageOnly);
      abort.signal.throwIfAborted();
      downloadBlob(blob, filename);
    }, 'PNG download requested. Attach ciphertext.txt too.');
  }
  function copyImage() {
    if (busy) return;
    const prepared = png();
    // write() executes synchronously in this user gesture, before the PNG resolves.
    const write = copyPNG(prepared);
    void action(async () => {
      try {
        await write;
      } catch (error) {
        const blob = await prepared;
        if (alive) {
          if (fallbackURL) URL.revokeObjectURL(fallbackURL);
          fallbackURL = URL.createObjectURL(blob);
        }
        throw error;
      }
    }, 'Artwork image copied. Paste it into your draft, then include raw ciphertext separately. Clipboard contents persist outside this tab.');
  }
  function print() {
    const pages =
      scope === 'all'
        ? Array.from({ length: pageCount }, (_, i) => i)
        : [pageIndex];
    void action(async () => {
      const data = await bundle();
      abort.signal.throwIfAborted();
      printSession?.close();
      printSession = await preparePrint(data, pages);
      if (!alive) {
        printSession.close();
        return;
      }
      try {
        window.print();
      } catch (error) {
        printSession.close();
        throw error;
      }
    }, 'Print dialog opened. Saving or cancelling is controlled by your browser; your ciphertext remains available.');
  }
</script>

<div class="export-menu" aria-busy={busy}>
  <p>
    Attach ciphertext.txt too. The receiver cannot decrypt this image or SVG.
    Images and saved files persist outside this tab.
  </p>
  <p>
    {#if complete}The complete mixed artwork fits one PNG.{:else}The complete
      artwork exceeds image bounds. PNG exports contain only the selected
      archival page.{/if} The full one-line SVG always includes all {result.raw
      .length} characters.
  </p>
  <div class="export-actions">
    <button
      type="button"
      class="secondary"
      disabled={!ready ||
        busy ||
        !imageCopySupported ||
        (!complete && !pageValid)}
      onclick={copyImage}>{imageLabel}</button
    >
    <button
      type="button"
      class="secondary"
      disabled={!ready || busy || (!complete && !pageValid)}
      onclick={() => savePNG()}
      >{complete
        ? 'Download complete artwork PNG'
        : `Download artwork page ${pageIndex + 1} of ${pageCount} PNG`}</button
    >
    <button
      type="button"
      class="secondary"
      disabled={!ready || busy}
      onclick={() => saveSVG(true)}>Download full one-line SVG</button
    >
    <button
      type="button"
      class="secondary"
      disabled={!ready || busy}
      onclick={() =>
        action(async () => {
          const data = await bundle();
          abort.signal.throwIfAborted();
          downloadBlob(
            new Blob([JSON.stringify(metadata(data), null, 2)], {
              type: 'application/json',
            }),
            'ciphertext-metadata.json',
          );
        }, 'Separate public metadata download requested. It contains ciphertext and public checks, not your message.')}
      >Download metadata JSON</button
    >
  </div>
  {#if ready && !imageCopySupported}<p>
      Image clipboard support is unavailable in this context. Download PNG and
      attach it; use Copy raw separately.
    </p>{/if}
  {#if fallbackURL}<figure>
      <img
        src={fallbackURL}
        alt="Locally generated ciphertext artwork for saving after clipboard denial"
      />
      <figcaption>
        Image copy was denied. Save this local image or download PNG, then
        attach ciphertext.txt separately.
      </figcaption>
    </figure>{/if}
  <details>
    <summary>Archival pages and print</summary>
    <p>
      Archival pages use the original frozen symbol alphabet, with 512 payload
      characters per page and readable raw rows/checks. They do not insert
      mixed-view letters or nulls.
    </p>
    <label for="artwork-page">Archival page (1–{pageCount})</label>
    <input
      id="artwork-page"
      type="number"
      min="1"
      max={pageCount}
      step="1"
      bind:value={selectedPage}
      disabled={busy}
    />
    {#if !pageValid}<p role="alert">
        Enter a whole archival page number from 1 to {pageCount}.
      </p>{/if}
    <div class="export-actions">
      <button
        type="button"
        class="secondary"
        disabled={!ready || busy || !pageValid}
        onclick={() => saveSVG(false)}>Download archival page SVG</button
      >
      <button
        type="button"
        class="secondary"
        disabled={!ready || busy || !pageValid}
        onclick={() => savePNG(true)}>Download archival page PNG</button
      >
    </div>
    <label for="print-scope">Print scope</label>
    <select id="print-scope" bind:value={scope} disabled={busy}
      ><option value="all">All ciphertext pages</option><option value="selected"
        >Selected page only (partial)</option
      ></select
    >
    <p>
      {scope === 'all'
        ? `Print all ${pageCount} ciphertext pages`
        : `PARTIAL: print page ${pageIndex + 1} of ${pageCount}`} plus an attribution/license
      sheet. All raw chunks are required for recovery. Choose A4 or Letter with 20
      mm margins; turn off browser headers/footers.
    </p>
    <button
      type="button"
      class="secondary"
      disabled={!ready || busy || (scope === 'selected' && !pageValid)}
      onclick={print}>Print / Save as PDF</button
    >
    <button
      type="button"
      class="secondary"
      onclick={() => {
        printSession?.close();
        notice =
          'Temporary print document removed. Your ciphertext remains available.';
      }}>Close print document</button
    >
  </details>
  <p role="status" aria-live="polite">{notice}</p>
</div>

<style>
  .export-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-block: 1rem;
  }
  input,
  select {
    max-width: 100%;
    margin-block: 0.5rem;
    font: inherit;
    min-height: 44px;
  }
  img {
    display: block;
    max-width: 100%;
    height: auto;
  }
  figure {
    margin-inline: 0;
  }
</style>
