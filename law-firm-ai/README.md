# Hukuk Bürosu AI

Yerel LLM tabanlı, **çoklu kullanıcılı** hukuk bürosu yönetim ve yapay zekâ asistan sistemi.
Lokman AI mimarisinin devamı — bu kez bir hukuk bürosu için.

**Hedef donanım:** Apple M4 Max Studio (sunucu). Büro çalışanları (avukat, stajyer, sekreter) aynı
ağda tarayıcıdan bağlanır.

## Özellikler

### Büro yönetimi
- Müvekkil yönetimi (TCKN doğrulama, KVKK onay)
- Dava & duruşma yönetimi (Kanban durumları)
- Belge kütüphanesi (drag-drop upload, sürüm, etiket)
- Finans (avukatlık ücreti, KDV, tahsilat, PDF fatura)
- Personel & rol bazlı yetki (ADMIN / LAWYER / PARALEGAL / SECRETARY / CLIENT)
- **KVKK append-only audit log** (Prisma Client Extension ile zorlanır)

### Yapay zekâ asistanı
- **Model yönlendirme**: `gemma4:9b` intent sınıflandırır → basit görev kendinde, ağır iş ana modele
- **Ana model**: `qwen3.6:32b-instruct-q4_K_M` — dilekçe, sözleşme, hukuki analiz
- **Embedding**: `multilingual-e5-large` (TR hukuki recall daha iyi)
- **Semantic chunking**: madde / fıkra / paragraf bazlı (hukuki regex)
- **Hibrit retrieve**: pgvector **HNSW** + Postgres `tsvector` (BM25-benzeri) → RRF
- **PII pipeline**: regex → Microsoft Presidio (Python microservis) → `gemma4:9b` belirsizlik agent
- **Dilekçe / KVKK şablonları**: Handlebars, PDF çıktı
- **Emsal karar arama**: Yargıtay & Danıştay kamuya açık karar arama (playwright-extra + stealth)
- **UYAP**: MVP'de mock, ileride e-imza ile gerçek entegrasyon

## Mimari

```
apps/web           Next.js 16 (App Router, Server Actions, TS)
packages/db        Prisma + pgvector + soft-delete/audit Client Extensions
packages/ai        Ollama, router, RAG, chunker, PII pipeline, templates
packages/ui        Paylaşılan UI (ileride genişler)
services/worker    BullMQ — izole 4 kuyruk:
                     pdf_queue, embedding_queue, scrape_queue, report_queue
services/scraper   playwright-extra + stealth: Yargıtay, Danıştay
services/pii-service  Python + Presidio + TR recognizer (FastAPI)
docker/            Compose + Dockerfile'lar (app, worker, pii)
scripts/           pull-models.sh, create-hnsw-index.sql
```

## Hızlı başlangıç

Gereksinimler: Docker, Node 20+, pnpm 9, 30 GB boş disk (modeller), 32+ GB RAM.

```bash
# 1. Bağımlılıklar
pnpm install

# 2. Servisleri ayağa kaldır (postgres+pgvector, redis, ollama, app, worker, pii)
cp .env.example .env
pnpm docker:up

# 3. DB şeması + HNSW index + demo veri
pnpm db:migrate
pnpm db:hnsw       # scripts/create-hnsw-index.sql
pnpm db:seed

# 4. LLM ve embedding modellerini çek (30+ GB)
pnpm pull-models

# 5. Aç
open http://localhost:3000
# Admin: admin@demo.local / admin1234
```

### LAN üzerinden diğer çalışanların erişimi

`docker-compose.yml` 0.0.0.0'a bind eder; büro ağında http://MAX_STUDIO_IP:3000 açılır.
Tavsiye: önünde **Caddy** reverse proxy ile HTTPS, erişimi **Tailscale** ile kısıtlayın.

## Çoklu kullanıcı ayarı (Ollama)

```
OLLAMA_NUM_PARALLEL=4      # eşzamanlı istek (büro 8+ kişiyse artırın)
OLLAMA_KEEP_ALIVE=30m
OLLAMA_MAX_LOADED_MODELS=2 # qwen3.6:32b + gemma4:9b
LLM_NUM_CTX=32768          # uzun dilekçeler için 64k yapılabilir
```

RAM tahmini (M4 Max 64GB): qwen3.6:32b-q4 ~22 GB + gemma4:9b ~6 GB + embedding ~2 GB + bağlam ~8 GB
≈ 38 GB. 128 GB Studio rahatça 64k bağlam kaldırır.

## Test

```bash
pnpm test            # unit (Vitest) — PII regex, chunker, snapshot
pnpm typecheck
pnpm lint
pnpm --filter @law-firm-ai/web test:e2e   # Playwright golden path
```

## Golden path (E2E doğrulama senaryosu)

1. Giriş: admin@demo.local / admin1234
2. Müvekkil ekle (TCKN: 10000000146, KVKK onay)
3. Dava aç → `B-2025-003`
4. PDF belge yükle → worker logu: `semantic chunked N, embedded N, HNSW upserted`
5. AI asistan:
   - "Bu davada karşı tarafın temel iddiası nedir?" → router gemma → qwen3.6:32b + citation
   - "İhtarname taslağı çıkar" → `report_queue` → PDF
   - "Müvekkil bilgilerini maskeleyerek özet ver" → TCKN/ad/IBAN maskelenir
6. Müvekkil sil → `deletedAt` dolar, `AuditLog.SOFT_DELETE` kaydı düşer, **hard-delete olmaz**
7. Emsal arama sayfası → "fazla mesai" → Yargıtay kararları listelenir

## KVKK notu

- Silme işlemleri **daima** soft delete — `deletedAt` alanı güncellenir, `AuditLog` kaydı düşer
- Prisma `$client.delete` / `deleteMany` doğrudan çağrısı ESLint ile yasaklanmıştır
- Gerçek GDPR "sil" talebi için manuel prosedür + yasal sebep beyanı gerekir
- PII maskeleme modu açıkken tüm AI yanıtları Presidio + LLM pipeline'ından geçer

## Geliştirme hedefleri (roadmap)

- [ ] E-imza / Mobil imza ile UYAP gerçek entegrasyonu
- [ ] GİB E-fatura entegrasyonu (`drmurataltun/e-fatura-dashboard` deposu ile)
- [ ] Duruşma ses kaydı → Whisper transcript → özet
- [ ] Müvekkil portalı (CLIENT rolü) — dosyalarını görme, ön görüşme chatbot'u
- [ ] Mobil uygulama (Tauri)

## Lisans

MIT (proje içi kullanım — üçüncü taraf modellerin lisansları kendi şartlarına tabidir).
