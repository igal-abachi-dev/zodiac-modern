import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflow, createList, type Clock } from '../src/model';
function clock() {
  let now = 0;
  const callbacks = new Map<number, () => void>();
  let id = 0;
  return {
    now: () => now,
    repeat: (fn: () => void) => {
      callbacks.set(++id, fn);
      return id;
    },
    clear: (id: unknown) => {
      callbacks.delete(id as number);
    },
    advance(ms: number) {
      now += ms;
      for (const fn of [...callbacks.values()]) fn();
    },
    get pending() {
      return callbacks.size;
    },
  } satisfies Clock & { advance(ms: number): void; readonly pending: number };
}
test('workflow progress, cancellation, stale callbacks and terminal disposal', () => {
  const time = clock(),
    m = createWorkflow(() => {}, time);
  m.start('encrypt');
  assert.equal(time.pending, 0);
  m.loaded();
  m.start('encrypt');
  time.advance(1000);
  assert.equal(m.state.progress, 50);
  m.cancel();
  assert.equal(m.state.status, 'canceled');
  assert.equal(time.pending, 0);
  m.reset();
  m.start('decrypt');
  time.advance(2000);
  assert.equal(m.state.status, 'success');
  assert.equal(time.pending, 0);
  m.dispose();
  const last = m.state;
  m.start('encrypt');
  m.reset();
  assert.equal(m.state, last);
});
test('row identity, immutable updates, remount and bounded timers', () => {
  const time = clock(),
    m = createList(() => {}, time);
  m.replace(1000);
  const old = m.state;
  m.replace(10000);
  assert.equal(m.state.rows[0].id, 1000);
  m.replace(1000);
  m.reverse();
  assert.equal(m.state.rows[0].id, 11999);
  m.splice();
  assert.equal(m.state.rows[0].id, 12000);
  m.update();
  assert.equal(m.state.tick, 1);
  assert.equal(old.rows[0].value, 0);
  for (const hz of [10, 30, 60]) {
    m.burst(hz);
    time.advance(100);
    assert.equal(time.pending, 1);
    m.stop();
    assert.equal(time.pending, 0);
  }
  assert.throws(() => m.replace(10001));
  m.dispose();
  const last = m.state;
  m.update();
  assert.equal(m.state, last);
  const fresh = createList(() => {}, time);
  fresh.replace(1000);
  assert.equal(fresh.state.rows[0].id, 0);
});
