import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { expectedHeaders } from './build-host-headers.mjs';

export async function checkPolicy(root) {
  const expected = await expectedHeaders(root);
  const actual = JSON.parse(
    await readFile(join(root, '.security-headers.json'), 'utf8'),
  );
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw Error('Security headers do not match the exact built HTML blocks.');
  const provider = await readFile(join(root, '_headers'), 'utf8');
  const expectedProvider =
    '/*\n' +
    Object.entries(expected)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n') +
    '\n';
  if (provider !== expectedProvider)
    throw Error('Provider headers differ from the built policy.');
  // Pages currently caps each complete header line at 2,000 characters. Fail instead of
  // silently emitting an unsupported policy or weakening it.
  if (
    Object.entries(expected).some(
      ([key, value]) => `  ${key}: ${value}`.length > 2000,
    )
  )
    throw Error('Static provider header exceeds the supported value limit.');
  return expected;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  await checkPolicy(process.argv[2] ?? 'dist');
  console.log('Exact artifact/header/provider policy synchronization passed.');
}
