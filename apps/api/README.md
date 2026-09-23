# @pingo/api

Part of the [pingo monorepo](../../README.md).

Phase 1 foundation: auth, Chat Identity, Live Profile, basic Discovery.

## Setup

1. `cp .env.example .env`
2. From the repo root: `docker compose up -d` (starts Postgres + Redis)
3. `pnpm install`
4. `pnpm --filter @pingo/api db:generate && pnpm --filter @pingo/api db:migrate`
5. `pnpm --filter @pingo/api dev`

## Tests

Tests run against the same Postgres/Redis started above and truncate tables
between runs — make sure migrations have been applied first.

`pnpm --filter @pingo/api test`
