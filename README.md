# Pingo

A mobile app where users go live, get matched for a 30-second conversation,
and can mutually opt into a 3-minute deeper chat that becomes a permanent
connection. Full product/technical spec lives in
[`docs/24H_Conversation_App_COMPLETE.md`](docs/24H_Conversation_App_COMPLETE.md);
build sequencing and decisions live in
[`docs/superpowers/plans/2026-09-21-project-roadmap.md`](docs/superpowers/plans/2026-09-21-project-roadmap.md).

**Status:** Phase 1 (Foundation) — auth, Chat Identity, Live Profile,
basic Discovery. No matchmaking yet.

## Repo layout

- [`apps/api`](apps/api/README.md) — Fastify + TypeScript backend (modular
  monolith), Postgres via Drizzle ORM, Redis for ephemeral state.
- [`apps/mobile`](apps/mobile/README.md) — React Native + Expo + TypeScript
  client.

## Setup

1. `pnpm install`
2. `docker compose up -d` — starts Postgres (`localhost:15432`) and Redis
   (`localhost:6379`).
3. Follow [`apps/api/README.md`](apps/api/README.md) to configure env vars,
   run migrations, and start the API.
4. Follow [`apps/mobile/README.md`](apps/mobile/README.md) to configure the
   app's API URL and start Expo.

## Tests

- API: `pnpm --filter @pingo/api test`
- Mobile: `pnpm --filter @pingo/mobile test`

## Stack

Node.js + TypeScript + Fastify + Socket.IO on the backend; React Native +
Expo + Expo Router + TanStack Query on mobile; PostgreSQL as the durable
store, Redis for ephemeral/coordination state only; pnpm workspaces to tie
the monorepo together.
