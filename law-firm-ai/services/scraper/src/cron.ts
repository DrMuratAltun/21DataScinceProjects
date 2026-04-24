/**
 * Haftalık artımlı scraping cron'u. node-cron veya docker compose cron job ile
 * tetiklenir. MVP için basit loop; prod'da APScheduler benzeri kullanın.
 */
import { spawnSync } from 'node:child_process';

const TERMS = [
  'işçi alacağı',
  'kıdem tazminatı',
  'kira tespit',
  'boşanma nafaka',
  'idari işlem iptali',
  'vergi uyuşmazlığı',
];

for (const t of TERMS) {
  console.log(`[cron] yargitay "${t}"`);
  spawnSync('pnpm', ['yargitay', '--q', t, '--limit', '20'], { stdio: 'inherit' });
  console.log(`[cron] danistay "${t}"`);
  spawnSync('pnpm', ['danistay', '--q', t, '--limit', '20'], { stdio: 'inherit' });
}
