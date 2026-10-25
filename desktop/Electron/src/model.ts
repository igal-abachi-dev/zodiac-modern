export type Mode = 'encrypt' | 'decrypt';
export interface Clock {
  now(): number;
  repeat(fn: () => void, ms: number): unknown;
  clear(id: unknown): void;
}
export const realClock: Clock = {
  now: () => performance.now(),
  repeat: (fn, ms) => setInterval(fn, ms),
  clear: (id) => clearInterval(id as ReturnType<typeof setInterval>),
};
export interface Workflow {
  loaded: boolean;
  status: 'ready' | 'running' | 'success' | 'canceled';
  operation: Mode | null;
  progress: number;
}
export const sample = 'Zodiac GUI benchmark — שלום — 🌠';
export function statusText(s: Workflow) {
  return !s.loaded
    ? 'Loading local interface…'
    : s.status === 'ready'
      ? 'Ready'
      : s.status === 'success'
        ? 'Simulation complete. No file was changed.'
        : s.status === 'canceled'
          ? 'Simulation canceled.'
          : `Simulating ${s.operation === 'encrypt' ? 'encryption' : 'decryption'}…`;
}
export function createWorkflow(changed: (s: Workflow) => void, time = realClock) {
  let state: Workflow = { loaded: false, status: 'ready', operation: null, progress: 0 },
    handle: unknown,
    epoch = 0,
    dead = false;
  const publish = (next: Workflow) => {
    if (!dead) {
      state = Object.freeze(next);
      changed(state);
    }
  };
  const stop = () => {
    epoch++;
    if (handle !== undefined) time.clear(handle);
    handle = undefined;
  };
  return {
    get state() {
      return state;
    },
    loaded() {
      publish({ ...state, loaded: true });
    },
    start(operation: Mode) {
      if (dead || !state.loaded || state.status === 'running') return;
      stop();
      const generation = epoch,
        began = time.now();
      publish({ ...state, status: 'running', operation, progress: 0 });
      if (dead || epoch !== generation || (state as Workflow).status !== 'running') return;
      handle = time.repeat(() => {
        if (dead || generation !== epoch) return;
        const progress = Math.min(
          100,
          Math.max(state.progress, Math.floor((time.now() - began) / 20)),
        );
        publish({ ...state, progress, status: progress === 100 ? 'success' : 'running' });
        if (progress === 100 && epoch === generation) stop();
      }, 100);
    },
    cancel() {
      stop();
      if (state.status === 'running') publish({ ...state, status: 'canceled' });
    },
    reset() {
      stop();
      publish({ ...state, status: 'ready', operation: null, progress: 0 });
    },
    dispose() {
      stop();
      dead = true;
    },
  };
}
export interface Row {
  readonly id: number;
  readonly label: string;
  readonly value: number;
}
export interface ListState {
  readonly rows: readonly Row[];
  readonly query: string;
  readonly tick: number;
}
export function createList(changed: (s: ListState) => void, time = realClock) {
  let state: ListState = { rows: [], query: '', tick: 0 },
    nextId = 0,
    handle: unknown,
    epoch = 0,
    dead = false;
  const publish = (s: ListState) => {
    if (!dead) {
      state = s;
      changed(s);
    }
  };
  const stop = () => {
    epoch++;
    if (handle !== undefined) time.clear(handle);
    handle = undefined;
  };
  const rows = (count: number) =>
    Array.from({ length: count }, () => {
      const id = nextId++;
      return { id, label: `row-${id} שלום`, value: 0 };
    });
  const update = () =>
    publish({
      ...state,
      tick: state.tick + 1,
      rows: state.rows.map((r, i) => (i % 10 === 0 ? { ...r, value: r.value + 1 } : r)),
    });
  return {
    get state() {
      return state;
    },
    replace(count: number) {
      if (dead) return;
      if (!Number.isInteger(count) || count < 0 || count > 10000)
        throw new RangeError('bounded rows');
      stop();
      publish({ rows: rows(count), query: '', tick: 0 });
    },
    query(query: string) {
      publish({ ...state, query });
    },
    reverse() {
      publish({ ...state, rows: [...state.rows].reverse() });
    },
    splice() {
      publish({ ...state, rows: [...rows(10), ...state.rows.slice(10)] });
    },
    update,
    burst(hz: number) {
      if (dead) return;
      if (![10, 30, 60].includes(hz)) throw new RangeError('bounded rate');
      stop();
      const generation = epoch,
        until = time.now() + 2000;
      handle = time.repeat(() => {
        if (dead || generation !== epoch) return;
        if (time.now() >= until) {
          stop();
          return;
        }
        update();
      }, 1000 / hz);
    },
    stop,
    dispose() {
      stop();
      dead = true;
    },
  };
}
