# Pingo

A social conversation app: users go live for 24 hours and meet other
currently-live people through short, mutual-consent conversation stages.

> **30 seconds to meet. 3 minutes to connect. A lifetime if it's mutual.**

## Status

**Phase 1 (Foundation) is complete** — permanent accounts, Chat Identity,
24-hour Live Profiles, and basic Discovery, end to end across both the
backend and the mobile app. Nothing past Phase 1 (matchmaking, the 30s/3-min
conversation phases, gamification, safety/moderation, monetization) is built
yet. See the roadmap for what's next.

## Repo layout

```text
apps/
  api/      Fastify + TypeScript backend (PostgreSQL via Drizzle, Redis)
  mobile/   Expo Router + TypeScript app (React Native)
docs/
  24H_Conversation_App_COMPLETE.md   the spec (Product PRD + Technical PRD + Business Logic)
  superpowers/plans/                 the build strategy and implementation plans
```

## Docs

- **[Build strategy & roadmap](docs/superpowers/plans/2026-09-21-project-roadmap.md)** —
  architecture decisions, the full 6-phase build order, and what's carried
  forward into Phase 2.
- **[Backend implementation plan](docs/superpowers/plans/2026-09-21-phase-1-backend-foundation.md)**
  and **[mobile implementation plan](docs/superpowers/plans/2026-09-21-phase-1-mobile-foundation.md)** —
  the task-by-task plans Phase 1 was built from.
- **[Spec](docs/24H_Conversation_App_COMPLETE.md)** — the authoritative
  product/technical/business-logic specification everything argues from.

## Quickstart

Requires Docker Desktop running (Postgres + Redis) and pnpm.

```bash
pnpm install

# 1. Backend — see apps/api/README.md for full setup
cp apps/api/.env.example apps/api/.env
docker compose up -d
pnpm --filter @pingo/api db:generate && pnpm --filter @pingo/api db:migrate
pnpm --filter @pingo/api dev

# 2. Mobile — see apps/mobile/README.md for full setup
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @pingo/mobile start
```

## Tests

```bash
pnpm --filter @pingo/api test      # 25 tests — Vitest, real Postgres/Redis
pnpm --filter @pingo/mobile test   # 24 tests — Jest (jest-expo), RTL
```
