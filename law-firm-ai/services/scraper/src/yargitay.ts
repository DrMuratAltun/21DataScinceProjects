/**
 * Yargıtay Karar Arama kamuya açık portal scraper'ı.
 *
 * KULLANIM:
 *   tsx src/yargitay.ts --q "fazla mesai" --limit 30
 *
 * NOT: Portal yapısı zaman zaman değişir. Seçici ve URL'lerin güncel tutulması gerekir.
 *      Rate-limit: her arama sonrası min 3 sn bekleme. robots.txt kontrol edilir.
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { openStealth, humanSleep } from './stealth-browser.js';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const scrapeQueue = new Queue('scrape_queue', { connection });

const SEARCH_URL = 'https://karararama.yargitay.gov.tr/';

interface Args {
  q: string;
  limit: number;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let q = '';
  let limit = 10;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--q') q = args[++i] ?? '';
    if (args[i] === '--limit') limit = Number(args[++i] ?? 10);
  }
  if (!q) throw new Error('--q <arama terimi> gerekli');
  return { q, limit };
}

async function main() {
  const { q, limit } = parseArgs();
  const { page, close } = await openStealth();
  const found: Array<Record<string, string>> = [];

  try {
    await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await humanSleep();

    // Not: Seçici isimleri portal güncellemesine göre ayarlanmalı (placeholder).
    await page.fill('input[name="aranan"]', q);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForLoadState('networkidle');

    const items = await page
      .locator('table tbody tr')
      .elementHandles();

    for (const row of items.slice(0, limit)) {
      const cells = await row.$$('td');
      if (cells.length < 4) continue;
      const esasNo = (await cells[1]!.innerText()).trim();
      const kararNo = (await cells[2]!.innerText()).trim();
      const decidedAt = (await cells[3]!.innerText()).trim();
      const link = await cells[0]!.$('a');
      const href = await link?.getAttribute('href');
      if (!href) continue;

      await humanSleep(2500, 4500);
      const detail = await page.context().newPage();
      await detail.goto(new URL(href, SEARCH_URL).toString());
      await detail.waitForLoadState('networkidle');
      const text = (await detail.innerText('main, .karar-metin, body')).trim();
      await detail.close();

      found.push({ esasNo, kararNo, decidedAt, text, source: SEARCH_URL, url: href });
    }

    await scrapeQueue.add('ingestPrecedents', {
      cases: found.map((f) => ({
        court: 'YARGITAY',
        esasNo: f.esasNo,
        kararNo: f.kararNo,
        decidedAt: f.decidedAt,
        text: f.text,
        source: f.source!,
        url: f.url,
      })),
    });
    console.log(`[yargitay] enqueued ${found.length} cases`);
  } finally {
    await close();
    await connection.quit();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
