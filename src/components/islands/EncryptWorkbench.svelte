<script lang="ts">
  import { onMount, tick, flushSync } from 'svelte';
  import { ShieldCheck } from '@lucide/svelte';
  import RecipientSelector from './RecipientSelector.svelte';
  import type { PublicRecipientData } from '../../types/crypto';
  import { Workspace } from '../../lib/crypto/workspace';
  import { encryptionAvailable } from '../../lib/crypto/hybrid';
  import { utf8ByteLength } from '../../lib/validation/input';
  import { downloadCiphertext } from '../../lib/exports/ciphertext';
  let { recipient = null }: { recipient?: PublicRecipientData | null } =
    $props();
  const workspace = new Workspace();
  let view = $state.raw(workspace.state);
  let available = $state(false);
  let initialized = $state(false);
  let resetVersion = $state(0);
  let notice = $state('');
  let messageInput = $state<HTMLTextAreaElement>();
  let resultHeading = $state<HTMLHeadingElement>();
  let rawInput = $state<HTMLTextAreaElement>();
  const busy = $derived(view.phase === 'encrypting');
  const byteCount = $derived.by(() => {
    try {
      return utf8ByteLength(view.draft);
    } catch {
      return null;
    }
  });
  onMount(() => {
    const unsubscribe = workspace.subscribe((value) => {
      view = value;
    });
    available = encryptionAvailable();
    initialized = true;
    const discard = () => flushSync(() => clearEverything(false));
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) discard();
    };
    window.addEventListener('pagehide', discard);
    window.addEventListener('pageshow', restore);
    return () => {
      unsubscribe();
      workspace.clear();
      window.removeEventListener('pagehide', discard);
      window.removeEventListener('pageshow', restore);
    };
  });
  async function submit() {
    if (!available || busy || view.result) return;
    notice = '';
    const success = await workspace.submit();
    await tick();
    if (success && view.result) {
      notice = 'Message encrypted locally. The draft has been cleared.';
      resultHeading?.focus();
    } else if (view.phase === 'error') messageInput?.focus();
  }
  function shortcut(event: KeyboardEvent) {
    if (
      event.key === 'Enter' &&
      (event.ctrlKey || event.metaKey) &&
      !event.isComposing
    ) {
      event.preventDefault();
      void submit();
    }
  }
  async function anotherMessage() {
    workspace.anotherMessage();
    notice = 'Previous result discarded. Recipient retained for this tab.';
    await tick();
    messageInput?.focus();
  }
  function clearEverything(focus = true) {
    workspace.clear();
    resetVersion++;
    notice =
      'Workspace cleared. Only a validated default recipient may be restored.';
    if (messageInput) messageInput.value = '';
    if (rawInput) rawInput.value = '';
    if (focus) void tick().then(() => messageInput?.focus());
  }
  async function copyRaw() {
    const raw = view.result?.raw;
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(raw);
      if (view.result?.raw !== raw) return;
      notice =
        'Raw ciphertext copied. The clipboard persists outside this tab.';
    } catch {
      if (view.result?.raw !== raw) return;
      notice =
        'Clipboard unavailable. Select and copy the raw ciphertext manually.';
      rawInput?.focus();
      rawInput?.select();
    }
  }
</script>

<section class="panel" aria-labelledby="workspace-title" aria-busy={busy}>
  <h2 id="workspace-title">
    <ShieldCheck size={24} aria-hidden="true" /> Sender workspace
  </h2>
  <p class="development-notice">
    Development build: use synthetic messages only. Integrated review, signed
    releases and publisher verification are pending.
  </p>
  <RecipientSelector
    {recipient}
    {resetVersion}
    disabled={busy || !!view.result}
    onselection={(value) => workspace.selectRecipient(value)}
  />
  {#if initialized && !available}
    <p role="alert">
      Native WebCrypto is unavailable. Open the supported sender over HTTPS or
      loopback in a current browser. Encryption has no fallback.
    </p>
  {/if}
  {#if view.result}
    <section aria-labelledby="result-title">
      <h3 id="result-title" tabindex="-1" bind:this={resultHeading}>
        Encrypted message
      </h3>
      <p>
        Recipient: <strong>{view.result.recipient.name}</strong> · RSA-{view
          .result.recipient.bits}
      </p>
      <p class="fingerprint">
        Recipient SHA-256 fingerprint: {view.result.recipient.fingerprint}
      </p>
      <p>
        RSA-OAEP SHA-256 + AES-256-GCM · {view.result.plaintextBytes} UTF-8 bytes
        · {view.result.raw.length} raw characters
      </p>
      <p class="fingerprint">Whole-envelope SHA-256: {view.result.checksum}</p>
      <p>
        The checksum is a public transcription check, not authentication. Send
        the raw text to the recipient's offline receiver.
      </p>
      <label for="raw-ciphertext">Raw ciphertext (canonical Base64URL)</label>
      <textarea
        id="raw-ciphertext"
        bind:this={rawInput}
        readonly
        value={view.result.raw}
        spellcheck="false"
        autocomplete="off"></textarea>
      <div class="workspace-actions">
        <button type="button" onclick={copyRaw}>Copy raw</button>
        <button
          type="button"
          onclick={() => downloadCiphertext(view.result!.raw)}
          >Download ciphertext (.txt)</button
        >
        <button type="button" onclick={anotherMessage}
          >Encrypt another message</button
        >
      </div>
      <p>
        Clipboard and downloaded files persist outside this tab. Another message
        discards this result; save it first. Optional artwork is still in
        development.
      </p>
    </section>
  {:else}
    <label for="message">Message</label>
    <textarea
      id="message"
      bind:this={messageInput}
      value={view.draft}
      oninput={(event) => workspace.setDraft(event.currentTarget.value)}
      onkeydown={shortcut}
      disabled={busy || !available}
      dir="auto"
      spellcheck="false"
      autocomplete="off"
      maxlength="65537"
      autocapitalize="off"
      {...{ autocorrect: 'off' }}
      aria-describedby="message-count message-help"></textarea>
    <p id="message-count" aria-live="polite">
      {byteCount === null
        ? 'Invalid Unicode: remove the unpaired surrogate.'
        : `${byteCount.toLocaleString('en-US')} / 65,536 UTF-8 bytes`}
    </p>
    <p id="message-help">
      Text is preserved exactly, including spaces and newlines. Ctrl/Cmd+Enter
      encrypts; Enter adds a newline. Confirm the recipient's full fingerprint
      through an independent trusted channel.
    </p>
    {#if view.error}<p role="alert">{view.error}</p>{/if}
    <button
      type="button"
      onclick={submit}
      disabled={!initialized ||
        !available ||
        !view.recipient ||
        busy ||
        view.draft.length === 0}
      >{busy ? 'Encrypting locally…' : 'Encrypt message'}</button
    >
  {/if}
  <div class="workspace-actions">
    <button type="button" onclick={() => clearEverything()}
      >Clear everything</button
    >
  </div>
  <p role="status">{notice}</p>
  <p class="muted">
    Workspace state stays in memory and is cleared on navigation. This cannot
    guarantee erasure of browser, operating-system or undo-buffer copies.
  </p>
</section>

<style>
  .workspace-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-block: 1rem;
  }
  .development-notice {
    border-inline-start: 3px solid var(--color-accent);
    padding-inline-start: 0.75rem;
  }
  #raw-ciphertext {
    font-family: ui-monospace, monospace;
    overflow-wrap: anywhere;
  }
</style>
