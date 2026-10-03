<script lang="ts">
  import { ShieldCheck } from '@lucide/svelte';
  import RecipientSelector from './RecipientSelector.svelte';
  import type { PublicRecipientData } from '../../types/crypto';
  let { recipient = null }: { recipient?: PublicRecipientData | null } =
    $props();
</script>

<section class="panel" aria-labelledby="workspace-title">
  <h2 id="workspace-title">
    <ShieldCheck size={24} aria-hidden="true" /> Sender workspace
  </h2>
  <RecipientSelector {recipient} />
  <p>
    Encryption is not enabled in this scaffold. Do not type sensitive messages
    into a development build.
  </p>
  <button type="button" disabled
    >Encrypt message — implementation pending</button
  >
</section>
