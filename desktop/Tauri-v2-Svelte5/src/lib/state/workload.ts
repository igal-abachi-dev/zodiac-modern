// Supplemental synthetic workloads only; never imported by the production screen.
import { atom } from 'nanostores';
export interface Row { id: number; label: string; value: number }
export interface WorkloadState { readonly rows: readonly Row[]; readonly query: string; readonly tick: number }
export function visibleRows(s: WorkloadState): Row[] {
  return s.rows.filter(row => row.label.includes(s.query));
}
export function createWorkload() {
  const state = atom<WorkloadState>({ rows: [], query: '', tick: 0 });
  let nextId = 0, disposed = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const set = (s: WorkloadState) => { if (!disposed) state.set(s); };
  const stop = () => { if (timer !== undefined) clearInterval(timer); timer = undefined; };
  const rows = (count: number) => Array.from({ length: count }, () => {
    const id = nextId++;
    return { id, label: `row-${id} שלום`, value: 0 };
  });
  return {
    state,
    replace(count = 1000) {
      if (!Number.isInteger(count) || count < 0 || count > 10000) throw new RangeError('0..10000 rows');
      stop(); set({ rows: rows(count), query: '', tick: 0 });
    },
    query(query: string) { set({ ...state.get(), query }); },
    reverse() { const s = state.get(); set({ ...s, rows: [...s.rows].reverse() }); },
    splice() {
      const s = state.get();
      set({ ...s, rows: [...rows(10), ...s.rows.slice(10)] });
    },
    update() {
      const s = state.get();
      set({ ...s, tick: s.tick + 1, rows: s.rows.map((row, i) =>
        i % 10 === 0 ? { ...row, value: row.value + 1 } : row) });
    },
    burst(hz = 30, durationMs = 2000) {
      if (disposed) return;
      if (![10, 30, 60].includes(hz) || !Number.isInteger(durationMs) || durationMs < 1 || durationMs > 10000) throw new RangeError('bounded burst');
      stop();
      const until = performance.now() + durationMs;
      timer = setInterval(() => {
        if (performance.now() >= until) { stop(); return; }
        this.update();
      }, 1000 / hz);
    },
    stop,
    dispose() { stop(); disposed = true; },
  };
}
export type Workload = ReturnType<typeof createWorkload>;
