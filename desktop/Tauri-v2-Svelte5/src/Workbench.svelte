<script lang="ts">
  import { onMount } from 'svelte';
  import { createWorkload, visibleRows } from '$lib/state/workload';
  import { assetsReady } from '$lib/design';

  let model = $state.raw(createWorkload());
  const snapshot = $derived(model.state);
  const rows = $derived(visibleRows($snapshot));
  let ready = $state(false);
  let mounts = $state(1);
  function remount() {
    model.dispose();
    model = createWorkload();
    model.replace(1000);
    mounts++;
  }
  onMount(() => {
    let closed = false;
    model.replace(1000);
    void assetsReady().then(() => { if (!closed) ready = true; });
    const dispose = () => model.dispose();
    window.addEventListener('pagehide', dispose);
    return () => { closed = true; dispose(); window.removeEventListener('pagehide', dispose); };
  });
</script>

<header class="topbar">
  <div>
    <h2>List and filter workbench</h2>
    <p class="subtitle">Deterministic synthetic rows. No files, network, cryptography or native commands.</p>
  </div>
  <button class="secondary" onclick={() => { location.hash = ''; }}>Back to main screen</button>
</header>
<p id="workbench-status" role="status" aria-live="polite">{ready ? 'Workbench ready' : 'Loading workbench...'}</p>
<div class="workbench-actions" role="group" aria-label="Synthetic list actions">
  <button class="secondary" disabled={!ready} onclick={() => model.replace(1000)}>1,000 rows</button>
  <button class="secondary" disabled={!ready} onclick={() => model.replace(10000)}>10,000 rows</button>
  <button class="secondary" disabled={!ready} onclick={() => model.reverse()}>Reverse</button>
  <button class="secondary" disabled={!ready} onclick={() => model.splice()}>Splice 10</button>
  <button class="secondary" disabled={!ready} onclick={() => model.update()}>Update 10%</button>
  <button class="secondary" disabled={!ready} onclick={() => model.burst(10, 2000)}>10 Hz / 2 s</button>
  <button class="secondary" disabled={!ready} onclick={() => model.burst(30, 2000)}>30 Hz / 2 s</button>
  <button class="secondary" disabled={!ready} onclick={() => model.burst(60, 2000)}>60 Hz / 2 s</button>
  <button class="secondary" disabled={!ready} onclick={() => model.stop()}>Stop</button>
  <button class="secondary" disabled={!ready} onclick={remount}>Remount workload</button>
</div>
<div class="card workbench-filter">
  <label for="workload-query">Filter synthetic rows</label>
  <input id="workload-query" type="search" disabled={!ready} value={$snapshot.query}
    oninput={event => model.query(event.currentTarget.value)} autocomplete="off" spellcheck="false" />
  <output id="workload-summary">{rows.length} rows; tick {$snapshot.tick}</output>
  <p class="hint">Case-sensitive label filtering. Replacement keeps advancing row IDs; remount resets IDs, query and tick. Mount {mounts}.</p>
</div>
<ul id="workload-rows" class="workbench-rows" aria-label="Synthetic rows">
  {#each rows as row (row.id)}
    <li data-id={row.id}>{row.label}: {row.value}</li>
  {/each}
</ul>
