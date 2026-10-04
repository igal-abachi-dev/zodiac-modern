// Deliberately nonsecret challenge. No persistence or possession claim here.
export function readinessMessage(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return 'Zodiac readiness: ' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
