# Phase 2 — Matchmaking + 30s Phase — Design Spec

**Status:** Approved for planning
**Roadmap reference:** [`2026-09-21-project-roadmap.md`](../plans/2026-09-21-project-roadmap.md) §4, Phase 2
**Spec references:** `docs/24H_Conversation_App_Technical_PRD.md` §7–13 (server-authoritative time, conversation state machine, concurrency control, Redis keys, matchmaking, realtime events, REST API)

## 1. Scope

Phase 2 takes a user from "live and discoverable" (Phase 1, done) to "matched with another live user and through a real, server-authoritative 30-second mutual-consent gate." It stops at the boundary of `PHASE_3M_ACTIVE`: Phase 2 creates that state transition, but everything that happens *inside* the 3-minute phase (its own countdown/gate mechanics, Connect/End decisions, permanent connection creation, message persistence) is Phase 3's scope per the roadmap table.

Out of scope for Phase 2 (explicitly deferred):
- Matchmaking segmentation (language/region pools) — single `match:pool:general` only.
- Block/report interruption of an active conversation (Phase 5).
- Any grace-period timeout for a participant who never submits a Continue/End decision after expiry.
- Everything inside `PHASE_3M_ACTIVE` itself (Phase 3).

## 2. Prerequisite: Phase 2 prep plan

Before any of the feature work below starts, land a short prep plan addressing four items the Phase 1 final review carried forward (roadmap §8–9), because Phase 2 builds directly on top of the affected code:

1. **Shared live-profile validity predicate.** `apps/api/src/modules/live-profiles/live-profiles.service.ts` (`withComputedStatus`/`findCurrentActive`) and `apps/api/src/modules/discovery/discovery.service.ts` (`listLiveUsers`) each hand-encode `status = 'ACTIVE' AND expires_at > now()`. Extract this into one helper (or a DB view) before the matchmaking pool becomes a third hand-rolled copy of the same rule.
2. **Per-worker test databases.** `apps/api/vitest.config.ts` currently sets `fileParallelism: false` to dodge a shared-Postgres truncation race. Move to one database/schema per Vitest worker keyed off `VITEST_POOL_ID` before Phase 2 adds significantly more DB-touching tests.
3. **Mobile 401/session handling.** `apps/mobile/src/shared/api/client.ts` doesn't react to a `401` today, and there's no logout affordance wired to the existing `authStore.logout()`. Fix before Phase 2 adds real usage on top of an app that can't recover from an expired/revoked token.
4. **CI.** Neither `apps/api` nor `apps/mobile` runs its test suite automatically. Wire up CI (GitHub Actions) running both suites before Phase 2 adds enough surface area for a regression to hide.

## 3. Data model

New tables added to `apps/api/src/infrastructure/postgres/schema.ts`:

```
conversations
  id              uuid primary key
  user_a_id       uuid not null references users(id)
  user_b_id       uuid not null references users(id)
  phase           text not null   -- MATCHED | PHASE_30_ACTIVE | PHASE_30_EXPIRED | PHASE_3M_ACTIVE | CLOSED
  started_at      timestamptz not null
  expires_at      timestamptz not null   -- authoritative end of the current phase
  created_at      timestamptz not null default now()

conversation_decisions
  conversation_id uuid not null references conversations(id)
  user_id         uuid not null references users(id)
  phase           text not null   -- e.g. 'PHASE_30'
  decision        text not null   -- CONTINUE | END
  created_at      timestamptz not null default now()
  unique (conversation_id, user_id, phase)
```

The `conversation_decisions` unique constraint is the idempotency mechanism for repeated Continue/End submissions (network retries, double-taps), matching the spec's "every transition must be idempotent" invariant.

`phase` values beyond `PHASE_3M_ACTIVE` (the eventual `PERMANENT_CONNECTION` terminal state, further 3-minute-phase sub-states) are Phase 3's responsibility to add; Phase 2 only needs to reach and persist `PHASE_3M_ACTIVE`.

## 4. Redis usage

- `match:pool:general` — the single waiting-candidate pool. Entries: `{userId, liveProfileId, joinedAt}`.
- `lock:conversation:{conversationId}` — distributed lock guarding phase transitions and decision writes (per PRD §9, concurrency control).

Redis is coordination-only. Postgres (`conversations`, `conversation_decisions`) is the durable source of truth; a Redis flush must never destroy a conversation's real state, matching the same invariant `live_profiles` already follows.

## 5. Plan A — Socket.IO gateway + matchmaking (backend)

- Mount Socket.IO on the existing Fastify server (`apps/api/src/app.ts`/`server.ts`). Authenticate the handshake using the existing JWT access-token verification (`shared/auth/jwt.ts`, `shared/auth/authenticate.ts`) — no new auth mechanism.
- Client emits a "find match" intent. Server adds the candidate to `match:pool:general`, then attempts to pair with another waiting candidate.
- Before committing a match, **both** candidates are re-verified against the shared live-profile predicate (item 1 of the prep plan) — stale pool membership is never trusted (PRD §11).
- On a successful pair: open a Postgres transaction, insert the `conversations` row (`phase = PHASE_30_ACTIVE`, `startedAt = now()`, `expiresAt = startedAt + 30s`), remove both candidates from the pool, join both sockets to a room keyed by `conversationId`, emit `MATCH_FOUND` then `CONVERSATION_STARTED` to both.
- **Reconnect:** on every socket connect (fresh or reconnect), the server looks up whether the authenticated user has an open conversation (`phase` not in `CLOSED`/terminal), and if so rejoins them to its room and emits a full state snapshot (`phase`, `expiresAt`, decisions recorded so far). The mobile client's countdown is always rebuilt from this snapshot plus synchronized server time — never from client-held state.

## 6. Plan B — PHASE_30_ACTIVE state machine + Continue/End gate (backend)

- At match creation, schedule a BullMQ delayed job for `expiresAt`. On fire, transition `PHASE_30_ACTIVE → PHASE_30_EXPIRED` inside the Redis lock, checking current phase first so a duplicate/late job firing is a no-op (idempotent). Emit `PHASE_EXPIRED`.
- Continue/End decisions are only accepted once `phase = PHASE_30_EXPIRED` — this is what makes it a gate rather than an always-open input. A decision submitted before expiry is rejected.
- Decision resolution:
  - Either participant submitting `END` closes the conversation immediately: `phase → CLOSED`, emit `CONVERSATION_CLOSED`. The other participant's later decision (if any) is a no-op against the unique constraint / already-closed phase check.
  - Both participants submitting `CONTINUE` transitions `phase → PHASE_3M_ACTIVE`, emit `PHASE_ADVANCED`. Phase 3 owns everything from here.
- No timeout is applied to a participant who never decides after expiry (see §1, deferred). The conversation simply waits in `PHASE_30_EXPIRED` until a decision arrives or the other side ends it.
- All transitions go through the same lock + transaction + idempotency-check pattern, per PRD §9.

## 7. Plan C — Mobile realtime match screen

- New Expo Router screen for the matched/30s-phase state: live countdown computed as `expiresAt - synchronizedServerTime` (the server clock offset, not a local timer), Continue/End buttons disabled until the server emits `PHASE_EXPIRED`.
- Socket connection reuses the existing `authStore`/token storage; on reconnect, the screen re-renders from the server's state snapshot rather than resuming a locally-held countdown.
- Extends `apps/mobile/src/shared/theme/glass.ts` for styling (gradient/card/button constants) instead of re-declaring them, per the carried-forward note from Phase 1's mobile review.

## 8. Testing strategy

- **Backend unit/integration (Vitest):** matchmaking pairing logic (including the re-verification step), state-machine transitions (idempotency on duplicate job fires, lock contention between near-simultaneous decisions, decision resolution logic).
- **Real end-to-end suite (new):** a real Socket.IO client driving the real Fastify + Socket.IO server against test Postgres/Redis (no mocks on either side), covering: connect → find match → `MATCH_FOUND` → `PHASE_30_ACTIVE` → expiry → decision → `CLOSED` or `PHASE_ADVANCED`, plus a reconnect-mid-phase case. This directly targets the wire-contract gap identified in Phase 1's review (mobile mocks the API entirely; backend never exercises the real request/event shapes the client sends).
- **Mobile (Jest):** the match screen's rendering/countdown/button-enablement logic against a mocked socket — unit coverage only; real-wire coverage lives in the backend E2E suite above.

## 9. Definition of done (Phase 2 slice of the cross-phase DoD)

- Server controls the 30s timer; client never decides expiry.
- Reconnect resumes correctly from authoritative state (conversations table + snapshot on connect).
- Duplicate decisions/events are idempotent (unique constraint + phase-check).
- API authorization enforced on all new socket events and REST endpoints touching conversations.
- Structured logging for match creation, phase transitions, and decisions.

## 10. Suggested plan split

Per the roadmap's note that Phase 2 will likely need finer splits than Phase 1's backend/mobile pair:

1. **Prep plan** (§2) — must land first.
2. **Plan A** (§5) — gateway + matchmaking.
3. **Plan B** (§6) — state machine + Continue/End gate, builds on Plan A.
4. **Plan C** (§7) — mobile realtime screen, can start once Plan A's events are stable enough to integrate against.
