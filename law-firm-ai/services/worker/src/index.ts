/**
 * Tek konteynerde tüm worker'ları başlatır (`WORKER_KINDS` env ile kısıtlanır).
 * Üretimde docker-compose her birini ayrı servis olarak çalıştırır.
 */

const kinds = (process.env.WORKER_KINDS ?? 'pdf,embedding,scrape,report').split(',');

for (const k of kinds) {
  const name = k.trim();
  if (!name) continue;
  switch (name) {
    case 'pdf':
      await import('./workers/pdf.js');
      break;
    case 'embedding':
      await import('./workers/embedding.js');
      break;
    case 'scrape':
      await import('./workers/scrape.js');
      break;
    case 'report':
      await import('./workers/report.js');
      break;
    default:
      console.warn(`Unknown worker kind: ${name}`);
  }
}

console.log(`[worker] started queues: ${kinds.join(', ')}`);
