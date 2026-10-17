import { createRoot } from 'react-dom/client';
import { useStore } from '@nanostores/react';
import { visibleRows, type Workload } from '../../../packages/bench-contract/src/workload';
import { mountHarness } from '../../../packages/test-support/src/workloads';
function View({ model }: { model: Workload }) {
  const s = useStore(model.state);
  const rows = visibleRows(s);
  return <><label htmlFor="workload-query">Filter synthetic rows</label><input id="workload-query" type="search" value={s.query} onChange={e => model.query(e.currentTarget.value)} />
    <output id="workload-summary">{rows.length} rows; tick {s.tick}</output>
    <ul id="workload-rows">{rows.map(row => <li key={row.id} data-id={row.id}>{row.label}: {row.value}</li>)}</ul></>;
}
mountHarness((target, model) => { const root = createRoot(target); root.render(<View model={model} />); return () => root.unmount(); });
