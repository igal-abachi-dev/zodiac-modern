import { atom } from 'nanostores';
import {
  initial,
  transition,
  progressAt,
  type Action,
  type Operation,
} from '$lib/domain';
export interface Clock {
  now(): number;
  every(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}
const clock: Clock = {
  now: () => performance.now(),
  every: (fn, ms) => setInterval(fn, ms),
  clear: (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
};
export function createBench(time: Clock = clock) {
  const state = atom(initial());
  let timer: unknown;
  let generation = 0;
  let disposed = false;
  const stop = () => {
    generation++;
    if (timer !== undefined) {
      time.clear(timer);
      timer = undefined;
    }
  };
  const dispatch = (action: Action) => {
    if (!disposed) state.set(transition(state.get(), action));
  };
  return {
    state,
    loaded: () => dispatch({ type: 'loaded' }),
    start(operation: Operation) {
      if (disposed || !state.get().loaded || state.get().status === 'running')
        return;
      stop();
      const current = generation;
      const began = time.now();
      dispatch({ type: 'start', operation });
      // A synchronous subscriber may cancel/reset/dispose while being notified.
      if (
        disposed ||
        generation !== current ||
        state.get().status !== 'running'
      )
        return;
      timer = time.every(() => {
        if (disposed || current !== generation) return;
        dispatch({ type: 'tick', progress: progressAt(time.now() - began) });
        if (state.get().status !== 'running' && current === generation) stop();
      }, 100);
    },
    cancel() {
      stop();
      dispatch({ type: 'cancel' });
    },
    reset() {
      stop();
      dispatch({ type: 'reset' });
    },
    fail() {
      stop();
      dispatch({ type: 'fail' });
    },
    dispose() {
      stop();
      disposed = true;
    },
  };
}
export const bench = createBench();
export type Bench = ReturnType<typeof createBench>;
