import { mkdir, writeFile } from 'node:fs/promises';
import { auditDeployment } from './deployment-audit.mjs';
const args = process.argv.slice(2);
if (!args.length || args.length > 2 || (args[1] && args[1] !== '--local-test'))
  throw Error('Usage: pnpm check:deployment https://your-origin [--local-test for loopback only]');
const report = await auditDeployment('dist', args[0], { localTest: args[1] === '--local-test' });
await mkdir('artifacts/deployment', { recursive: true });
const path = `artifacts/deployment/check-${report.recorded.replace(/[-:.TZ]/g, '')}.json`;
await writeFile(path, JSON.stringify(report, null, 2) + '\n');
console.log(`Matched ${report.files.length} public files and expected headers; ${report.scope}\nEvidence: ${path}`);
