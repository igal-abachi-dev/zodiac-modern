// Publish only synthetic validation evidence, never arbitrary application logs.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const report = JSON.parse(
  await readFile('artifacts/rec01/latest.json', 'utf8'),
);
if (report.status !== 'automated checks passed')
  throw new Error('No passing foundation evidence to snapshot.');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const [file, hash] of Object.entries(report.hashes))
  if (sha256(await readFile(file)) !== hash)
    throw new Error(`Covered input changed; reopen evidence: ${file}`);
const checks = [];
for (const check of report.checks) {
  const log = await readFile(check.log);
  if (sha256(log) !== check.sha256)
    throw new Error('Validation log hash changed.');
  const output = log.toString('utf8');
  checks.push({
    ...check,
    evidence: check.name.startsWith('Fuzz')
      ? output
      : check.name === 'native-tests'
        ? output
            .split('\n')
            .filter((line) =>
              /native unlock duration|native KDF\+unlock|allocations:|single-bit private-exponent mutations|^ok\s|^PASS$/.test(
                line,
              ),
            )
            .join('\n')
        : output,
  });
}
await writeFile(
  'docs/reviews/rec01-evidence.json',
  JSON.stringify({ ...report, checks }, null, 2) + '\n',
);
console.log(
  'Exact source/vendor/fixture hashes and nonsecret synthetic evidence snapshotted for review.',
);
