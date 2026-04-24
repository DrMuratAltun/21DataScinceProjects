/**
 * Türkçe PII regex seti.
 *
 * Bu katman YÜKSEK güvenli eşleşmeler için (TCKN, telefon, IBAN, e-posta, plaka).
 * İsim / adres / unvan gibi belirsiz PII için Presidio + LLM fallback kullanılır.
 */

export type PiiKind =
  | 'TCKN'
  | 'PHONE'
  | 'IBAN'
  | 'EMAIL'
  | 'PLATE'
  | 'VKN'
  | 'CREDIT_CARD';

export interface PiiMatch {
  kind: PiiKind;
  start: number;
  end: number;
  value: string;
  confidence: number;
}

export const PII_PATTERNS: Record<PiiKind, RegExp> = {
  TCKN: /\b[1-9]\d{10}\b/g,
  VKN: /\b\d{10}\b/g, // Dikkat: VKN vs TCKN çakışır; TCKN öncelik
  PHONE: /(?:\+?90[\s-]?)?0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\b0?[2-4]\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g,
  IBAN: /\bTR\d{2}[\s]?(?:\d{4}[\s]?){5}\d{2}\b/gi,
  EMAIL: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
  PLATE: /\b\d{2}\s?[A-Z]{1,3}\s?\d{2,4}\b/g,
  CREDIT_CARD: /\b(?:\d[ -]*?){13,19}\b/g,
};

/** TCKN geçerlilik algoritması (son iki hane kontrolü). */
export function isValidTckn(tckn: string): boolean {
  if (!/^[1-9]\d{10}$/.test(tckn)) return false;
  const digits = tckn.split('').map(Number);
  const odds = digits[0]! + digits[2]! + digits[4]! + digits[6]! + digits[8]!;
  const evens = digits[1]! + digits[3]! + digits[5]! + digits[7]!;
  const d10 = (odds * 7 - evens) % 10;
  if (d10 < 0) return false;
  if (d10 !== digits[9]) return false;
  const sumFirst10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  return sumFirst10 % 10 === digits[10];
}

export function scanRegex(text: string): PiiMatch[] {
  const matches: PiiMatch[] = [];
  const taken = new Array<boolean>(text.length).fill(false);

  const push = (m: PiiMatch) => {
    for (let i = m.start; i < m.end; i++) {
      if (taken[i]) return; // çakışma varsa geç
    }
    for (let i = m.start; i < m.end; i++) taken[i] = true;
    matches.push(m);
  };

  // Öncelik: TCKN (valid) > IBAN > EMAIL > PHONE > PLATE > CREDIT_CARD > VKN
  const orderedKinds: PiiKind[] = ['TCKN', 'IBAN', 'EMAIL', 'PHONE', 'PLATE', 'CREDIT_CARD', 'VKN'];
  for (const kind of orderedKinds) {
    const pattern = new RegExp(PII_PATTERNS[kind].source, 'g' + (PII_PATTERNS[kind].flags.includes('i') ? 'i' : ''));
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const value = m[0];
      let confidence = 0.95;
      if (kind === 'TCKN' && !isValidTckn(value)) continue;
      if (kind === 'VKN') confidence = 0.6; // kontrol zayıf
      push({ kind, start: m.index, end: m.index + value.length, value, confidence });
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

/** Eşleşmeleri `[REDACTED_KIND]` ile değiştirir. */
export function applyMask(text: string, matches: PiiMatch[]): string {
  if (!matches.length) return text;
  const sorted = [...matches].sort((a, b) => b.start - a.start);
  let out = text;
  for (const m of sorted) {
    out = out.slice(0, m.start) + `[REDACTED_${m.kind}]` + out.slice(m.end);
  }
  return out;
}
