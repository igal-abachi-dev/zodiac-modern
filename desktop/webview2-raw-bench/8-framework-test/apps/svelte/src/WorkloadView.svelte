<script lang="ts">
  import { visibleRows, type Workload } from '../../../packages/bench-contract/src/workload';
  let { model }: { model: Workload } = $props();
  const snapshot = $derived(model.state);
  const rows = $derived(visibleRows($snapshot));
</script>
<label for="workload-query">Filter synthetic rows</label><input id="workload-query" type="search" value={$snapshot.query} oninput={e => model.query(e.currentTarget.value)} />
<output id="workload-summary">{rows.length} rows; tick {$snapshot.tick}</output>
<ul id="workload-rows">{#each rows as row (row.id)}<li data-id={row.id}>{row.label}: {row.value}</li>{/each}</ul>
