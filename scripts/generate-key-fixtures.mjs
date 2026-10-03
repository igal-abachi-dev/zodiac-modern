// Test tooling only. Every password/key produced here is disposable synthetic data.
import { spawnSync } from 'node:child_process';
import { createHash, createPublicKey } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('receiver/tests/fixtures/keys');
mkdirSync(root, { recursive: true });
const passwordFile = resolve(root, 'synthetic-password.txt');
writeFileSync(
  passwordFile,
  'Zodiac fixture only — never production\nZodiac fixture only — never production\n',
);
const password = `file:${passwordFile}`;
const executables = {
  '3.0': process.env.ZODIAC_OPENSSL30,
  3.5: process.env.ZODIAC_OPENSSL35,
};
if (!executables['3.0'] || !executables['3.5']) {
  throw new Error(
    'Set ZODIAC_OPENSSL30 and ZODIAC_OPENSSL35 to isolated real executables.',
  );
}
function run(exe, args, input) {
  const result = spawnSync(exe, args, {
    input,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(`Fixture command failed: ${args[0]}`);
  return result.stdout;
}
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const evidence = { synthetic: true, pemLineEndings: 'LF; normalized before byte hashing', generators: {}, fixtures: [] };
for (const [branch, exe] of Object.entries(executables)) {
  evidence.generators[branch] = {
    version: run(exe, ['version', '-a']).toString(),
    providers: run(exe, ['list', '-providers']).toString(),
    executableSHA256: hash(readFileSync(exe)),
  };
  for (const bits of [3072, 4096]) {
    const seed = resolve('.cache', `fixture-seed-${branch}-${bits}.pem`);
    run(exe, [
      'genpkey',
      '-algorithm',
      'RSA',
      '-pkeyopt',
      `rsa_keygen_bits:${bits}`,
      '-pkeyopt',
      'rsa_keygen_pubexp:65537',
      '-aes-256-cbc',
      '-pass',
      password,
      '-out',
      seed,
    ]);
    const filename = `openssl-${branch}-${bits}.pem`;
    const destination = resolve(root, filename);
    const command = [
      'pkcs8',
      '-topk8',
      '-in',
      seed,
      '-passin',
      password,
      '-passout',
      password,
      '-v2',
      'aes-256-cbc',
      '-v2prf',
      'hmacWithSHA256',
      '-iter',
      '600000',
      ...(branch === '3.5' ? ['-saltlen', '16'] : []),
      '-out',
      destination,
    ];
    run(exe, command);
    record(
      branch,
      bits,
      filename,
      command,
      branch === '3.0' ? 'reject: 8-byte salt' : 'success',
    );
    if (branch === '3.0') {
      const rewrapped = `openssl-3.0-rewrapped-3.5-${bits}.pem`;
      const rewrap = [
        'pkcs8',
        '-topk8',
        '-in',
        destination,
        '-passin',
        password,
        '-passout',
        password,
        '-v2',
        'aes-256-cbc',
        '-v2prf',
        'hmacWithSHA256',
        '-iter',
        '600000',
        '-saltlen',
        '16',
        '-out',
        resolve(root, rewrapped),
      ];
      run(executables['3.5'], rewrap);
      record('3.5', bits, rewrapped, rewrap, 'success', filename);
    }
  }
}
function record(branch, bits, filename, command, expected, origin) {
  const exe = executables[branch];
  const path = resolve(root, filename);
  // Keep the exact tracked bytes portable before the oracle or manifest hash.
  writeFileSync(path, readFileSync(path, 'utf8').replaceAll('\r\n', '\n'));
  let privateDER;
  try {
    privateDER = run(exe, [
      'pkcs8',
      '-in',
      path,
      '-passin',
      password,
      '-outform',
      'DER',
    ]);
    const publicDER = createPublicKey({
      key: privateDER,
      format: 'der',
      type: 'pkcs1',
    }).export({ format: 'der', type: 'spki' });
    const publicPEM = createPublicKey({
      key: publicDER,
      format: 'der',
      type: 'spki',
    }).export({ format: 'pem', type: 'spki' });
    writeFileSync(
      resolve(root, filename.replace('.pem', '-public.pem')),
      publicPEM,
    );
    const fingerprint = hash(publicDER);
    if (
      origin &&
      evidence.fixtures.find((f) => f.filename === origin)?.fingerprint !==
        fingerprint
    )
      throw new Error('Rewrap changed public key');
    evidence.fixtures.push({
      filename,
      bits,
      expected,
      sha256: hash(readFileSync(path)),
      fingerprint,
      oracle:
        'OpenSSL pkcs8 -in → in-memory PKCS#1 DER → canonical SPKI; decrypted buffer cleared',
      command: command.map((arg) =>
        arg.replace(resolve('.cache'), '<cache>').replace(root, '<fixtures>'),
      ),
      profileASN1: run(exe, ['asn1parse', '-in', path]).toString(),
    });
  } finally {
    privateDER?.fill(0);
  }
}
writeFileSync(
  resolve(root, '../manifest.json'),
  JSON.stringify(evidence, null, 2) + '\n',
);
console.log(
  `Recorded ${evidence.fixtures.length} real fixtures and OpenSSL public-key oracle results.`,
);
