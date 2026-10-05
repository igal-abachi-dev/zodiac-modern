// One source for built local/provider policies; hashes are computed after build.
export function contentSecurityPolicy(
  scriptHashes: string[],
  styleHashes: string[],
  offline = false,
) {
  for (const hash of [...scriptHashes, ...styleHashes])
    if (!/^'sha256-[A-Za-z0-9+/]{43}='$/.test(hash))
      throw Error('Invalid CSP build hash.');
  const csp = [
    "default-src 'none'",
    `script-src ${offline ? '' : "'self' "}${scriptHashes.join(' ')}`.trim(),
    "script-src-attr 'none'",
    `style-src ${offline ? '' : "'self' "}${styleHashes.join(' ')}`.trim(),
    "style-src-attr 'none'",
    offline ? 'img-src blob: data:' : "img-src 'self' blob: data:",
    offline ? "font-src 'none'" : "font-src 'self'",
    "connect-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    ...(offline ? [] : ["frame-ancestors 'none'"]),
  ].join('; ');
  return csp;
}
export function securityHeaders(scriptHashes: string[], styleHashes: string[]) {
  return {
    'Content-Security-Policy': contentSecurityPolicy(scriptHashes, styleHashes),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cache-Control': 'no-store',
  };
}
