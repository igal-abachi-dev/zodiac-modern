export const fixture = Object.freeze({
  id: 'starlight-v1',
  file: 'Synthetic sample: starlight.nsx',
  text: 'Zodiac GUI benchmark — שלום — مرحبًا — 🌠',
});
export type Operation = 'encrypt' | 'decrypt';
export type Status = 'ready' | 'running' | 'success' | 'canceled' | 'error';
export interface BenchState {
  readonly fixtureId: typeof fixture.id;
  readonly status: Status;
  readonly operation: Operation | null;
  readonly progress: number;
  readonly loaded: boolean;
}
export type Action =
  | { type: 'loaded' }
  | { type: 'start'; operation: Operation }
  | { type: 'tick'; progress: number }
  | { type: 'cancel' | 'reset' | 'fail' };
export const initial = (): Readonly<BenchState> =>
  Object.freeze({
    fixtureId: fixture.id,
    status: 'ready',
    operation: null,
    progress: 0,
    loaded: false,
  });
export function transition(
  s: Readonly<BenchState>,
  a: Action,
): Readonly<BenchState> {
  let next: BenchState;
  switch (a.type) {
    case 'loaded':
      if (s.loaded) return s;
      next = { ...s, loaded: true };
      break;
    case 'start':
      if (!s.loaded || s.status === 'running') return s;
      next = { ...s, status: 'running', operation: a.operation, progress: 0 };
      break;
    case 'tick': {
      if (s.status !== 'running' || !Number.isFinite(a.progress)) return s;
      const progress = Math.max(
        s.progress,
        Math.min(100, Math.floor(a.progress)),
      );
      if (progress === s.progress) return s;
      next = {
        ...s,
        progress,
        status: progress === 100 ? 'success' : 'running',
      };
      break;
    }
    case 'cancel':
      if (s.status !== 'running') return s;
      next = { ...s, status: 'canceled' };
      break;
    case 'fail':
      if (s.status !== 'running') return s;
      next = { ...s, status: 'error' };
      break;
    case 'reset':
      if (s.status === 'ready' && s.progress === 0 && s.operation === null)
        return s;
      next = { ...s, status: 'ready', operation: null, progress: 0 };
      break;
  }
  return Object.freeze(next);
}
export function statusText(s: Readonly<BenchState>): string {
  if (!s.loaded) return 'Loading local interface…';
  switch (s.status) {
    case 'ready':
      return 'Ready';
    case 'running':
      return `Simulating ${s.operation === 'encrypt' ? 'encryption' : 'decryption'}…`;
    case 'success':
      return 'Simulation complete. No file was changed.';
    case 'canceled':
      return 'Simulation canceled.';
    case 'error':
      return 'Simulation failed. No file was changed.';
  }
}
export const progressAt = (elapsed: number) =>
  Math.min(100, Math.max(0, Math.floor((elapsed / 2000) * 100)));
