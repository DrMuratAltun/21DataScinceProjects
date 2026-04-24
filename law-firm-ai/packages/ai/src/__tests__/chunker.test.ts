import { describe, it, expect } from 'vitest';
import { chunkLegalText } from '../chunker.js';

describe('chunkLegalText', () => {
  it('MADDE başlığını yeni chunk yapar', () => {
    const text = `GİRİŞ

Bu metin hukuki bir örnektir.

MADDE 1 - Amaç
Bu kanunun amacı...

MADDE 2 - Kapsam
Bu kanun...`;
    const chunks = chunkLegalText(text, { maxTokens: 512 });
    const maddeChunks = chunks.filter((c) => c.chunkType === 'MADDE');
    expect(maddeChunks.length).toBeGreaterThanOrEqual(2);
  });

  it('(1) ile başlayan fıkraları yakalar', () => {
    const text = `MADDE 5 - Tanımlar

(1) Bu kanunun uygulanmasında aşağıdaki tanımlar geçerlidir.
(2) İkinci fıkrası şu şekildedir.`;
    const chunks = chunkLegalText(text);
    expect(chunks.some((c) => c.chunkType === 'FIKRA')).toBe(true);
  });
});
