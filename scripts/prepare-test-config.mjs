import { readFile, mkdir, writeFile } from 'node:fs/promises';
const manifest = JSON.parse(
  await readFile('receiver/tests/fixtures/manifest.json', 'utf8'),
);
const fixture = manifest.fixtures.find(
  (f) => f.filename === 'openssl-3.5-3072.pem',
);
await mkdir('tests/fixtures', { recursive: true });
await writeFile(
  'tests/fixtures/recipient.json',
  JSON.stringify(
    {
      name: 'SYNTHETIC INTEROPERABILITY FIXTURE — NEVER PRODUCTION',
      publicKey: 'receiver/tests/fixtures/keys/openssl-3.5-3072-public.pem',
      fingerprint: fixture.fingerprint,
    },
    null,
    2,
  ) + '\n',
);
