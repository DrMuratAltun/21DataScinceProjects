import { scanRegex, applyMask, isValidTckn, type PiiMatch, type PiiKind } from './regex.js';
import { analyzeWithPresidio, type ExtendedMatch } from './presidio.js';
import { classifyUncertain } from './agent.js';

export { scanRegex, applyMask, isValidTckn, type PiiMatch, type PiiKind };
export { analyzeWithPresidio, type ExtendedMatch };
export { classifyUncertain };

export interface MaskingResult {
  original: string;
  masked: string;
  matches: Array<ExtendedMatch & { finalKind: string }>;
}

export interface MaskingOptions {
  /** Presidio servis erişilemezse sadece regex ile devam et. */
  allowFallback?: boolean;
  /** Belirsiz span'leri gemma4:9b'ye sormayı atla (kritik yollarda hız için). */
  skipAgent?: boolean;
}

/**
 * Hibrit PII maskeleme:
 *   1) regex (yüksek precision: TCKN, IBAN, ...)
 *   2) Presidio analyzer (PERSON, LOCATION, ORG + TR_TCKN özel recognizer)
 *   3) score < threshold olanlar gemma4:9b'ye sorulur (isPii=false → düşür)
 *   4) Üçünün union'ı → `applyMask`
 */
export async function maskPii(text: string, opts: MaskingOptions = {}): Promise<MaskingResult> {
  const regexHits: ExtendedMatch[] = scanRegex(text).map((m) => ({ ...m, uncertain: false }));

  let presidioHits: ExtendedMatch[] = [];
  try {
    presidioHits = await analyzeWithPresidio(text);
  } catch (err) {
    if (!opts.allowFallback) throw err;
  }

  // Regex ile aynı aralıkları çıkar (regex öncelikli)
  const merged: ExtendedMatch[] = [...regexHits];
  for (const p of presidioHits) {
    const clash = merged.some((r) => rangesOverlap(r, p));
    if (!clash) merged.push(p);
  }

  // Belirsizleri agent'a sor
  if (!opts.skipAgent) {
    for (const m of merged.filter((x) => x.uncertain)) {
      const verdict = await classifyUncertain(m.value, contextAround(text, m.start, m.end));
      if (!verdict.isPii) {
        m.confidence = 0; // düşür
      }
    }
  }

  const keep = merged.filter((m) => m.confidence > 0);
  keep.sort((a, b) => a.start - b.start);

  // `applyMask` PiiMatch bekler; Presidio PERSON/LOCATION vs için kind koruyarak cast
  const asPiiMatches: PiiMatch[] = keep.map((m) => ({
    kind: m.kind as PiiKind,
    start: m.start,
    end: m.end,
    value: m.value,
    confidence: m.confidence,
  }));
  const masked = applyMask(text, asPiiMatches);

  return {
    original: text,
    masked,
    matches: keep.map((m) => ({ ...m, finalKind: String(m.kind) })),
  };
}

function rangesOverlap(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}

function contextAround(text: string, start: number, end: number, radius = 80): string {
  const s = Math.max(0, start - radius);
  const e = Math.min(text.length, end + radius);
  return text.slice(s, e);
}
