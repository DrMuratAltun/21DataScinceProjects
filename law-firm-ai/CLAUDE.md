# CLAUDE.md — law-firm-ai

Bu proje, hukuk bürosu yönetimi + yerel LLM asistanı monorepo'sudur.

## Mutlak kurallar

1. **KVKK append-only**: Hiçbir yerde `prisma.X.delete` veya `deleteMany` doğrudan
   çağırılmaz. ESLint `no-restricted-syntax` kuralı engeller. Silme → soft-delete
   extension (`deletedAt: now`) + otomatik `AuditLog`.
2. **Yerel LLM**: OpenAI vs. dış API çağrısı YOK. Tüm LLM trafiği Ollama
   (`localhost:11434`) üzerinden geçer. Ana model `qwen3.6:32b-instruct-q4_K_M`,
   yardımcı `gemma4:9b`, embedding `multilingual-e5-large`.
3. **PII**: Kullanıcı dışına gidecek her metin (export, e-posta, AI yanıtı) `maskPii`
   toggle edildiğinde `packages/ai/src/pii/index.ts` pipeline'ından geçer.

## Yapı özeti

- `apps/web` — Next.js 16 UI + API. Server Actions tercih edilir, Route Handler
  sadece streaming / file upload için (`/api/chat`, `/api/documents/upload`).
- `packages/db` — Prisma + pgvector + Client Extensions (soft-delete, audit).
  Tüm uygulama tek bir `prisma` import'u kullanır (`@law-firm-ai/db`).
- `packages/ai` — Ollama client, router, RAG, chunker, PII, templates.
- `services/worker` — BullMQ; 4 izole kuyruk (`pdf`, `embedding`, `scrape`, `report`).
- `services/scraper` — Playwright-extra + stealth. Yalnızca kamuya açık karar portalları.
- `services/pii-service` — Python + Presidio + spaCy TR NER. Worker'dan HTTP.

## Ekleme / değiştirme yaparken

- Yeni tablo → `packages/db/prisma/schema.prisma` + migration. `deletedAt`
  eklemeyi unutma. `SOFT_DELETE_MODELS` set'ine ekle (`extensions/soft-delete.ts`).
- Yeni AI görevi → önce `router.ts` RouteSchema'yı genişlet, sonra `modelForRoute`.
  Ana modeli gereksizken seçme (maliyet + gecikme).
- Yeni worker → `services/worker/src/workers/` altına. `queues.ts`'e Queue ekle.
  `WORKER_KINDS` env'e yeni kind. Docker compose'a yeni servis.
- Yeni scraper → `services/scraper/src/` altına. Stealth zorunlu. `humanSleep`
  ile rate-limit. `scrape_queue`'ya `ingestPrecedents` job'u gönder.
- RAG sorgusu → `retrieve()` fonksiyonu. Scope: `clientIds`, `caseIds`,
  `documentIds`. Top-K `8` varsayılan, rerank cross-encoder worker adımı.

## Test

- PII regex snapshot testleri: `packages/ai/src/__tests__/pii-regex.test.ts`
- Chunker smoke: `packages/ai/src/__tests__/chunker.test.ts`
- E2E golden path: `apps/web` Playwright (eklenmesi planlanıyor).

## Şu anda MOCK olan yerler

- UYAP dosya arama — `services/uyap/` henüz yok; MVP sonrası.
- Embedding modeli `multilingual-e5-large` — Ollama'da native destek stabil
  değilse `nomic-embed-text:v1.5` veya `bge-m3` kullanılabilir (env ile).
- Scraper seçicileri — Yargıtay/Danıştay portalı yapı değiştirdikçe güncellenmeli.
