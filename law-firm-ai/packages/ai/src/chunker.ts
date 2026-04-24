/**
 * Hukuki metinler için **semantic chunker**.
 *
 * Sabit token yerine Türk hukuki belge yapısına (Madde / Fıkra / Paragraf / Başlık)
 * uygun sınırlarla ayırır. Tanınmazsa paragraf, o da yoksa cümle bazlı böler.
 * Maksimum chunk büyüklüğü `maxTokens` aşarsa en yakın cümle sınırından böler.
 */

export type ChunkType = 'MADDE' | 'FIKRA' | 'PARAGRAF' | 'BASLIK' | 'DIGER';

export interface Chunk {
  index: number;
  content: string;
  chunkType: ChunkType;
  tokenCount: number;
}

export interface ChunkerOptions {
  /** Hedef maksimum token (yaklaşık). Aşılırsa cümle sınırından böl. */
  maxTokens?: number;
  /** Chunk'lar arası bağlam çakışması (token). */
  overlapTokens?: number;
}

const MADDE_RE = /^\s*MADDE\s+\d+/i;
const FIKRA_RE = /^\s*\(\s*\d+\s*\)/;
const BASLIK_RE = /^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9 \-.,/]{2,80}$/;

// Kaba token tahmini: TR için ~3.5 karakter/token varsayımı. Worker'da tiktoken ile override edilir.
function approxTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/** Metni `MADDE X`, `(1)`, başlık satırları, boş satırla bölünmüş paragraflara ayırır. */
function splitByStructure(text: string): Array<{ text: string; type: ChunkType }> {
  const normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ');
  const lines = normalized.split('\n');
  const out: Array<{ text: string; type: ChunkType }> = [];
  let buf: string[] = [];
  let currentType: ChunkType = 'PARAGRAF';

  const flush = () => {
    const joined = buf.join('\n').trim();
    if (joined) out.push({ text: joined, type: currentType });
    buf = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      currentType = 'PARAGRAF';
      continue;
    }
    if (MADDE_RE.test(line)) {
      flush();
      currentType = 'MADDE';
      buf.push(line);
      continue;
    }
    if (FIKRA_RE.test(line)) {
      flush();
      currentType = 'FIKRA';
      buf.push(line);
      continue;
    }
    if (BASLIK_RE.test(line) && line.length < 80) {
      flush();
      out.push({ text: line, type: 'BASLIK' });
      currentType = 'PARAGRAF';
      continue;
    }
    buf.push(line);
  }
  flush();
  return out;
}

/** Büyük chunk'ları cümle sınırından ikiye böler. */
function splitLargeBySentence(text: string, maxTokens: number): string[] {
  if (approxTokens(text) <= maxTokens) return [text];
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ])/);
  const out: string[] = [];
  let cur: string[] = [];
  let curTokens = 0;
  for (const s of sentences) {
    const t = approxTokens(s);
    if (curTokens + t > maxTokens && cur.length) {
      out.push(cur.join(' '));
      cur = [];
      curTokens = 0;
    }
    cur.push(s);
    curTokens += t;
  }
  if (cur.length) out.push(cur.join(' '));
  return out;
}

export function chunkLegalText(text: string, opts: ChunkerOptions = {}): Chunk[] {
  const maxTokens = opts.maxTokens ?? 512;
  const overlap = opts.overlapTokens ?? 64;
  const units = splitByStructure(text);
  const chunks: Chunk[] = [];
  let idx = 0;

  for (const unit of units) {
    const pieces = splitLargeBySentence(unit.text, maxTokens);
    for (let i = 0; i < pieces.length; i++) {
      let content = pieces[i]!;
      // Önceki parçadan overlap ekle (MADDE başında overlap yok — bağlam netliği için)
      if (i > 0 && overlap > 0 && unit.type !== 'MADDE') {
        const prev = pieces[i - 1]!;
        const words = prev.split(/\s+/);
        const tail = words.slice(Math.max(0, words.length - Math.ceil(overlap / 2))).join(' ');
        content = `${tail}\n\n${content}`;
      }
      chunks.push({
        index: idx++,
        content: content.trim(),
        chunkType: unit.type,
        tokenCount: approxTokens(content),
      });
    }
  }
  return chunks;
}
