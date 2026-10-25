export const entry = 'neutronstar://app/index.html';
export const csp =
  "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
export const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
export function assetKey(raw, method = 'GET') {
  if (method !== 'GET' || raw.length > 4096) return null;
  // Reject non-canonical encodings before URL normalization can hide traversal.
  if (!/^neutronstar:\/\/app\//.test(raw) || /[\\%\x00-\x20]/.test(raw)) return null;
  const path = raw.slice('neutronstar://app/'.length).split(/[?#]/, 1)[0];
  if (
    !path ||
    path.split('/').some((p) => !p || p === '.' || p === '..' || !/^[A-Za-z0-9_.-]+$/.test(p))
  )
    return null;
  return path;
}
export function navigationAllowed(raw) {
  return raw === entry || raw.startsWith(entry + '#');
}
