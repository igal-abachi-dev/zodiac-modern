import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assetKey, navigationAllowed, entry, csp } from '../native/policy.mjs';
test('local canonical asset paths only', () => {
  assert.equal(assetKey(entry), 'index.html');
  assert.equal(assetKey('neutronstar://app/assets/main-X.js'), 'assets/main-X.js');
  for (const raw of [
    'https://example.com/index.html',
    'file:///C:/secret',
    'neutronstar://evil/index.html',
    'neutronstar://app/../secret',
    'neutronstar://app/%2e%2e/secret',
    'neutronstar://app/a\\b',
    'neutronstar://app/a//b',
  ])
    assert.equal(assetKey(raw), null, raw);
  assert.equal(assetKey(entry, 'POST'), null);
});
test('entry/hash navigation and restrictive CSP', () => {
  assert(navigationAllowed(entry + '#/workbench'));
  assert(!navigationAllowed('neutronstar://app/other.html'));
  assert(!navigationAllowed(entry + '?other'));
  assert(csp.includes("worker-src 'none'"));
  assert(!csp.includes('unsafe-inline'));
});
