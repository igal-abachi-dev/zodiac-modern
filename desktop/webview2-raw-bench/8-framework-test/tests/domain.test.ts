import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBench,
  type Clock,
} from '../packages/bench-contract/src/index.ts';
import {
  initial,
  transition,
  fixture,
  statusText,
} from '../packages/bench-domain/src/index.ts';
import { allowedDialogMetadata } from '../packages/design/src/style-policy.ts';
function fake() {
  let now = 0;
  let fn = () => {};
  let active = false;
  const time: Clock = {
    now: () => now,
    every: (callback) => {
      fn = callback;
      active = true;
      return 1;
    },
    clear: () => {
      active = false;
    },
  };
  return {
    time,
    advance(ms: number) {
      now += ms;
      if (active) fn();
    },
    late() {
      fn();
    },
    get active() {
      return active;
    },
  };
}
test('legal transitions, stable no-ops, immutable fixture and snapshots', () => {
  const first = initial();
  assert.equal(
    transition(first, { type: 'start', operation: 'encrypt' }),
    first,
  );
  assert.equal(transition(first, { type: 'reset' }), first);
  let s = transition(first, { type: 'loaded' });
  s = transition(s, { type: 'start', operation: 'decrypt' });
  assert.equal(transition(s, { type: 'start', operation: 'encrypt' }), s);
  assert.equal(transition(s, { type: 'tick', progress: NaN }), s);
  s = transition(s, { type: 'tick', progress: 100 });
  assert.equal(s.status, 'success');
  assert.equal(statusText(s), 'Simulation complete. No file was changed.');
  assert(Object.isFrozen(s));
  assert(Object.isFrozen(fixture));
});
test('elapsed monotonic progress, cancel/reset/disposal invalidate late work', () => {
  const f = fake();
  const b = createBench(f.time);
  b.loaded();
  b.start('encrypt');
  f.advance(500);
  assert.equal(b.state.get().progress, 25);
  b.cancel();
  f.late();
  assert.equal(b.state.get().status, 'canceled');
  b.reset();
  b.start('decrypt');
  f.advance(2000);
  assert.equal(b.state.get().status, 'success');
  assert(!f.active);
  b.reset();
  b.start('encrypt');
  b.dispose();
  f.late();
  assert.equal(b.state.get().progress, 0);
  assert(!f.active);
});
test('a cancel dispatched during notification cannot leave a timer behind', () => {
  const f = fake(),
    b = createBench(f.time);
  b.loaded();
  const stop = b.state.listen((s) => {
    if (s.status === 'running') b.cancel();
  });
  b.start('encrypt');
  assert.equal(b.state.get().status, 'canceled');
  assert(!f.active);
  stop();
  b.dispose();
});
test('pinned Nano Stores subscriptions are synchronous, ordered and removable', () => {
  const b = createBench();
  const events: string[] = [];
  const a = b.state.listen(() => events.push('a'));
  const c = b.state.listen(() => events.push('b'));
  b.loaded();
  assert.deepEqual(events, ['a', 'b']);
  a();
  b.reset();
  assert.deepEqual(events, ['a', 'b']);
  b.start('encrypt');
  assert.deepEqual(events, ['a', 'b', 'b']);
  c();
  b.dispose();
});
test('style exception is restricted to approved values on the dialog content', () => {
  const valid = (value: string) =>
    allowedDialogMetadata('about-content', 'dialog', 'content', value);
  assert(
    valid('--layer-index: 0; --nested-layer-count: 0; pointer-events: auto;'),
  );
  for (const bad of [
    'width: 0;',
    'pointer-events: none;',
    '--layer-index: 1;',
    '--layer-index: 0 !important;',
    '--z-index: 0;',
    '--nested-layer-count: url(https://example.invalid);',
  ])
    assert(!valid(bad));
  assert(
    !allowedDialogMetadata(
      'background',
      'dialog',
      'content',
      '--layer-index: 0;',
    ),
  );
});
