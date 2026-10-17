import { For } from 'solid-js';
import { render } from 'solid-js/web';
import { useStore } from '@nanostores/solid';
import { visibleRows } from '../../../packages/bench-contract/src/workload';
import { mountHarness } from '../../../packages/test-support/src/workloads';
mountHarness((target, model) => {
  const s = useStore(model.state);
  return render(() => <><label for="workload-query">Filter synthetic rows</label><input id="workload-query" type="search" value={s().query} onInput={e => model.query(e.currentTarget.value)} />
    <output id="workload-summary">{visibleRows(s()).length} rows; tick {s().tick}</output>
    <ul id="workload-rows"><For each={visibleRows(s())}>{row => <li data-id={row.id}>{row.label}: {row.value}</li>}</For></ul></>, target);
});
