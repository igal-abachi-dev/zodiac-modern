import { createWorkload, visibleRows, type Workload } from '../../bench-contract/src/workload';
export type Renderer = (target: HTMLElement, model: Workload) => () => void;
export interface WorkloadAPI {
  replace(count?: number): void; reverse(): void; splice(): void;
  update(): void; burst(hz?: number, ms?: number): void; stop(): void;
  remount(): void; dispose(): void;
  snapshot(): { count: number; visible: number; query: string; tick: number; mounts: number };
}
declare global { interface Window { neutronstarWorkload?: WorkloadAPI } }
export function mountHarness(renderer: Renderer) {
  const panel = document.createElement('section');
  panel.id = 'workload-harness'; panel.className = 'shell';
  panel.innerHTML = '<h2>Supplemental renderer workload — synthetic data only</h2><p>Not the production startup or byte-comparison screen.</p><div id="workload-actions"></div><div id="workload-view"></div>';
  document.body.append(panel);
  const target = panel.querySelector<HTMLElement>('#workload-view')!;
  let model: Workload, release = () => {}, mounts = 0, disposed = false;
  const remount = () => {
    if (disposed) return;
    release(); model?.dispose(); target.replaceChildren();
    model = createWorkload(); mounts++;
    release = renderer(target, model); model.replace();
  };
  const api: WorkloadAPI = {
    replace: count => model.replace(count), reverse: () => model.reverse(),
    splice: () => model.splice(), update: () => model.update(),
    burst: (hz, ms) => model.burst(hz, ms), stop: () => model.stop(), remount,
    snapshot: () => { const s = model.state.get(); return { count: s.rows.length,
      visible: visibleRows(s).length, query: s.query, tick: s.tick, mounts }; },
    dispose: () => { if (disposed) return; disposed = true; release(); model.dispose(); panel.remove(); window.removeEventListener('pagehide', api.dispose); delete window.neutronstarWorkload; },
  };
  remount();
  for (const [label, action] of [
    ['1,000 rows', () => api.replace(1000)], ['10,000 rows', () => api.replace(10000)],
    ['Reverse', api.reverse], ['Splice 10', api.splice], ['Update 10%', api.update],
    ['30 Hz / 2 s', () => api.burst()], ['Stop', api.stop], ['Remount workload', api.remount],
  ] as const) {
    const button = document.createElement('button'); button.type = 'button';
    button.className = 'secondary'; button.textContent = label;
    button.addEventListener('click', action); panel.querySelector('#workload-actions')!.append(button);
  }
  window.neutronstarWorkload = api;
  window.addEventListener('pagehide', api.dispose, { once: true });
  return api;
}

// Baseline and htmx: htmx still uses our explicit client controller, as on the
// main screen. This is not a claim to benchmark server-driven htmx list rendering.
export const vanillaRenderer: Renderer = (target, model) => {
  target.innerHTML = '<label for="workload-query">Filter synthetic rows</label><input id="workload-query" type="search"><output id="workload-summary"></output><ul id="workload-rows"></ul>';
  const input = target.querySelector<HTMLInputElement>('input')!;
  const list = target.querySelector('ul')!, summary = target.querySelector('output')!;
  const nodes = new Map<number, HTMLLIElement>();
  const onInput = () => model.query(input.value);
  input.addEventListener('input', onInput);
  const unlisten = model.state.subscribe(s => {
    if (input.value !== s.query) input.value = s.query;
    summary.textContent = `${visibleRows(s).length} rows; tick ${s.tick}`;
    const visible = visibleRows(s), wanted = new Set(visible.map(row => row.id));
    for (const [id, node] of nodes) if (!wanted.has(id)) { node.remove(); nodes.delete(id); }
    // Preserve keyed nodes and avoid re-appending already ordered children.
    let cursor = list.firstChild;
    for (const row of visible) {
      let node = nodes.get(row.id);
      if (!node) { node = document.createElement('li'); node.dataset.id = String(row.id); nodes.set(row.id, node); }
      const text = `${row.label}: ${row.value}`;
      if (node.textContent !== text) node.textContent = text;
      if (node === cursor) cursor = cursor.nextSibling;
      else list.insertBefore(node, cursor);
    }
  });
  return () => { unlisten(); input.removeEventListener('input', onInput); nodes.clear(); target.replaceChildren(); };
};
