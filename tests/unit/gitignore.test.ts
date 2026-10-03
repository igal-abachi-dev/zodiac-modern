import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
it('ignores generated/secret output while preserving release inputs and synthetic fixtures', () => {
  const ignored = [
    '.cache/toolchains/go.zip',
    'src/generated/default-recipient.ts',
    'tmp-tool-metadata.json',
    'dist/index.html',
    'artifacts/test-site/index.html',
    '.env.local',
    'production-private.pem',
    'receiver/bin/zodiac-decrypt.exe',
    'test-results/result.json',
  ];
  const tracked = [
    'pnpm-lock.yaml',
    'receiver/go.sum',
    'receiver/vendor/modules.txt',
    'receiver/vendor/golang.org/x/term/term.go',
    'receiver/tests/fixtures/keys/openssl-3.5-3072.pem',
    'receiver/tests/fixtures/keys/synthetic-password.txt',
    'public/keys/default-public.pem',
    'scripts/prepare-recipient.mjs',
  ];
  const result = spawnSync('git', ['check-ignore', '--no-index', '--stdin'], {
    input: [...ignored, ...tracked].join('\n') + '\n',
    encoding: 'utf8',
    windowsHide: true,
  });
  expect(result.status).toBe(0);
  expect(result.stdout.trim().split(/\r?\n/).sort()).toEqual(ignored.sort());
});
