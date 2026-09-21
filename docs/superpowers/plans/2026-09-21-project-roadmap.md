# Pingo — Build Strategy & Roadmap

> This is the strategy document, not a bite-sized implementation plan. It sets
> direction; the linked plans below do the task-by-task work.

**Spec:** `docs/24H_Conversation_App_COMPLETE.md` (Product PRD + Technical PRD/System Design + Business Logic, combined)

## 1. Where the project stands today

The repo currently has no application code — only `docs/` (four markdown files,
one of which duplicates the other three) and a one-line `README.md`. What it
does have is an unusually complete spec: product rules, a conversation state
machine, a full DB model, a REST/WebSocket API surface, safety rules, a
gamification system, and explicit anti-abuse guardrails. That changes the
risk profile of this project — the open question isn't "what should this do,"
it's "in what order do we build it without drowning in scope."

## 2. Decisions already made by the spec (not up for debate here)

- **Mobile:** React Native + Expo + TypeScript + Expo Router + TanStack Query + Zustand + Reanimated + Socket.IO client.
- **Backend:** Node.js + TypeScript + Fastify + Socket.IO, as a **modular monolith** (`auth`, `users`, `identities`, `live-profiles`, `matchmaking`, `conversations`, `connections`, `messages`, `achievements`, `stats`, `trust`, `moderation`, `notifications`). No microservices until traffic justifies it.
- **Data:** PostgreSQL is the durable source of truth; Redis holds only ephemeral/coordination state (presence, pools, locks, rate limits, Socket.IO adapter) and its loss must never destroy durable data; object storage + CDN for media via signed upload URLs.
- **Jobs:** BullMQ/Redis for background work — explicitly *not* a replacement for authoritative timers or state transitions (Postgres state + `expiresAt` checks remain authoritative).
- **Core invariant:** server-authoritative time everywhere; every phase transition is atomic, idempotent, authorization-checked, and server-side.
- **Repo shape:** `apps/mobile`, `apps/api`, `packages/{contracts,validation,config}` (Technical PRD §29).

## 3. Decisions the spec leaves open (defaults chosen below — flag if you want different)

| Decision | Default chosen | Why |
|---|---|---|
| Monorepo tool | pnpm workspaces | Enough for 2 apps + a few packages; Nx/Turborepo add config overhead this project doesn't need yet. |
| ORM / DB access | Drizzle ORM + `postgres-js` | Typed SQL, no engine binary, migrations are plain SQL files — matches the spec's "correctness/explicit" bias better than a heavier ORM. |
| Auth method | Email + password, argon2 hashing, JWT access token + rotating refresh token | Matches Security §24 literally ("short-lived access tokens, refresh-token rotation"). Social login can be added later without touching the core session model. |
| Local infra | `docker-compose.yml` for Postgres + Redis | Zero cloud dependency until there's something worth deploying. |
| Testing | Vitest for `apps/api` (with Fastify's `.inject()`, no supertest/real sockets); Jest + `jest-expo` + `@testing-library/react-native` for `apps/mobile` | React Native can't render under jsdom/Vitest without fighting the RN runtime — `jest-expo` is Expo's own supported preset, so mobile uses it rather than forcing one runner across both apps. |
| Hosting target | Deliberately undecided | The architecture (stateless Node + externalized Postgres/Redis) runs unchanged on Fly.io, Render, Railway, or ECS. Decide when Phase 3 is deployable, not before. |

## 4. Phased roadmap

This follows the Technical PRD's own MVP Build Order (§30), but pairs every
backend phase with the mobile screens that make it demoable — a phase isn't
"done" until someone can drive it from the app, because the spec's core
invariant (mutual consent, server-authoritative timers) is only meaningfully
verified end-to-end.

| Phase | Backend scope | Mobile scope | Demoable outcome | Key spec sections |
|---|---|---|---|---|
| **1. Foundation** | Auth, Chat Identity, Live Profile (create/expire), basic Discovery, Postgres, Redis | Login/Register, Identity creation, Go Live toggle, Discover list | A user can register, create an identity, go live, and see other live users. No matching yet. | PRD §4–7, Business Logic §4–9 |
| **2. Matchmaking + 30s phase** | Socket.IO gateway, Redis matchmaking pools, match creation, `PHASE_30_ACTIVE` state machine, Continue/End decision gate | Realtime match screen, live countdown (server time), Continue/End buttons | Two live users get matched and go through a real 30-second mutual-consent gate. | PRD §8 (Phase 1), Technical PRD §8–12, Business Logic §10–13 |
| **3. 3-minute phase + connections + messages** | `PHASE_3M_ACTIVE`, Connect/End gate, permanent connection transaction, message persistence + history | 3-minute chat screen, Connect/End buttons, Connections list, message thread | The full core loop from the pitch ("30 seconds to meet, 3 minutes to connect") works end to end, and a permanent connection produces a real persistent chat. | PRD §8, Technical PRD §14–20, Business Logic §14–22 |
| **4. Gamification** | XP events, levels, achievements, streaks, daily/seasonal challenges | Stats/profile screen, achievement toasts, streak indicator | Progression reacts to real conversation events, server-side only. | PRD §10–18, Technical PRD §27, Business Logic §24–33 |
| **5. Safety & Trust** | Block, Report, Safe Exit, moderation actions, Trust signal, abuse/rate-limit detection | Block/Report/Safe-Exit UI, moderation-visible states | Safety controls actually override conversation flow; blocked users can't rematch. | PRD §9, Technical PRD §24–26, Business Logic §19–21, §31 |
| **6. Monetization & analytics** | Free/premium tiers, rewarded-ad hooks, analytics event pipeline | Premium paywall, ad placement (never over safety controls), stats display | Monetization exists without ever touching consent or safety. | PRD §20–22, Business Logic §36–41 |

## 5. Sequencing principle

- Within a phase, backend and mobile move together, not backend-then-mobile-by-three-phases. A phase's mobile screens are written against the phase's real API, not a mock — that's what actually proves the server-authoritative design works.
- Each phase gets its **own** implementation plan(s), written when that phase starts — not all six up front. The exact shape of Phase 2's Socket.IO contracts will likely shift once Phase 1 is real; over-planning distant phases now would just be thrown away.
- Phase 1 is split into two independent plans (backend, mobile) since they're separately testable and reviewable; they should still land close together in time.
- Later phases will likely need finer splits too (e.g. Phase 2 could become "matchmaking pool + Socket gateway" and "30s phase state machine" as separate plans) — decide that when Phase 2 starts, informed by how Phase 1 actually went.

## 6. Definition of done (carried from Technical PRD §31 — applies across all phases)

- Server controls all phase timers; client never decides expiry.
- Reconnect resumes correctly from authoritative state.
- Duplicate decisions/events are idempotent.
- Permanent connections cannot duplicate (canonical-pair unique constraint).
- Blocked users cannot rematch.
- Report/block actions can terminate an active session.
- Messages persist correctly with `clientMessageId` idempotency.
- Achievement awards are idempotent; XP cannot be client-forged.
- Live Profiles expire correctly; Redis failure never destroys durable data.
- API authorization is enforced everywhere; rate limits exist; structured logging/metrics exist.

## 7. Immediate next step

Two ready-to-execute implementation plans for Phase 1:

- [`2026-09-21-phase-1-backend-foundation.md`](./2026-09-21-phase-1-backend-foundation.md)
- [`2026-09-21-phase-1-mobile-foundation.md`](./2026-09-21-phase-1-mobile-foundation.md)

## 8. Carried forward from Phase 1's final review — Phase 2 prerequisites

The Phase 1 backend's final whole-branch review surfaced a few things that
are fine to ship now but must not be forgotten once Phase 2 (matchmaking +
realtime) starts building on top of `live_profiles`/`refresh_tokens`:

- **One shared "is this live profile actually live" predicate.** Because
  there's no background expiry sweep, `status = 'ACTIVE'` alone is not
  trustworthy — every caller must also check `expiresAt > now()`. Two
  places already encode this rule by hand (`live-profiles.service.ts`,
  `discovery.service.ts`); Phase 2's matchmaking pool will be a third.
  Extract a single helper (or a DB view) before that lands, or a bug where
  expired users stay matchable becomes very likely.
- **Per-worker test databases.** `apps/api/vitest.config.ts` currently sets
  `fileParallelism: false` to avoid a shared-Postgres truncation race
  between test files. That's an acceptable stopgap for a 10-file suite; it
  will not be once Phase 2 adds a lot more DB-touching tests. Move to one
  database (or schema) per Vitest worker, keyed off `VITEST_POOL_ID`,
  before the suite's wall-clock time becomes a problem.
- **Session lifecycle is still minimal.** There's no logout, no
  revoke-all-sessions, and no refresh-token-reuse-family invalidation (a
  presented-but-already-revoked token 401s the one request but doesn't
  invalidate the rest of that token's lineage). Fine for a foundation with
  no real users yet; needs to land before any real client ships, and
  certainly before Phase 5's moderation/Trust work needs to actually
  terminate a session for cause.
- **`live_profiles`'s exclusion constraint, not a unique index.** Phase 1
  added `EXCLUDE USING gist (user_id WITH =, tstzrange(started_at,
  expires_at) WITH &&) WHERE (status = 'ACTIVE')` to stop two concurrent
  Go-Live calls from creating overlapping active profiles for one user. A
  plain partial `UNIQUE` index on `(user_id) WHERE status = 'ACTIVE'` looks
  like the obvious fix but is wrong for this schema — it would reject the
  legitimate "user goes live again after their previous profile expired"
  flow, since expired rows are never flipped out of `status = 'ACTIVE'`.
  Keep the time-range-aware constraint when Phase 2 touches this table.

## 9. Carried forward from the mobile foundation's final review

- **No 401 handling and no logout affordance anywhere in `apps/mobile`.**
  `authStore.logout()` exists and works, but nothing calls it and nothing in
  `client.ts` reacts to a `401` response by clearing the session. Today that
  means an expired/revoked access token turns into a permanently broken app
  with no recovery short of reinstalling — this needs to land before Phase 2
  adds real usage, and pairs directly with the backend's own deferred
  refresh-token-reuse-detection item above.
- **A structural testing gap let a real integration bug through six clean
  task reviews.** The mobile suite mocks `apps/api` entirely; the backend
  suite never injects the exact request shape the mobile client actually
  sends. Neither side's tests describe the real wire contract, which is how
  a `Content-Type: application/json` header on bodyless requests (breaking
  Go Live/End Live against the real Fastify backend) went undetected until
  the final whole-branch review. Phase 2's realtime/matchmaking work should
  budget for a handful of true end-to-end tests (mobile client → real API,
  no mocks on either side) covering the state-changing calls, not just unit
  tests on each side in isolation.
- **One shared theme module now exists** (`apps/mobile/src/shared/theme/glass.ts`)
  — new screens in Phase 2 (the realtime match screen, decision buttons,
  etc.) should extend it rather than each re-declaring the gradient/card/
  button constants, which is exactly the drift that had already started
  happening by Task 5 before this got consolidated.
- **No CI wired up for either app.** Neither `apps/api` nor `apps/mobile`'s
  test suite runs automatically anywhere — both currently rely on someone
  remembering to run `pnpm --filter <pkg> test` by hand. Worth setting up
  before Phase 2 adds enough surface area that a regression could hide.
