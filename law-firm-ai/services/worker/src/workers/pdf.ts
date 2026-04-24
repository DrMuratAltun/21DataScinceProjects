import { Worker } from 'bullmq';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { prisma } from '@law-firm-ai/db';
import { chunkLegalText } from '@law-firm-ai/ai';
import { connection, embeddingQueue } from '../queues.js';

const STORAGE_ROOT = process.env.STORAGE_ROOT ?? './storage';

async function extractText(absPath: string, mime: string): Promise<string> {
  if (mime.includes('pdf') || absPath.endsWith('.pdf')) {
    const buf = await fs.readFile(absPath);
    const r = await pdfParse(buf);
    return r.text;
  }
  if (mime.includes('word') || absPath.endsWith('.docx')) {
    const r = await mammoth.extractRawText({ path: absPath });
    return r.value;
  }
  return fs.readFile(absPath, 'utf8');
}

new Worker(
  'pdf_queue',
  async (job) => {
    const { documentId } = job.data as { documentId: string };
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) return;

    const abs = path.join(STORAGE_ROOT, doc.storagePath);
    const text = await extractText(abs, doc.mimeType);
    const chunks = chunkLegalText(text, { maxTokens: 512, overlapTokens: 64 });

    await prisma.documentChunk.deleteMany({ where: { documentId } });
    for (const c of chunks) {
      await prisma.documentChunk.create({
        data: {
          documentId,
          chunkIndex: c.index,
          content: c.content,
          chunkType: c.chunkType,
          tokenCount: c.tokenCount,
        },
      });
    }

    console.log(`[pdf] ${doc.title}: semantic chunked ${chunks.length}`);
    await embeddingQueue.add('embedDocument', { documentId });
  },
  { connection, concurrency: 1 },
)
  .on('completed', (job) => console.log(`[pdf] done ${job.id}`))
  .on('failed', (job, err) => console.error(`[pdf] failed ${job?.id}:`, err));
