import { Queue, type QueueOptions } from 'bullmq';
import IORedis from 'ioredis';

export const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const baseOpts: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 604800 },
  },
};

/** pdf_queue — PDF parse + semantic chunking. CPU ağırlıklı, tek seferde 1 job. */
export const pdfQueue = new Queue('pdf_queue', baseOpts);

/** embedding_queue — Ollama embed çağrısı. GPU/Metal ağırlıklı, concurrency=2. */
export const embeddingQueue = new Queue('embedding_queue', baseOpts);

/** scrape_queue — Playwright scraping. Network ağırlıklı, rate-limited. */
export const scrapeQueue = new Queue('scrape_queue', baseOpts);

/** report_queue — PDF fatura / dilekçe üretimi. I/O ağırlıklı. */
export const reportQueue = new Queue('report_queue', baseOpts);
