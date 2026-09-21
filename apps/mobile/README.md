# @pingo/mobile

Phase 1 foundation: login/register, Chat Identity creation, Go Live with a
server-driven countdown, and a basic Discover list.

## Setup

1. `cp .env.example .env` and point `EXPO_PUBLIC_API_URL` at a running
   `@pingo/api` (see `apps/api/README.md`).
2. `pnpm install`
3. `pnpm --filter @pingo/mobile start`

## Tests

`pnpm --filter @pingo/mobile test`
