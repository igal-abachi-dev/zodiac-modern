// A bounded example capability, not a generic native RPC or a secret transport.
type WebView = {
  postMessage(message: string): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
};
const webview = (window as Window & { chrome?: { webview?: WebView } }).chrome?.webview;
const requestPrefix = 'neutronstar.test.greet.v1:';
const resultPrefix = 'neutronstar.test.greet.result.v1:';
let pending: { id: string; resolve: (value: string) => void; reject: (reason: Error) => void; timer: number } | undefined;

function validUtf16(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const unit = value.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function onMessage(event: MessageEvent<unknown>): void {
  if (!pending || typeof event.data !== 'string' || !event.data.startsWith(resultPrefix)) return;
  const body = event.data.slice(resultPrefix.length);
  if (body.slice(0, 32) !== pending.id || body[32] !== ':') return;
  const hex = body.slice(33);
  if (hex.length > 256 * 4 || hex.length % 4 || !/^[0-9a-f]*$/.test(hex)) return;
  let text = '';
  for (let i = 0; i < hex.length; i += 4) text += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  if (!validUtf16(text)) return;
  const completed = pending;
  pending = undefined;
  clearTimeout(completed.timer);
  completed.resolve(text);
}
webview?.addEventListener('message', onMessage);
window.addEventListener('pagehide', () => {
  webview?.removeEventListener('message', onMessage);
  if (pending) {
    clearTimeout(pending.timer);
    pending.reject(new Error('Greeting document closed.'));
    pending = undefined;
  }
}, { once: true });

export function greet(name: string): Promise<string> {
  if (!webview) return Promise.reject(new Error('Native greeting requires NeutronStar Host.'));
  if (pending) return Promise.reject(new Error('A greeting is already pending.'));
  if (name.length > 120 || !validUtf16(name)) return Promise.reject(new Error('Invalid example name.'));
  const id = crypto.randomUUID().replaceAll('-', '');
  let hex = '';
  for (let i = 0; i < name.length; i++) hex += name.charCodeAt(i).toString(16).padStart(4, '0');
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending = undefined;
      reject(new Error('Native greeting timed out.'));
    }, 5000);
    pending = { id, resolve, reject, timer };
    try { webview.postMessage(requestPrefix + id + ':' + hex); }
    catch {
      clearTimeout(timer);
      pending = undefined;
      reject(new Error('Native greeting unavailable.'));
    }
  });
}
