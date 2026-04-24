import { chromium } from 'playwright-extra';
// @ts-expect-error - plugin types are implicit
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
];

export interface StealthContext {
  browser: Awaited<ReturnType<typeof chromium.launch>>;
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launchPersistentContext>>['newPage']>>;
  close: () => Promise<void>;
}

/**
 * Playwright-extra + stealth plugin ile insan-benzeri tarayıcı bağlamı.
 * Robots.txt ve rate-limit çağıran kodun sorumluluğunda.
 */
export async function openStealth(rotateUa = true): Promise<StealthContext> {
  const browser = await chromium.launch({ headless: true });
  const ua = rotateUa
    ? USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
    : USER_AGENTS[0];
  const context = await browser.newContext({
    userAgent: ua,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  return {
    browser,
    page,
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}

export async function humanSleep(minMs = 1500, maxMs = 3500): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  await new Promise((r) => setTimeout(r, ms));
}
