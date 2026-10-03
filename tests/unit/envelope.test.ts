import { describe, expect, it } from 'vitest';
import {
  envelopeBytes,
  rawCharacters,
  serializeEnvelope,
  splitEnvelope,
} from '../../src/lib/codecs/envelope';
import { MAX_MESSAGE_BYTES, type RSABits } from '../../src/lib/crypto/profile';
describe('exact compatible envelope', () => {
  for (const bits of [3072, 4096] as const) {
    it(`preserves field offsets, all byte values and size boundaries for RSA-${bits}`, () => {
      for (const length of [0, 1, 2, 26, 256, MAX_MESSAGE_BYTES]) {
        const parts = {
          wrappedKey: new Uint8Array(bits / 8).fill(1),
          nonce: new Uint8Array(12).fill(2),
          tag: new Uint8Array(16).fill(3),
          ciphertext: Uint8Array.from({ length }, (_, i) => i % 256),
        };
        const bytes = serializeEnvelope(parts, bits);
        expect(bytes.length).toBe(envelopeBytes(bits, length));
        expect(splitEnvelope(bytes, bits)).toEqual(parts);
        expect(bytes[bits / 8 - 1]).toBe(1);
        expect(bytes[bits / 8]).toBe(2);
        expect(bytes[bits / 8 + 12]).toBe(3);
      }
      expect(rawCharacters(bits, 26)).toBe(bits === 3072 ? 584 : 755);
      expect(rawCharacters(bits, MAX_MESSAGE_BYTES)).toBe(
        bits === 3072 ? 87931 : 88102,
      );
      for (const length of [-1, 0.5, NaN, MAX_MESSAGE_BYTES + 1])
        expect(() => envelopeBytes(bits, length)).toThrow();
      for (const length of [
        envelopeBytes(bits, 0) - 1,
        envelopeBytes(bits, MAX_MESSAGE_BYTES) + 1,
      ])
        expect(() => splitEnvelope(new Uint8Array(length), bits)).toThrow();
      const good = {
        wrappedKey: new Uint8Array(bits / 8),
        nonce: new Uint8Array(12),
        tag: new Uint8Array(16),
        ciphertext: new Uint8Array(),
      };
      for (const field of ['wrappedKey', 'nonce', 'tag'] as const)
        expect(() =>
          serializeEnvelope(
            { ...good, [field]: new Uint8Array(good[field].length - 1) },
            bits,
          ),
        ).toThrow();
    });
  }
  it('rejects unsupported sizes at runtime', () =>
    expect(() => envelopeBytes(2048 as RSABits, 0)).toThrow());
});
