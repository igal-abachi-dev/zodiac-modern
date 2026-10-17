const bridge = window.chrome.webview;
let busy = 0;
let complete = 0;
bridge.addEventListener('message', event => {
  if (event.data === 'neutronstar.status.busy.v1') {
    ++busy;
  }
  if (event.data === 'neutronstar.status.succeeded.v1') ++complete;
});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  bridge.postMessage({ command: 'run', payload: 'not supported' });
  bridge.postMessage('not-a-command');
  bridge.postMessage('neutronstar.window.close.v1'); // Window control capability is absent here.
  bridge.postMessage('neutronstar.window.toggle-maximize.v1');
  bridge.postMessage('neutronstar.window.minimize.v1');
  bridge.postMessage('neutronstar.test.greet.v1:0123456789abcdef0123456789abcdef:'); // Disabled in the action-only host.
  bridge.postMessage('x'.repeat(128));
  bridge.postMessage('neutronstar.action.encrypt.v1\0unexpected');
  for (const action of ['encrypt', 'decrypt']) {
    const before = complete;
    bridge.postMessage(`neutronstar.action.${action}.v1`);
    if (action === 'encrypt') bridge.postMessage('neutronstar.action.decrypt.v1'); // Same JS turn: duplicate while busy.
    for (let i = 0; i < 300 && complete === before; ++i) await pause(10);
    if (complete !== before + 1) throw new Error('No fixed native acknowledgment');
  }
  if (busy !== 2 || complete !== 2) throw new Error('Unexpected native status sequence');
  document.title = 'NeutronStar smoke: PASS';
} catch {
  document.title = 'NeutronStar smoke: FAIL';
}
