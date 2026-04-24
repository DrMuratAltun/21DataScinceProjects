import { Worker } from 'bullmq';
import { prisma } from '@law-firm-ai/db';
import { embed } from '@law-firm-ai/ai';
import { connection } from '../queues.js';

const BATCH = 16;

new Worker(
  'embedding_queue',
  async (job) => {
    const { documentId } = job.data as { documentId: string };
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId, embedding: { equals: null } as never },
      orderBy: { chunkIndex: 'asc' },
    });

    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const vectors = await embed(batch.map((b) => b.content));
      for (let j = 0; j < batch.length; j++) {
        const vec = vectors[j];
        if (!vec) continue;
        const chunk = batch[j]!;
        // pgvector literal: '[1.2,3.4,...]'::vector
        const literal = `[${vec.join(',')}]`;
        await prisma.$executeRawUnsafe(
          `UPDATE "DocumentChunk" SET embedding = $1::vector WHERE id = $2`,
          literal,
          chunk.id,
        );
      }
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { indexedAt: new Date() },
    });
    console.log(`[embed] ${documentId}: embedded ${chunks.length}, HNSW upserted`);
  },
  { connection, concurrency: 2 },
)
  .on('completed', (job) => console.log(`[embed] done ${job.id}`))
  .on('failed', (job, err) => console.error(`[embed] failed ${job?.id}:`, err));
