<script lang="ts">
  import EncryptWorkbench from '../src/components/islands/EncryptWorkbench.svelte';
  import RawRecovery from '../src/components/islands/RawRecovery.svelte';
  import { defaultRecipient } from '../src/generated/default-recipient';
  let restoreOpen = $state(false);
</script>

<main>
  <h1>Zodiac Modern offline sender prototype</h1>
  <p>
    This self-contained development file runs the same sender as the website.
    Use synthetic messages only until independent review and release
    verification are complete.
  </p>
  <details id="offline-help">
    <summary>Offline help and trust checks</summary>
    <p>
      Before opening a future release, compare its full SHA-256 outside the file
      with a value obtained through an independent trusted publisher channel. A
      checksum beside this file does not establish authenticity. This prototype
      has no self-verification badge.
    </p>
    <p>
      Choose one RSA-3072 or RSA-4096 SPKI PUBLIC KEY PEM, exponent 65537.
      Verify its full fingerprint with the recipient. Never choose a private key
      or enter its passphrase here.
    </p>
    <p>
      Type an exact message, encrypt locally, then copy raw or download
      ciphertext.txt. If clipboard access fails, copy the selected text
      manually. The separate offline Windows receiver decrypts raw text using an
      encrypted private key and hidden terminal prompt. Saved files and
      clipboard contents persist outside this page.
    </p>
    <p>
      Clear everything discards this workspace and custom recipient. Browser and
      operating-system copies cannot be guaranteed erased. This file needs no
      adjacent files, server or network connection.
    </p>
    <p>
      Glyph display and raw/transcribed-row recovery are included; SVG/PNG
      exports and print remain pending. Meta-CSP cannot supply HTTP-only
      frame-ancestors, HSTS or nosniff protections; the local file boundary
      still requires independent review and stable-browser testing before sender
      selection.
    </p>
  </details>
  <EncryptWorkbench recipient={defaultRecipient} />
  <details ontoggle={(event) => (restoreOpen = event.currentTarget.open)}>
    <summary>Recover raw ciphertext locally</summary
    >{#if restoreOpen}<RawRecovery />{/if}
  </details>
</main>
