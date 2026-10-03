<script lang="ts">
  import { ShieldCheck } from '@lucide/svelte';
  type PublicRecipient = {
    name: string;
    fingerprint: string;
    bits: number;
    pem: string;
    source: string;
  };
  let { recipient = null }: { recipient?: PublicRecipient | null } = $props();
  let showDetails = $state(false);
  const recipientName = $derived(
    recipient?.name ?? 'No default recipient configured',
  );
</script>

<section class="panel" aria-labelledby="workspace-title">
  <h2 id="workspace-title">
    <ShieldCheck size={24} aria-hidden="true" /> Sender workspace
  </h2>
  <p>{recipientName}</p>
  {#if recipient}<button
      type="button"
      onclick={() => (showDetails = !showDetails)}
      aria-expanded={showDetails}>Recipient details</button
    >{#if showDetails}<p class="fingerprint">
        RSA-{recipient.bits} · SHA-256 {recipient.fingerprint}
      </p>{/if}{:else}<p class="muted">
      This scaffold has no default key. Local custom public-key import will be
      added in the recipient-selection work.
    </p>{/if}
  <p>
    Encryption is not enabled in this scaffold. Do not type sensitive messages
    into a development build.
  </p>
  <button type="button" disabled
    >Encrypt message — implementation pending</button
  >
</section>
