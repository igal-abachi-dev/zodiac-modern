import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { validatePublicPEM } from './public-recipient.mjs';

export async function prepareRecipient(mode = 'production') {
  let recipient = null;
  if (mode !== 'custom') {
    const configPath =
      mode === 'fixture'
        ? 'tests/fixtures/recipient.json'
        : 'config/recipient.json';
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    if (
      typeof config.name !== 'string' ||
      !config.name.trim() ||
      config.name.length > 120 ||
      typeof config.publicKey !== 'string' ||
      !/^[a-f0-9]{64}$/.test(config.fingerprint ?? '')
    )
      throw new Error(
        'Recipient name, public PEM path and full expected fingerprint are required.',
      );
    const keyRoot = resolve(
      mode === 'fixture' ? 'receiver/tests/fixtures/keys' : 'public/keys',
    );
    const path = resolve(config.publicKey);
    const keyRelative = relative(keyRoot, path);
    if (
      keyRelative.startsWith('..') ||
      keyRelative.includes(':') ||
      !keyRelative.endsWith('-public.pem')
    )
      throw new Error(
        'Public recipient path must stay in the configured public-key directory.',
      );
    recipient = {
      ...validatePublicPEM(await readFile(path, 'utf8')),
      name: config.name,
      source: mode,
    };
    if (recipient.fingerprint !== config.fingerprint)
      throw new Error('Recipient fingerprint mismatch.');
    if (mode === 'production') {
      let manifest;
      try {
        manifest = JSON.parse(
          await readFile('receiver/tests/fixtures/manifest.json', 'utf8'),
        );
      } catch {
        throw new Error(
          'Fixture denylist must be present before production configuration.',
        );
      }
      if (
        manifest.fixtures.some((f) => f.fingerprint === recipient.fingerprint)
      )
        throw new Error('Synthetic fixture cannot be a production recipient.');
    }
  }
  await mkdir('src/generated', { recursive: true });
  await writeFile(
    'src/generated/default-recipient.ts',
    `// Generated public data only. Never place private material here.\nimport type { PublicRecipientData } from '../types/crypto';\nexport const defaultRecipient: PublicRecipientData | null = ${JSON.stringify(recipient)};\n`,
  );
  return recipient;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  try {
    await prepareRecipient(
      process.argv.includes('--custom-only')
        ? 'custom'
        : process.argv.includes('--fixture')
          ? 'fixture'
          : 'production',
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
