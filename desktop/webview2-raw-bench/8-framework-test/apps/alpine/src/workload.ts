import Alpine from '@alpinejs/csp';
import { visibleRows, type Workload } from '../../../packages/bench-contract/src/workload';
import { mountHarness } from '../../../packages/test-support/src/workloads';
let activeModel: Workload | undefined;
// One provider, rather than registering a closure retaining each old store.
Alpine.data('rendererWorkload', () => {
  const model = activeModel!;
  return {
    snapshot: model.state.get(),
    get rows() { return visibleRows(this.snapshot); },
    get summary() { return `${this.rows.length} rows; tick ${this.snapshot.tick}`; },
    off: () => {},
    init() { this.off = model.state.subscribe(s => { this.snapshot = s; }); },
    destroy() { this.off(); },
    input(e: Event) { model.query((e.target as HTMLInputElement).value); },
  };
});
mountHarness((target, model) => {
  activeModel = model;
  target.innerHTML = '<div x-data="rendererWorkload"><label for="workload-query">Filter synthetic rows</label><input id="workload-query" type="search" :value="snapshot.query" @input="input"><output id="workload-summary" x-text="summary"></output><ul id="workload-rows"><template x-for="row in rows" :key="row.id"><li :data-id="row.id"><span x-text="row.label"></span>: <span x-text="row.value"></span></li></template></ul></div>';
  Alpine.initTree(target);
  return () => { Alpine.destroyTree(target); target.replaceChildren(); activeModel = undefined; };
});
