FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:/usr/local/bin:/usr/bin:/bin
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/ai/package.json packages/ai/
COPY packages/ui/package.json packages/ui/
RUN pnpm fetch

FROM deps AS build
COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN pnpm --filter @law-firm-ai/db run generate
RUN pnpm --filter @law-firm-ai/web run build

FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY --from=build /app /app
EXPOSE 3000
CMD ["pnpm", "--filter", "@law-firm-ai/web", "run", "start"]
