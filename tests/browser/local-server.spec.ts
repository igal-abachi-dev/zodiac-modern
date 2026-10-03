import { expect, test } from '@playwright/test';
test('local static helper rejects writes, nonlocal hosts and private metadata', async ({
  request,
}) => {
  const index = await request.get('/');
  expect(index.status()).toBe(200);
  expect(index.headers()['x-content-type-options']).toBe('nosniff');
  expect(index.headers()['referrer-policy']).toBe('no-referrer');
  expect((await request.post('/')).status()).toBe(403);
  expect(
    (
      await request.get('/', { headers: { Host: 'untrusted.example:4321' } })
    ).status(),
  ).toBe(403);
  for (const path of [
    '/.security-headers.json',
    '/_headers',
    '/receiver/go.mod',
    '/%2e%2e%2fAGENTS.md',
    '/%5c..%5cAGENTS.md',
  ])
    expect((await request.get(path)).status()).toBe(404);
  expect(await (await request.head('/')).body()).toHaveLength(0);
});
