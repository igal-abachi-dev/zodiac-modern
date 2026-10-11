import { expect, it } from 'vitest';
import { deploymentOrigin, deliveredHeaders, boundedResponse } from '../../scripts/deployment-audit.mjs';

it('requires a bare HTTPS origin and explicitly confines loopback testing', () => {
  expect(deploymentOrigin('https://zodiac-modern.vercel.app').origin).toBe('https://zodiac-modern.vercel.app');
  for (const url of ['http://example.com', 'https://example.com/path', 'https://user:pass@example.com', 'https://example.com/?key=x', 'https://example.com/#secret'])
    expect(() => deploymentOrigin(url)).toThrow();
  expect(deploymentOrigin('http://127.0.0.1:4321', true).origin).toBe('http://127.0.0.1:4321');
  expect(() => deploymentOrigin('http://example.com', true)).toThrow();
});

it('rejects weakened/missing policy and short HTTPS HSTS', () => {
  const expected = { 'Content-Security-Policy': "default-src 'none'", 'X-Content-Type-Options': 'nosniff' };
  const headers = new Headers({ ...expected, 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' });
  expect(() => deliveredHeaders(headers, expected, true)).not.toThrow();
  headers.set('Content-Security-Policy', "default-src 'self'");
  expect(() => deliveredHeaders(headers, expected, true)).toThrow('security header');
  headers.set('Content-Security-Policy', expected['Content-Security-Policy']);
  headers.set('Strict-Transport-Security', 'max-age=0');
  expect(() => deliveredHeaders(headers, expected, true)).toThrow('HSTS');
});

it('bounds actual response bytes rather than trusting content-length', async () => {
  const response = new Response('unexpected extra bytes', { headers: { 'Content-Length': '1' } });
  await expect(boundedResponse(response, 3)).rejects.toThrow('exceeds');
  expect((await boundedResponse(new Response('abc'), 3)).toString()).toBe('abc');
});
