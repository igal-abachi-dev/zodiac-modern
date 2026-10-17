import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeEntry, createEntryBuffer, sessionWindowMax, intervalBlockingMs, type DiagnosticEntry } from '../packages/test-support/src/diagnostics';
test('diagnostics retain bounded numeric fields, never DOM nodes, text or URLs', () => {
  const entry = sanitizeEntry({ entryType: 'largest-contentful-paint', name: 'https://private.invalid/', startTime: 1, duration: 0,
    renderTime: 1, loadTime: 0, size: 40, url: 'secret-url', element: { id: 'private-name', textContent: 'secret-text' } });
  assert.deepEqual(entry, { type: 'largest-contentful-paint', startTime: 1, duration: 0, renderTime: 1, loadTime: 0, size: 40, targetId: null });
  assert.equal(sanitizeEntry({ entryType: 'resource', name: 'secret', startTime: 1, duration: 2 }), null);
  assert.equal(sanitizeEntry({ entryType: 'longtask', name: 'self', startTime: NaN, duration: 10 }), null);
  const buffer = createEntryBuffer(1); buffer.add(entry!); buffer.add(entry!);
  const first = buffer.snapshot(); assert.equal(first.dropped, 1);
  first.entries[0].startTime = 500; assert.equal(buffer.snapshot().entries[0].startTime, 1);
  assert.throws(() => createEntryBuffer(Infinity), RangeError);
});
test('layout shifts use bounded session windows and exclude recent input', () => {
  const shift = (time: number, value: number, recent = false): DiagnosticEntry =>
    ({ type: 'layout-shift', startTime: time, duration: 0, value, hadRecentInput: recent });
  assert.equal(sessionWindowMax([shift(0, .1), shift(500, .2), shift(800, 10, true), shift(1500, .25)]), .1 + .2);
  // A continuous sequence must still start a fresh window at five seconds.
  const entries = Array.from({ length: 8 }, (_, i) => shift(i * 900, 1));
  assert.equal(sessionWindowMax(entries), 6);
});
test('explicit-interval blocking clips the portion after each task threshold', () => {
  const tasks: DiagnosticEntry[] = [{ type: 'longtask', startTime: 10, duration: 100 },
    { type: 'longtask', startTime: 200, duration: 40 }];
  assert.equal(intervalBlockingMs(tasks, 0, 300), 50);
  assert.equal(intervalBlockingMs(tasks, 75, 95), 20);
  assert.throws(() => intervalBlockingMs(tasks, 1, 0), RangeError);
});
