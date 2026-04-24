-- pgvector HNSW indexleri + full-text search için tsvector.
-- Prisma migrate bu yapıları kuramadığı için ayrı çalıştırılır.
--
-- Çalıştırma: `psql $DATABASE_URL -f scripts/create-hnsw-index.sql`

-- pgvector uzantısı (migrate ile beraber gelir, yine de güvenlik)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Türkçe text search config (basit unaccent tabanlı)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'turkish_unaccent') THEN
    CREATE TEXT SEARCH CONFIGURATION turkish_unaccent ( COPY = simple );
    ALTER TEXT SEARCH CONFIGURATION turkish_unaccent
      ALTER MAPPING FOR hword, hword_part, word WITH unaccent, simple;
  END IF;
END $$;

-- =========================================================
-- DocumentChunk
-- =========================================================

-- Vektör HNSW (cosine)
CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_hnsw"
  ON "DocumentChunk"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Full-text search tsvector trigger
CREATE OR REPLACE FUNCTION documentchunk_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv :=
    setweight(to_tsvector('turkish_unaccent', coalesce(NEW.content, '')), 'A');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documentchunk_tsv_update ON "DocumentChunk";
CREATE TRIGGER documentchunk_tsv_update
  BEFORE INSERT OR UPDATE ON "DocumentChunk"
  FOR EACH ROW EXECUTE FUNCTION documentchunk_tsv_trigger();

CREATE INDEX IF NOT EXISTS "DocumentChunk_tsv_gin"
  ON "DocumentChunk" USING GIN (tsv);

-- =========================================================
-- PrecedentCase
-- =========================================================

CREATE INDEX IF NOT EXISTS "PrecedentCase_embedding_hnsw"
  ON "PrecedentCase"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE OR REPLACE FUNCTION precedentcase_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv :=
    setweight(to_tsvector('turkish_unaccent', coalesce(NEW.summary, '')), 'A') ||
    setweight(to_tsvector('turkish_unaccent', coalesce(NEW.text, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS precedentcase_tsv_update ON "PrecedentCase";
CREATE TRIGGER precedentcase_tsv_update
  BEFORE INSERT OR UPDATE ON "PrecedentCase"
  FOR EACH ROW EXECUTE FUNCTION precedentcase_tsv_trigger();

CREATE INDEX IF NOT EXISTS "PrecedentCase_tsv_gin"
  ON "PrecedentCase" USING GIN (tsv);

-- HNSW arama kalitesi için sorgu anında ayar (önerilen):
-- SET hnsw.ef_search = 40;
