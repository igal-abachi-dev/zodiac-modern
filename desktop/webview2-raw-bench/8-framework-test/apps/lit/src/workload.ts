import { LitElement, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { live } from 'lit/directives/live.js';
import { visibleRows, type Workload } from '../../../packages/bench-contract/src/workload';
import { mountHarness } from '../../../packages/test-support/src/workloads';
class WorkloadView extends LitElement {
  model!: Workload;
  private off = () => {};
  protected createRenderRoot() { return this; }
  connectedCallback() { super.connectedCallback(); this.off = this.model.state.subscribe(() => this.requestUpdate()); }
  disconnectedCallback() { this.off(); super.disconnectedCallback(); }
  protected render() {
    const s = this.model.state.get(), rows = visibleRows(s);
    return html`<label for="workload-query">Filter synthetic rows</label><input id="workload-query" type="search" .value=${live(s.query)} @input=${(e: Event) => this.model.query((e.target as HTMLInputElement).value)}>
    <output id="workload-summary">${rows.length} rows; tick ${s.tick}</output>
    <ul id="workload-rows">${repeat(rows, row => row.id, row => html`<li data-id=${row.id}>${row.label}: ${row.value}</li>`)}</ul>`;
  }
}
customElements.define('neutronstar-workload', WorkloadView);
mountHarness((target, model) => { const view = new WorkloadView(); view.model = model; target.append(view); return () => view.remove(); });
