import { describe, expect, it } from 'vitest';
import {
  decodeBase64URL,
  encodeBase64URL,
} from '../../src/lib/codecs/base64url';
import { encodeMessage } from '../../src/lib/validation/input';

describe('canonical codecs and exact UTF-8', () => {
  it('round-trips every byte and maximum envelope sizes', () => {
    for (const length of [0, 1, 2, 3, 256, 438, 566, 65948, 66076]) {
      const bytes = Uint8Array.from({ length }, (_, i) => i % 256);
      expect(decodeBase64URL(encodeBase64URL(bytes))).toEqual(bytes);
    }
    expect(encodeBase64URL(new Uint8Array(438))).toHaveLength(584);
    expect(encodeBase64URL(new Uint8Array(566))).toHaveLength(755);
  });
  it('rejects pad aliases, whitespace, padding and bad lengths', () => {
    for (const raw of [
      'A',
      'AB',
      'AAB',
      'AA=',
      'AA\n',
      'AA+',
      'AA/',
      'é',
      'A'.repeat(88103),
    ])
      expect(() => decodeBase64URL(raw)).toThrow();
  });
  it('validates the original UTF-16 string before encoding', () => {
    for (const value of ['\ud800', '\udc00', 'x\ud800x', '\udc00\ud800'])
      expect(() => encodeMessage(value)).toThrow();
    for (const value of [
      '',
      '  \r\n',
      'שלום العربية',
      'e\u0301',
      '🔑',
      '\u0000',
    ])
      expect(new TextDecoder().decode(encodeMessage(value))).toBe(value);
    expect(encodeMessage('a'.repeat(65536))).toHaveLength(65536);
    expect(() => encodeMessage('🔑'.repeat(16385))).toThrow();
  });
});
