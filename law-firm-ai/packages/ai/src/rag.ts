import { prisma } from '@law-firm-ai/db';
import { embedOne } from './ollama.js';

export interface RetrieveOptions {
  query: string;
  clientIds?: string[];
  caseIds?: string[];
  documentIds?: string[];
  topK?: number;
  includePrecedents?: boolean;
  /** BM25 ve vektör sonuçlarını birleştirme parametresi (k sabiti). */
  rrfK?: number;
}

export interface Citation {
  chunkId: string;
  documentId?: string;
  precedentId?: string;
  content: string;
  score: number;
  source: 'document' | 'precedent';
  meta?: Record<string, unknown>;
}

/**
 * Hibrit retrieve: pgvector HNSW (cosine) + Postgres tsvector (BM25-ish) → RRF birleştirme.
 * Ayrı ayrı top-N getirir, sonra Reciprocal Rank Fusion ile birleştirir.
 *
 * Rerank worker'da ayrı bir adımda yapılır (cross-encoder ONNX).
 */
export async function retrieve(opts: RetrieveOptions): Promise<Citation[]> {
  const topK = opts.topK ?? 8;
  const rrfK = opts.rrfK ?? 60;
  const qVec = await embedOne(opts.query);
  const vecLit = `[${qVec.join(',')}]`;

  const scopeFilters: string[] = ['"deletedAt" IS NULL'];
  if (opts.clientIds?.length) {
    scopeFilters.push(`"clientId" = ANY('{${opts.clientIds.join(',')}}')`);
  }
  if (opts.caseIds?.length) {
    scopeFilters.push(`"caseId" = ANY('{${opts.caseIds.join(',')}}')`);
  }
  if (opts.documentIds?.length) {
    scopeFilters.push(`"id" = ANY('{${opts.documentIds.join(',')}}')`);
  }
  const docWhere = scopeFilters.join(' AND ');

  // Vektör arama
  const vecRows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    documentId: string;
    content: string;
    distance: number;
  }>>(`
    SELECT c.id, c."documentId", c.content,
           (c.embedding <=> $1::vector) AS distance
    FROM "DocumentChunk" c
    JOIN "Document" d ON d.id = c."documentId"
    WHERE c.embedding IS NOT NULL AND ${docWhere.replaceAll('"clientId"', 'd."clientId"').replaceAll('"caseId"', 'd."caseId"').replaceAll('"id"', 'd."id"').replaceAll('"deletedAt"', 'd."deletedAt"')}
    ORDER BY c.embedding <=> $1::vector
    LIMIT ${topK * 2}
  `, vecLit);

  // Full-text (BM25-ish) arama
  const ftsRows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    documentId: string;
    content: string;
    rank: number;
  }>>(`
    SELECT c.id, c."documentId", c.content,
           ts_rank(c.tsv, plainto_tsquery('turkish_unaccent', $1)) AS rank
    FROM "DocumentChunk" c
    JOIN "Document" d ON d.id = c."documentId"
    WHERE c.tsv @@ plainto_tsquery('turkish_unaccent', $1)
      AND ${docWhere.replaceAll('"clientId"', 'd."clientId"').replaceAll('"caseId"', 'd."caseId"').replaceAll('"id"', 'd."id"').replaceAll('"deletedAt"', 'd."deletedAt"')}
    ORDER BY rank DESC
    LIMIT ${topK * 2}
  `, opts.query);

  // RRF birleştirme
  const scoreMap = new Map<string, { citation: Citation; score: number }>();
  vecRows.forEach((row, i) => {
    const id = row.id;
    const contrib = 1 / (rrfK + i + 1);
    const existing = scoreMap.get(id);
    if (existing) existing.score += contrib;
    else
      scoreMap.set(id, {
        score: contrib,
        citation: {
          chunkId: row.id,
          documentId: row.documentId,
          content: row.content,
          source: 'document',
          score: 1 - row.distance,
        },
      });
  });
  ftsRows.forEach((row, i) => {
    const id = row.id;
    const contrib = 1 / (rrfK + i + 1);
    const existing = scoreMap.get(id);
    if (existing) existing.score += contrib;
    else
      scoreMap.set(id, {
        score: contrib,
        citation: {
          chunkId: row.id,
          documentId: row.documentId,
          content: row.content,
          source: 'document',
          score: row.rank,
        },
      });
  });

  let results = [...scoreMap.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => ({ ...x.citation, score: x.score }));

  if (opts.includePrecedents) {
    const precRows = await prisma.$queryRawUnsafe<Array<{
      id: string;
      text: string;
      summary: string | null;
      court: string;
      distance: number;
    }>>(`
      SELECT id, text, summary, court,
             (embedding <=> $1::vector) AS distance
      FROM "PrecedentCase"
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT ${topK}
    `, vecLit);
    const precCitations = precRows.map((r) => ({
      chunkId: r.id,
      precedentId: r.id,
      content: r.summary ?? r.text.slice(0, 1500),
      source: 'precedent' as const,
      score: 1 - r.distance,
      meta: { court: r.court },
    }));
    results = [...results, ...precCitations]
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  return results;
}
