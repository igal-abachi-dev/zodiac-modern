const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  const webview = window.chrome.webview;
  if (!CSS.supports('app-region', 'drag') && !CSS.supports('-webkit-app-region', 'drag')) throw new Error('Drag CSS unavailable');
  // Exact grammar rejection must not perform an operation or close the window.
  for (const invalid of [{ command: 'close' }, 'neutronstar.window.close.v2', 'neutronstar.window.close.v1 ']) webview.postMessage(invalid);
  webview.postMessage('neutronstar.action.encrypt.v1'); // Window commands must work during the independent busy gate.
  webview.postMessage('neutronstar.window.toggle-maximize.v1');
  await pause(500);
  webview.postMessage('neutronstar.window.toggle-maximize.v1');
  await pause(500);
  document.title = 'NeutronStar smoke: PASS';
  await pause(200);
  // Queue both before minimization so timer throttling cannot strand a hidden test.
  webview.postMessage('neutronstar.window.minimize.v1');
  webview.postMessage('neutronstar.window.close.v1');
} catch {
  document.title = 'NeutronStar smoke: FAIL';
}
