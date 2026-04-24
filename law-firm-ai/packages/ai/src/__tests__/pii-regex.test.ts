import { describe, it, expect } from 'vitest';
import { scanRegex, applyMask, isValidTckn } from '../pii/regex.js';

describe('PII regex', () => {
  it('algoritma ile geçerli TCKN doğrular', () => {
    expect(isValidTckn('10000000146')).toBe(true); // geçerli test TCKN
    expect(isValidTckn('12345678901')).toBe(false);
    expect(isValidTckn('00000000000')).toBe(false);
  });

  it('TCKN, IBAN ve telefonu yakalar', () => {
    const text = 'Müvekkil T.C. 10000000146, tel 0532 111 22 33, IBAN TR33 0006 1005 1978 6457 8413 26';
    const matches = scanRegex(text);
    const kinds = matches.map((m) => m.kind);
    expect(kinds).toContain('TCKN');
    expect(kinds).toContain('PHONE');
    expect(kinds).toContain('IBAN');
  });

  it('e-posta yakalar ve maskeler', () => {
    const text = 'İletişim: test@example.com';
    const masked = applyMask(text, scanRegex(text));
    expect(masked).toContain('[REDACTED_EMAIL]');
  });

  it('geçersiz TCKN yakalamaz', () => {
    const text = 'Yanlış numara: 12345678900';
    const matches = scanRegex(text);
    expect(matches.find((m) => m.kind === 'TCKN')).toBeUndefined();
  });
});
