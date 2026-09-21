# @pingo/mobile

Phase 1 foundation: login/register, Chat Identity creation, Go Live with a
server-driven countdown, and a basic Discover list.

## Setup

1. `cp .env.example .env` and point `EXPO_PUBLIC_API_URL` at a running
   `@pingo/api` (see `apps/api/README.md`). The default
   `http://localhost:3000` only resolves from an iOS simulator — an Android
   emulator needs `http://10.0.2.2:3000`, and a physical device needs your
   machine's LAN IP (e.g. `http://192.168.1.23:3000`).
2. `pnpm install`
3. `pnpm --filter @pingo/mobile start`

## Tests

`pnpm --filter @pingo/mobile test`
