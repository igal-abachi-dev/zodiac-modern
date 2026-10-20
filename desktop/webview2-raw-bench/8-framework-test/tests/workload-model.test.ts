import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkload, visibleRows } from '../packages/bench-contract/src/workload';
import { fixture } from '../packages/bench-domain/src/index';
test('current GUI fixture uses English, Hebrew and emoji', () => {
  assert.equal(fixture.id, 'starlight-en-he-v2');
  assert.equal(fixture.text, 'Zodiac GUI benchmark — שלום — 🌠');
});
test('bounded keyed fixtures, immutable updates, filters and terminal disposal', () => {
  const model = createWorkload(); model.replace(1000);
  const before = model.state.get();
  model.update(); assert.equal(before.rows[0].value, 0);
  assert.equal(model.state.get().rows[0].value, 1);
  model.reverse(); assert.equal(model.state.get().rows[999].id, 0);
  model.splice(); assert.equal(model.state.get().rows[0].id, 1000);
  model.query('row-1000'); assert.equal(visibleRows(model.state.get()).length, 1);
  model.query('שלום'); assert.equal(visibleRows(model.state.get()).length, 1000);
  assert.throws(() => model.replace(10001), RangeError);
  assert.throws(() => model.burst(30, NaN), RangeError);
  assert.throws(() => model.burst(120, 100), RangeError);
  const last = model.state.get(); model.dispose(); model.update();
  assert.equal(model.state.get(), last);
});
