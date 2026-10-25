<script lang="ts">
  import { onMount } from 'svelte';
  import { createList, type ListState } from './model';
  let snapshot = $state.raw<ListState>({ rows: [], query: '', tick: 0 });
  let model = createList((s) => (snapshot = s));
  let ready = $state(false);
  const rows = $derived(snapshot.rows.filter((r) => r.label.includes(snapshot.query)));
  function remount() {
    model.dispose();
    model = createList((s) => (snapshot = s));
    model.replace(1000);
  }
  onMount(() => {
    model.replace(1000);
    ready = true;
    return () => model.dispose();
  });
</script>

<header class="topbar">
  <div>
    <h2>List and filter workbench</h2>
    <p class="subtitle">
      Deterministic synthetic rows. No files, network, cryptography or native commands.
    </p>
  </div>
  <button class="secondary" onclick={() => (location.hash = '')}>Back to main screen</button>
</header>
<p role="status">{ready ? 'Workbench ready' : 'Loading workbench…'}</p>
<div class="workbench-actions" role="group" aria-label="Synthetic list actions">
  <button class="secondary" onclick={() => model.replace(1000)}>1,000 rows</button><button
    class="secondary"
    onclick={() => model.replace(10000)}>10,000 rows</button
  >
  <button class="secondary" onclick={() => model.reverse()}>Reverse</button><button
    class="secondary"
    onclick={() => model.splice()}>Splice 10</button
  ><button class="secondary" onclick={() => model.update()}>Update 10%</button>
  {#each [10, 30, 60] as hz}<button class="secondary" onclick={() => model.burst(hz)}
      >{hz} Hz / 2 s</button
    >{/each}
  <button class="secondary" onclick={() => model.stop()}>Stop</button><button
    class="secondary"
    onclick={remount}>Remount workload</button
  >
</div>
<div class="card workbench-filter">
  <label for="workload-query">Filter synthetic rows</label><input
    id="workload-query"
    type="search"
    value={snapshot.query}
    oninput={(e) => model.query(e.currentTarget.value)}
    autocomplete="off"
    spellcheck="false"
  /><output id="workload-summary">{rows.length} rows; tick {snapshot.tick}</output>
  <p class="hint">
    Case-sensitive label filtering. Replacement advances row IDs; remount resets IDs, query and
    tick.
  </p>
</div>
<ul id="workload-rows" class="workbench-rows" aria-label="Synthetic rows">
  {#each rows as row (row.id)}<li data-id={row.id}>{row.label}: {row.value}</li>{/each}
</ul>
