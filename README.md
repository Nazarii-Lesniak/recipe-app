# Recipes App (Смаколик)

Full-stack recipe platform built with **Next.js 16 (App Router, FSD)**, **Turborepo + pnpm workspaces**, **PostgreSQL 17 + Drizzle ORM (`pg_trgm`)**, **Better Auth** (`@username` + Google OAuth), **Tailwind CSS v4 + Radix UI**, **UploadThing**, and **Vercel AI SDK**.

## Structure

- `apps/web` — Next.js App Router application (`src/app`, `src/core`, `src/views`, `src/widgets`, `src/features`, `src/entities`, `src/shared`)
- `packages/domain` — Pure TypeScript domain layer (Zod schemas, deterministic portion scaler & unit converter, Ukrainian transliteration slugifier, SSRF-safe JSON-LD `schema.org/Recipe` parser)
- `packages/db` — Drizzle ORM schema, PostgreSQL 17 `pg_trgm` migration, seed script (`9` curated categories)
- `packages/i18n` — Typed `uk` and `en` dictionaries
- `packages/config` — Shared TypeScript configs

## Local Quick Start

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Start PostgreSQL 17 (for local dev & DBeaver):
   ```bash
   docker compose up -d
   ```
3. Install dependencies, run migrations, and seed categories:
   ```bash
   pnpm install
   pnpm db:migrate
   pnpm db:seed
   ```
4. Start the development server:
   ```bash
   pnpm dev
   ```

> **Note:** External integrations (Google OAuth, UploadThing, Upstash Redis, Google AI Studio / OpenAI-compatible LLM, Telegram Bot Webhook, Sentry) are optional in local development and degrade gracefully when omitted from `.env`.

## Quality & Testing Scripts

- `pnpm lint` — Biome check (on Windows requires Microsoft Visual C++ Redistributable x64)
- `pnpm typecheck` — TypeScript `strict` check across all workspaces
- `pnpm test` — Vitest unit tests (`@recipes/domain` and `@recipes/web`)
- `pnpm test:e2e` — Playwright E2E suite (run `pnpm exec playwright install chromium` once first)

## Git & Conventional Commits

Every commit requires a `scope` from:
`auth`, `recipes`, `ai`, `ui`, `db`, `i18n`, `moderation`, `ci`, `repo`, `domain`.

Example: `feat(recipes): add deterministic portion scaler`
