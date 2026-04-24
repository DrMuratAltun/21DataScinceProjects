import { Worker } from 'bullmq';
import { prisma } from '@law-firm-ai/db';
import { embed } from '@law-firm-ai/ai';
import { connection } from '../queues.js';

/**
 * scrape_queue worker — Playwright scraping iş lojiği services/scraper paketinde.
 * Bu worker scraper CLI'den gelen kararları DB'ye yazar ve embedding üretir.
 */

interface ScrapeJobPayload {
  cases: Array<{
    court: 'YARGITAY' | 'DANISTAY' | 'ANAYASA_MAHKEMESI' | 'BAM' | 'DIGER';
    chamber?: string;
    esasNo: string;
    kararNo: string;
    decidedAt: string;
    summary?: string;
    text: string;
    source: string;
    url?: string;
  }>;
}

new Worker(
  'scrape_queue',
  async (job) => {
    const { cases } = job.data as ScrapeJobPayload;
    for (const c of cases) {
      const existing = await prisma.precedentCase.findUnique({
        where: { court_esasNo_kararNo: { court: c.court, esasNo: c.esasNo, kararNo: c.kararNo } },
      });
      if (existing) continue;

      const [vec] = await embed([c.summary ?? c.text.slice(0, 4000)]);
      const created = await prisma.precedentCase.create({
        data: {
          court: c.court,
          chamber: c.chamber,
          esasNo: c.esasNo,
          kararNo: c.kararNo,
          decidedAt: new Date(c.decidedAt),
          summary: c.summary,
          text: c.text,
          source: c.source,
          url: c.url,
        },
      });
      if (vec) {
        const literal = `[${vec.join(',')}]`;
        await prisma.$executeRawUnsafe(
          `UPDATE "PrecedentCase" SET embedding = $1::vector WHERE id = $2`,
          literal,
          created.id,
        );
      }
    }
    console.log(`[scrape] ingested ${cases.length} precedents`);
  },
  { connection, concurrency: 1 },
)
  .on('completed', (job) => console.log(`[scrape] done ${job.id}`))
  .on('failed', (job, err) => console.error(`[scrape] failed ${job?.id}:`, err));
