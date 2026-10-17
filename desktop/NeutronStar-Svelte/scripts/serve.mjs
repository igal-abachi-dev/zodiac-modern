// Local production-asset correctness preview, not a desktop host or deployment.
import { createPreviewServer } from './preview/server.mjs';

const server = await createPreviewServer();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
  await server.close();
});
try {
  await server.listen({ port: 4188, host: '127.0.0.1' });
  console.log('NeutronStar built preview: http://127.0.0.1:4188/ (Ctrl+C to stop)');
} catch {
  console.error('Preview could not start. Build dist/ and check that port 4188 is free.');
  await server.close();
  process.exitCode = 1;
}
