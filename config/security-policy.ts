// One source for built local/provider policies; hashes are computed after build.
export function securityHeaders(scriptHashes: string[], styleHashes: string[]) {
  const csp = [
    "default-src 'none'",
    `script-src 'self' ${scriptHashes.join(' ')}`,
    "script-src-attr 'none'",
    `style-src 'self' ${styleHashes.join(' ')}`,
    "style-src-attr 'none'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cache-Control': 'no-store',
  };
}
