<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import {
    importPublicKey,
    MAX_PUBLIC_PEM_BYTES,
    PublicKeyImportError,
  } from '../../lib/crypto/public-key';
  import { downloadPublicKey } from '../../lib/exports/public-key';
  import type { PublicRecipientData } from '../../types/crypto';
  import type { SelectedRecipient } from '../../types/recipient';

  let {
    recipient = null,
    disabled = false,
    resetVersion = 0,
    onselection,
  }: {
    recipient?: PublicRecipientData | null;
    disabled?: boolean;
    resetVersion?: number;
    onselection?: (value: SelectedRecipient | null) => void;
  } = $props();
  let selected = $state<SelectedRecipient | null>(null);
  let defaultSelection = $state<SelectedRecipient | null>(null);
  let paste = $state('');
  let busy = $state(false);
  let showDetails = $state(false);
  let error = $state('');
  let notice = $state('Choose a public key to identify the recipient.');
  let fileInput: HTMLInputElement;
  let pasteInput: HTMLTextAreaElement;
  let generation = 0;
  const locked = $derived(disabled || busy);
  let seenReset = untrack(() => resetVersion);
  $effect(() => {
    const version = resetVersion;
    if (version === seenReset) return;
    seenReset = version;
    untrack(() => {
      generation++;
      busy = false;
      paste = '';
      error = '';
      showDetails = false;
      if (fileInput) fileInput.value = '';
      selected = defaultSelection;
      onselection?.(selected);
      notice = selected
        ? 'Configured recipient restored.'
        : 'Recipient cleared. Choose a public key.';
      if (!selected && recipient)
        void importSelection(
          async () => recipient!.pem,
          { name: recipient.name, source: recipient.source },
          recipient.fingerprint,
        );
    });
  });

  onMount(() => {
    const configured = recipient;
    if (configured)
      void importSelection(
        async () => configured.pem,
        { name: configured.name, source: configured.source },
        configured.fingerprint,
      );
    return () => {
      generation++;
    };
  });

  async function importSelection(
    readPEM: () => Promise<string>,
    metadata: Pick<SelectedRecipient, 'name' | 'source' | 'filename'>,
    expectedFingerprint?: string,
  ) {
    if (locked) return;
    const id = ++generation;
    busy = true;
    error = '';
    try {
      const pem = await readPEM();
      const key = await importPublicKey(pem);
      if (expectedFingerprint && key.fingerprint !== expectedFingerprint)
        throw new Error('Configured public fingerprint mismatch.');
      if (id !== generation || disabled) return;
      const value = Object.freeze({ ...key, ...metadata, pem });
      selected = value;
      if (metadata.source !== 'custom') defaultSelection = value;
      onselection?.(value);
      notice =
        metadata.source === 'custom'
          ? 'Custom public key selected. It stays in this tab.'
          : 'Configured recipient validated.';
    } catch (failure) {
      if (id !== generation) return;
      const explanation =
        failure instanceof PublicKeyImportError
          ? failure.message
          : metadata.source === 'custom'
            ? 'Unable to read this public key file.'
            : 'Configured recipient is unavailable. Choose a custom public key.';
      error = `${explanation} ${selected ? 'The previously selected recipient remains selected.' : 'No recipient is selected.'}`;
    } finally {
      if (id === generation) {
        paste = '';
        if (fileInput) fileInput.value = '';
        busy = false;
      }
    }
  }
  async function chooseFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || locked) return;
    await importSelection(
      async () => {
        if (file.size > MAX_PUBLIC_PEM_BYTES)
          throw new PublicKeyImportError('too-large');
        return file.text();
      },
      { name: 'Custom recipient', source: 'custom', filename: file.name },
    );
    await tick();
    fileInput?.focus();
  }
  async function choosePaste() {
    const pem = paste;
    await importSelection(async () => pem, {
      name: 'Custom recipient',
      source: 'custom',
    });
    await tick();
    pasteInput?.focus();
  }
  function useDefault() {
    if (locked || !defaultSelection) return;
    selected = defaultSelection;
    paste = '';
    error = '';
    notice = 'Configured recipient selected.';
    onselection?.(selected);
  }
  function clearRecipient() {
    if (locked) return;
    generation++;
    selected = null;
    paste = '';
    error = '';
    showDetails = false;
    notice = 'Recipient cleared. Choose a public key.';
    if (fileInput) fileInput.value = '';
    onselection?.(null);
  }
</script>

<section aria-labelledby="recipient-title">
  <h3 id="recipient-title">Choose a recipient</h3>
  <div class="recipient-summary" aria-live="polite">
    {#if selected}
      <p><strong>{selected.name}</strong> · RSA-{selected.bits}</p>
      <p class="fingerprint">
        Fingerprint (abbreviated): {selected.fingerprint.slice(0, 12)}…
      </p>
      {#if selected.filename}<p class="filename">
          Local filename (unverified label): {selected.filename}
        </p>{/if}
      {#if selected.source === 'fixture'}<p>
          Synthetic test recipient only.
        </p>{/if}
      <button
        type="button"
        onclick={() => (showDetails = !showDetails)}
        aria-expanded={showDetails}>Recipient details</button
      >
      {#if showDetails}
        <p class="fingerprint full-fingerprint">
          RSA-{selected.bits} · Full SHA-256 fingerprint: {selected.fingerprint}
        </p>
        <p>
          Confirm the full fingerprint with the recipient through an independent
          trusted channel. A filename or label does not prove identity.
        </p>
        <button type="button" onclick={() => downloadPublicKey(selected!.pem)}
          >Download public PEM</button
        >
      {/if}
    {:else}
      <p>No recipient selected.</p>
      {#if !recipient}<p>
          No default recipient configured. Choose a custom public key.
        </p>{/if}
    {/if}
  </div>
  <p>
    Public key stays on this device. Choose only a SPKI PUBLIC KEY PEM, RSA-3072
    or RSA-4096. Never select a private key.
  </p>
  <fieldset disabled={locked} aria-busy={busy}>
    <legend>Use a custom public key</legend>
    <label for="public-key-file">Choose public PEM file (maximum 16 KiB)</label>
    <input
      bind:this={fileInput}
      id="public-key-file"
      type="file"
      accept=".pem,text/plain,application/x-pem-file"
      onchange={chooseFile}
    />
    <label for="public-key-paste">Paste public PEM</label>
    <textarea
      bind:this={pasteInput}
      id="public-key-paste"
      bind:value={paste}
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"></textarea>
    <div class="recipient-actions">
      <button type="button" onclick={choosePaste} disabled={!paste.trim()}
        >Use pasted public key</button
      >
      {#if defaultSelection}<button type="button" onclick={useDefault}
          >Use default recipient</button
        >{/if}
      <button type="button" onclick={clearRecipient} disabled={!selected}
        >Clear recipient</button
      >
    </div>
  </fieldset>
  <p role="status">{busy ? 'Validating public key locally…' : notice}</p>
  {#if error}<p role="alert">{error}</p>{/if}
</section>

<style>
  fieldset {
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    margin-block: 1rem;
    padding: 1rem;
    min-width: 0;
  }
  label {
    display: block;
    margin-block: 0.75rem 0.25rem;
  }
  input {
    max-width: 100%;
  }
  .recipient-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .filename {
    overflow-wrap: anywhere;
  }
  [role='alert'] {
    border-inline-start: 3px solid var(--color-accent);
    padding-inline-start: 0.75rem;
  }
</style>
