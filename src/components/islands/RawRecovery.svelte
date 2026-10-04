<script lang="ts">
  import { onMount, tick, flushSync } from 'svelte';
  import {
    recoverRaw,
    assemblePages,
    parsePrintedRows,
    MAX_RECOVERY_TEXT,
  } from '../../lib/codecs/recovery';
  import {
    CHECK_PROFILE,
    ENCRYPTION_PROFILE,
    checkTranscribedPage,
    type CheckContext,
    type TranscribedPage,
  } from '../../lib/export/checks';
  import { downloadCiphertext } from '../../lib/exports/ciphertext';
  let mode = $state<'raw' | 'rows'>('raw');
  let text = $state(''),
    clean = $state(false);
  let envelopeHash = $state(''),
    fingerprint = $state(''),
    total = $state('');
  let pageLabel = $state('1'),
    pageCode = $state(''),
    rowsText = $state('');
  let pages = $state.raw<readonly TranscribedPage[]>([]);
  let result = $state.raw<Readonly<{ raw: string; checksum: string }> | null>(
    null,
  );
  let notice = $state(''),
    error = $state(''),
    busy = $state(false);
  let generation = 0;
  const expectedPages = $derived(
    /^[1-9][0-9]{0,4}$/.test(total)
      ? Math.ceil(Number(total) / 512)
      : 'enter total length',
  );
  let resultHeading = $state<HTMLHeadingElement>();
  let rawOutput = $state<HTMLTextAreaElement>();
  let fileInput = $state<HTMLInputElement>();
  function invalidate(identity = false) {
    generation++;
    busy = false;
    result = null;
    error = '';
    notice = '';
    if (identity) pages = [];
  }
  function clear() {
    invalidate(true);
    text = '';
    clean = false;
    envelopeHash = '';
    fingerprint = '';
    total = '';
    pageLabel = '1';
    pageCode = '';
    rowsText = '';
    if (fileInput) fileInput.value = '';
    if (rawOutput) rawOutput.value = '';
  }
  function switchMode(next: 'raw' | 'rows') {
    clear();
    mode = next;
  }
  onMount(() => {
    const discard = () => flushSync(clear);
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) discard();
    };
    window.addEventListener('pagehide', discard);
    window.addEventListener('pageshow', restore);
    return () => {
      clear();
      window.removeEventListener('pagehide', discard);
      window.removeEventListener('pageshow', restore);
    };
  });
  function context(): CheckContext {
    if (!/^[1-9][0-9]{0,4}$/.test(total))
      throw Error('Enter the complete printed raw character count.');
    return Object.freeze({
      check: CHECK_PROFILE,
      profile: ENCRYPTION_PROFILE,
      map: 'S64L1',
      envelopeSHA256: envelopeHash,
      recipientFingerprint: fingerprint,
      totalRawCharacters: Number(total),
      pageCount: Math.ceil(Number(total) / 512),
    });
  }
  async function validate() {
    const id = ++generation;
    busy = true;
    result = null;
    error = '';
    notice = '';
    try {
      let recovered: Awaited<ReturnType<typeof recoverRaw>> | null = null;
      if (mode === 'raw') recovered = await recoverRaw(text, clean);
      else {
        if (!/^[1-9][0-9]{0,2}$/.test(pageLabel))
          throw Error('Enter the printed page number.');
        const identity = context(),
          pageIndex = Number(pageLabel) - 1;
        const page: TranscribedPage = Object.freeze({
          pageIndex,
          startOffset: pageIndex * 512,
          checkCode: pageCode,
          rows: parsePrintedRows(rowsText, pageIndex),
        });
        const checked = await checkTranscribedPage(identity, page);
        if (id !== generation) return;
        if (!('raw' in checked)) {
          notice = `${checked.checkedRows} row checks pass on page ${pageLabel}. This page is incomplete; enter every row and its page check before adding it.`;
          return;
        }
        if (pages.some((p) => p.pageIndex === pageIndex))
          throw Error(
            'This page is already added. Clear recovery to replace an accepted page.',
          );
        if (pageIndex !== pages.length)
          throw Error(
            `Add pages in printed order; page ${pages.length + 1} is needed next.`,
          );
        const next = Object.freeze([...pages, page]);
        if (next.length === identity.pageCount)
          recovered = await assemblePages(identity, next);
        if (id !== generation) return;
        pages = next;
        notice = `Page ${pageLabel} checks pass. ${pages.length} of ${identity.pageCount} pages added.`;
        pageLabel = String(pageIndex + 2);
        pageCode = '';
        rowsText = '';
      }
      if (id !== generation) return;
      if (recovered) {
        result = recovered;
        notice =
          'Canonical raw text validated. Public checks are not authentication; use the offline receiver to authenticate and decrypt.';
        await tick();
        if (id === generation) resultHeading?.focus();
      }
    } catch (cause) {
      if (id === generation)
        error =
          cause instanceof Error
            ? cause.message
            : 'Unable to validate locally.';
    } finally {
      if (id === generation) busy = false;
    }
  }
  async function readRawFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement,
      file = input.files?.[0];
    invalidate();
    text = '';
    const id = generation;
    if (!file) return;
    try {
      if (
        !/\.txt$/i.test(file.name) ||
        !['', 'text/plain', 'application/octet-stream'].includes(file.type)
      )
        throw Error(
          'Choose raw ciphertext .txt. SVG, HTML, XML and images cannot be imported; obtain the accompanying raw file or transcribe printed raw rows.',
        );
      if (file.size > MAX_RECOVERY_TEXT)
        throw Error('Raw file exceeds the bounded recovery input limit.');
      const value = new TextDecoder('utf-8', {
        fatal: true,
        ignoreBOM: true,
      }).decode(await file.arrayBuffer());
      if (id === generation) {
        text = value;
        notice =
          'Raw file loaded locally. Validate it; whitespace cleaning requires your explicit choice.';
      }
    } catch (cause) {
      if (id === generation)
        error =
          cause instanceof Error ? cause.message : 'Unable to read raw file.';
    } finally {
      input.value = '';
    }
  }
  async function copy() {
    const captured = result;
    if (!captured) return;
    try {
      await navigator.clipboard.writeText(captured.raw);
      if (result === captured)
        notice =
          'Raw ciphertext copied; the clipboard persists outside this page.';
    } catch {
      if (result !== captured) return;
      notice =
        'Clipboard unavailable. Select and copy the raw ciphertext manually.';
      rawOutput?.focus();
      rawOutput?.select();
    }
  }
</script>

<section class="panel" aria-labelledby="recovery-title" aria-busy={busy}>
  <h2 id="recovery-title">Raw and transcription recovery</h2>
  <p>
    Validate canonical raw ciphertext or check manually transcribed printed rows
    locally. No private key or passphrase is needed. Version 1 cannot import
    SVG, XML, HTML or images and has no OCR.
  </p>
  <div class="recovery-actions" aria-label="Recovery input modes">
    <button
      type="button"
      aria-pressed={mode === 'raw'}
      onclick={() => switchMode('raw')}>Raw text or .txt</button
    >
    <button
      type="button"
      aria-pressed={mode === 'rows'}
      onclick={() => switchMode('rows')}>Printed rows</button
    >
  </div>
  {#if mode === 'raw'}
    <label for="recovery-file">Choose raw ciphertext .txt</label>
    <input
      id="recovery-file"
      type="file"
      accept=".txt,text/plain"
      bind:this={fileInput}
      onchange={readRawFile}
    />
    <label for="recovery-text">Paste raw ciphertext</label>
    <textarea
      id="recovery-text"
      bind:value={text}
      oninput={() => invalidate()}
      maxlength={MAX_RECOVERY_TEXT}
      autocomplete="off"
      spellcheck="false"
      dir="ltr"></textarea>
    <label class="inline-label"
      ><input
        type="checkbox"
        bind:checked={clean}
        onchange={() => invalidate()}
      /> Remove ASCII spaces, tabs and line breaks before validation</label
    >
    <p>
      Cleaning is optional presentation handling. Padding, a BOM, Unicode
      whitespace and noncanonical pad bits remain invalid. Output contains only
      the exact canonical Base64URL; the receiver does not strip whitespace.
    </p>
  {:else}
    <p>
      Use the full identity printed with the pages: S64CHECK1 · {ENCRYPTION_PROFILE}
      · S64L1. Changing identity clears all added pages. Add pages in printed order;
      schema positions are zero-based, printed labels below are one-based.
    </p>
    <label for="recovery-envelope">Printed whole-envelope SHA-256</label>
    <input
      id="recovery-envelope"
      bind:value={envelopeHash}
      oninput={() => invalidate(true)}
      maxlength="64"
      autocomplete="off"
      spellcheck="false"
    />
    <label for="recovery-fingerprint"
      >Printed recipient fingerprint (full SHA-256)</label
    >
    <input
      id="recovery-fingerprint"
      bind:value={fingerprint}
      oninput={() => invalidate(true)}
      maxlength="64"
      autocomplete="off"
      spellcheck="false"
    />
    <label for="recovery-total">Printed total raw characters</label>
    <input
      id="recovery-total"
      bind:value={total}
      oninput={() => invalidate(true)}
      inputmode="numeric"
      maxlength="5"
      autocomplete="off"
    />
    <p>Added pages: {pages.length}. Expected page count: {expectedPages}.</p>
    <label for="recovery-page">Printed page number (starts at 1)</label>
    <input
      id="recovery-page"
      bind:value={pageLabel}
      oninput={() => invalidate()}
      inputmode="numeric"
      maxlength="3"
      autocomplete="off"
    />
    <label for="recovery-page-code"
      >Printed page check (12 hex characters, or full digest)</label
    >
    <input
      id="recovery-page-code"
      bind:value={pageCode}
      oninput={() => invalidate()}
      maxlength="64"
      autocomplete="off"
      spellcheck="false"
    />
    <label for="recovery-rows"
      >Printed rows: row number, exact raw text, row check</label
    >
    <textarea
      id="recovery-rows"
      bind:value={rowsText}
      oninput={() => invalidate()}
      maxlength="4096"
      autocomplete="off"
      spellcheck="false"
      dir="ltr"
      aria-describedby="row-format"></textarea>
    <p id="row-format">
      One row per line, separated by spaces: <code
        >1 ABCDEFGHIJKLMNOP 1234abcd</code
      >. Use the actual raw text and check from your printout; rows have 16
      characters except the final short row. You may check a partial page before
      the other pages are available.
    </p>
    <p>
      Short row/page checks locate accidental transcription errors. Anyone can
      recompute them; they do not authenticate a sender or recipient.
    </p>
  {/if}
  <div class="recovery-actions">
    <button type="button" disabled={busy} onclick={validate}
      >{mode === 'raw'
        ? 'Validate raw ciphertext'
        : 'Check rows / add complete page'}</button
    >
    <button type="button" onclick={clear}>Clear recovery</button>
  </div>
  {#if error}<p role="alert">{error}</p>{/if}
  <p role="status">{notice}</p>
  {#if result}
    <h3 tabindex="-1" bind:this={resultHeading}>Validated raw ciphertext</h3>
    <p>
      {result.raw.length} canonical characters · Whole-envelope SHA-256:
      <span class="fingerprint">{result.checksum}</span>
    </p>
    <label for="recovered-raw">Recovered raw ciphertext</label>
    <textarea
      id="recovered-raw"
      readonly
      value={result.raw}
      bind:this={rawOutput}
      spellcheck="false"
      autocomplete="off"
      dir="ltr"></textarea>
    <div class="recovery-actions">
      <button type="button" onclick={copy}>Copy recovered raw</button><button
        type="button"
        onclick={() => downloadCiphertext(result!.raw)}
        >Download recovered ciphertext (.txt)</button
      >
    </div>
    <p>
      Syntax and public checks pass. Only the offline receiver can
      authenticate/decrypt it. Clipboard and downloaded files persist outside
      this page.
    </p>
  {/if}
  <p class="muted">
    Recovery stays in tab memory and clears on navigation/reload. Runtime,
    browser and operating-system copies cannot be guaranteed erased.
  </p>
</section>

<style>
  .recovery-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-block: 1rem;
  }
  .inline-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  input:not([type='checkbox']):not([type='file']) {
    width: 100%;
    max-width: 45rem;
  }
  textarea {
    font-family: ui-monospace, monospace;
  }
</style>
