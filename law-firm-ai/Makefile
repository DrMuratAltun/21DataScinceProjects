.PHONY: dev up down migrate seed hnsw models test lint typecheck clean

dev:
	pnpm --parallel --filter=./apps/* --filter=./services/* run dev

up:
	docker compose -f docker/docker-compose.yml up -d

down:
	docker compose -f docker/docker-compose.yml down

migrate:
	pnpm --filter @law-firm-ai/db run migrate

seed:
	pnpm --filter @law-firm-ai/db run seed

hnsw:
	psql $$DATABASE_URL -f scripts/create-hnsw-index.sql

models:
	bash scripts/pull-models.sh

test:
	pnpm -r run test

lint:
	pnpm -r run lint

typecheck:
	pnpm -r run typecheck

clean:
	docker compose -f docker/docker-compose.yml down -v
	rm -rf node_modules apps/*/.next apps/*/node_modules packages/*/node_modules services/*/node_modules
