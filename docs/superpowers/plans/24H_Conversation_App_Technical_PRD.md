# 24H Conversation App — Technical PRD & System Design

## 1. Technical Summary

The application is a realtime social conversation platform with:

- permanent user accounts
- permanent Chat Identities
- temporary 24-hour Live Profiles
- realtime matchmaking
- 30-second and 3-minute conversation phases
- mutual decision gates
- permanent connections
- realtime messaging
- achievements and progression
- moderation and Trust
- scalable Node.js backend

The architecture should prioritize:

- low latency
- correctness
- realtime consistency
- graceful recovery
- horizontal scaling
- server-authoritative timers
- idempotent operations

---

# 2. Recommended Stack

## Mobile

- React Native
- Expo
- TypeScript
- Expo Router
- TanStack Query
- Zustand
- Reanimated
- Socket.IO Client

## Backend

- Node.js
- TypeScript
- Fastify
- Socket.IO

## Data

- PostgreSQL — durable source of truth
- Redis — ephemeral state and coordination
- Object storage + CDN — media

## Background jobs

- BullMQ
- Redis

---

# 3. High-Level Architecture

```text
                    ┌──────────────────┐
                    │  React Native    │
                    │   Mobile App     │
                    └────────┬─────────┘
                             │
                    HTTPS + WebSocket
                             │
                    ┌────────▼─────────┐
                    │  Load Balancer   │
                    └────────┬─────────┘
                             │
             ┌───────────────┼───────────────┐
             │               │               │
        ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
        │ Node #1 │     │ Node #2 │     │ Node #3 │
        └────┬────┘     └────┬────┘     └────┬────┘
             │               │               │
             └───────────────┼───────────────┘
                             │
                     ┌───────▼───────┐
                     │     Redis     │
                     └───────┬───────┘
                             │
                     ┌───────▼───────┐
                     │  PostgreSQL   │
                     └───────────────┘

              ┌──────────────────────┐
              │ Object Storage/CDN   │
              └──────────────────────┘
```

---

# 4. Architecture Principle

Use a **modular monolith initially**, not microservices.

Suggested backend modules:

```text
auth
users
identities
live-profiles
matchmaking
conversations
connections
messages
achievements
stats
trust
moderation
notifications
```

Split services only after real traffic and operational metrics justify it.

---

# 5. Data Ownership

## PostgreSQL

Durable source of truth.

Stores:

- users
- chat identities
- live profiles
- matches
- conversation sessions
- decisions
- permanent connections
- messages
- achievements
- user stats
- trust
- moderation records
- reports
- blocks

## Redis

Fast ephemeral state.

Stores:

- presence
- matchmaking pools
- active session state
- countdown metadata
- distributed locks
- Socket.IO adapter state
- rate limits

Redis loss must not destroy durable business data.

## Object Storage

Stores:

- avatars
- profile images
- future media

Use signed upload URLs and CDN delivery.

---

# 6. Core Database Model

## users

```text
id
email / auth_identifier
status
created_at
updated_at
```

## chat_identities

```text
id
user_id
display_name
avatar_url
intro
interests
language
created_at
updated_at
```

## live_profiles

```text
id
user_id
vibe
intent
preferences
started_at
expires_at
status
created_at
```

## conversation_sessions

```text
id
user_a_id
user_b_id
state
phase
started_at
phase_started_at
phase_expires_at
closed_at
close_reason
created_at
updated_at
```

## conversation_decisions

```text
id
conversation_id
user_id
phase
decision
created_at

UNIQUE(conversation_id, user_id, phase)
```

## permanent_connections

```text
id
user_a_id
user_b_id
created_at
status

UNIQUE(canonical_user_a, canonical_user_b)
```

## messages

```text
id
connection_id
sender_id
client_message_id
body
created_at
```

Use:

```text
UNIQUE(connection_id, sender_id, client_message_id)
```

for message idempotency.

---

# 7. Server-Authoritative Time

Never trust the mobile client's countdown.

Server creates:

```text
startedAt = serverNow()
expiresAt = startedAt + duration
```

For 30 seconds:

```text
expiresAt = startedAt + 30 seconds
```

For 3 minutes:

```text
expiresAt = startedAt + 3 minutes
```

The client displays:

```text
remaining = expiresAt - synchronizedServerTime
```

The server determines whether the phase is actually expired.

---

# 8. Conversation State Machine

```text
MATCHED
  ↓
PHASE_30_ACTIVE
  ↓
PHASE_30_EXPIRED
  ├── END → CLOSED
  └── BOTH_CONTINUE → PHASE_3M_ACTIVE
                         ↓
                     PHASE_3M_EXPIRED
                         ├── END → CLOSED
                         └── BOTH_CONNECT → PERMANENT_CONNECTION
```

Every transition must be:

- atomic
- idempotent
- authorization checked
- server-side

---

# 9. Concurrency Control

Critical operations:

- phase transition
- Continue decisions
- Connect decisions
- permanent connection creation
- block/report termination

Use:

1. Redis distributed lock for high-contention operations.
2. PostgreSQL transaction for authoritative state.
3. Unique database constraints to prevent duplicates.
4. Idempotency keys where appropriate.

Do not rely on Redis alone for permanent state.

---

# 10. Redis Keys

Examples:

```text
presence:user:{userId}

live:{liveProfileId}

match:pool:{segment}

conversation:{sessionId}

conversation:decision:{sessionId}:{phase}

lock:conversation:{sessionId}

rate:{userId}:{action}
```

---

# 11. Matchmaking

A matchmaking worker/service can maintain Redis pools.

Example:

```text
match:pool:general
match:pool:language:en
match:pool:region:ncr
```

Candidate eligibility must still be verified server-side before a match is committed.

Do not trust stale Redis membership.

---

# 12. Realtime

Use Socket.IO.

Main events:

```text
LIVE_STARTED
MATCH_FOUND
CONVERSATION_STARTED
MESSAGE_NEW
MESSAGE_ACK
PHASE_EXPIRING
PHASE_EXPIRED
DECISION_UPDATED
PHASE_ADVANCED
CONNECTION_CREATED
CONVERSATION_CLOSED
FORCE_TERMINATED
```

When running multiple Node instances, use the Socket.IO Redis adapter.

---

# 13. REST API

## Auth

```http
POST /v1/auth/*
```

## Current user

```http
GET /v1/me
```

## Chat Identity

```http
POST /v1/chat-identity
GET /v1/chat-identity
```

## Live Profile

```http
POST /v1/live
DELETE /v1/live
GET /v1/live/me
```

## Discovery

```http
GET /v1/discover
POST /v1/matches
```

## Conversation decisions

```http
POST /v1/conversations/:id/decision
```

## Connections

```http
GET /v1/connections
GET /v1/connections/:id/messages
```

## Safety

```http
POST /v1/reports
POST /v1/blocks
```

## Progression

```http
GET /v1/me/stats
GET /v1/me/achievements
GET /v1/challenges/today
```

---

# 14. WebSocket Protocol

Example:

```json
{
  "event": "MESSAGE_SEND",
  "data": {
    "conversationId": "conversation-id",
    "clientMessageId": "client-generated-id",
    "body": "Hello!"
  }
}
```

Server acknowledgement:

```json
{
  "event": "MESSAGE_ACK",
  "data": {
    "clientMessageId": "client-generated-id",
    "messageId": "server-message-id",
    "createdAt": "server-timestamp"
  }
}
```

---

# 15. Message Delivery

Flow:

```text
Client
  ↓
Socket.IO
  ↓
Validate + authorize
  ↓
Persist PostgreSQL
  ↓
ACK sender
  ↓
Emit recipient
```

Client can optimistically render a message.

The server remains authoritative.

---

# 16. Message History

Use cursor pagination.

Example:

```http
GET /v1/connections/:id/messages?cursor=...&limit=30
```

Do not load an entire conversation history at once.

---

# 17. Image Upload

Do not proxy large image files through the Node application.

Flow:

```text
Mobile
  ↓
Request signed upload URL
  ↓
Object Storage
  ↓
CDN
  ↓
Profile
```

Perform:

- file type validation
- size validation
- image moderation where required
- signed upload expiration

---

# 18. Background Jobs

BullMQ can handle:

- Live Profile expiry cleanup
- conversation recovery jobs
- achievement processing
- streak updates
- push notifications
- moderation jobs
- statistics rollups

Important:

> BullMQ does not replace authoritative timers or state transitions.

The database/session state remains authoritative.

---

# 19. Failure Recovery

## Network disconnect

Use a short reconnect/grace period.

The session continues according to server state.

## Node crash

Another instance can resume from PostgreSQL + Redis state.

## Redis restart

Presence may temporarily reset.

Durable business state remains in PostgreSQL.

## Duplicate Continue

Must be idempotent.

## Simultaneous decisions

Use transaction/constraint logic.

## Worker delay

A delayed worker must not make an expired session incorrectly active.

`expiresAt` and state-machine validation remain authoritative.

## Push notification delay

Push notifications are informational.

Realtime/API state is authoritative.

---

# 20. Permanent Connection Transaction

When both users select Connect:

1. Lock conversation.
2. Verify phase is `PHASE_3M_EXPIRED`.
3. Verify both decisions are Connect.
4. Canonicalize user IDs.
5. Insert permanent connection.
6. Mark conversation as permanent.
7. Update stats.
8. Emit `CONNECTION_CREATED`.
9. Commit transaction.

Use a unique canonical pair:

```text
min(userA,userB)
max(userA,userB)
```

to prevent duplicate connections.

---

# 21. Performance Targets

Initial engineering targets:

| Area | Target |
|---|---:|
| API p95 | < 250 ms |
| Match event p95 | < 500 ms |
| Connected message delivery p95 | < 300 ms |
| Phase transition propagation | < 500 ms |
| Mobile cold start | < 2.5 sec |

These are engineering targets, not guaranteed SLAs.

---

# 22. Scaling Plan

## MVP

```text
1 Node instance
PostgreSQL
Redis
Object storage
```

## Early growth

```text
2–3 Node instances
Load Balancer
Redis Adapter
PostgreSQL
Redis
```

## Higher traffic

- horizontally scale Node
- optimize PostgreSQL indexes
- tune Redis
- introduce read replicas if required
- move heavy workloads to workers

## Large scale

Potentially separate:

- realtime gateway
- matchmaking workers
- notification workers
- moderation pipeline

Only when metrics justify the complexity.

---

# 23. Mobile Performance

Important practices:

- minimize unnecessary renders
- use FlashList for long lists
- paginate messages
- cache server state
- compress images
- use CDN
- avoid loading large media on initial screen
- reconnect sockets efficiently
- use Reanimated for transitions
- keep timer rendering local while state remains server-authoritative

---

# 24. Security

Use:

- TLS
- secure token storage
- short-lived access tokens
- refresh-token rotation
- server-side authorization
- input validation
- rate limiting
- abuse detection
- signed media uploads
- moderation audit logs

Never trust:

- client user IDs
- client timestamps
- client countdown completion
- client XP
- client achievement claims
- client connection ownership

---

# 25. Abuse Prevention

Potential controls:

- IP/device/account rate limits
- repeated-match limits
- message rate limits
- spam detection
- automation detection
- account age restrictions
- report thresholds
- moderation queues
- block enforcement

---

# 26. Trust System

Trust is separate from XP.

Potential signals:

- confirmed moderation outcomes
- spam/automation detection
- repeated confirmed abuse
- safety restrictions

Rules:

- A single block is not proof of wrongdoing.
- Trust should not be publicly reduced to a simplistic score without careful product design.
- Trust cannot be bought.
- Raw moderation signals remain private.

---

# 27. Gamification Architecture

Recommended tables:

```text
achievements
user_achievements
user_stats
xp_events
streaks
daily_challenges
seasonal_challenges
```

XP should be event-driven.

Example:

```text
CONVERSATION_PHASE_COMPLETED
PERMANENT_CONNECTION_CREATED
DAILY_CHALLENGE_COMPLETED
ACHIEVEMENT_EARNED
```

A server-side progression service consumes these events.

---

# 28. Observability

Monitor:

- API latency
- WebSocket connections
- message delivery latency
- matchmaking latency
- Redis latency
- PostgreSQL latency
- failed transactions
- phase transition errors
- reconnect rate
- job failures
- report volume
- block volume
- crash rate

Use structured logs.

Never log sensitive conversation content unnecessarily.

---

# 29. Repository Structure

```text
apps/
  mobile/
    app/
    src/
      features/
        auth/
        identity/
        live/
        discovery/
        conversation/
        connections/
        achievements/
        profile/
      shared/
        api/
        socket/
        storage/
        ui/

  api/
    src/
      modules/
        auth/
        users/
        identities/
        live-profiles/
        matchmaking/
        conversations/
        connections/
        messages/
        achievements/
        stats/
        trust/
        moderation/
        notifications/
      infrastructure/
        postgres/
        redis/
        socket/
        storage/
        jobs/
      shared/
        errors/
        validation/
        logger/
        events/

packages/
  contracts/
  validation/
  config/
```

---

# 30. MVP Build Order

## Phase 1

- authentication
- Chat Identity
- Live Profile
- basic discovery
- PostgreSQL
- Redis

## Phase 2

- matchmaking
- Socket.IO
- 30-second conversation
- decision gate

## Phase 3

- 3-minute phase
- Connect decision
- permanent connections
- message history

## Phase 4

- achievements
- XP
- streaks
- daily challenges

## Phase 5

- block/report
- moderation
- Trust
- abuse detection

## Phase 6

- monetization
- rewarded ads
- premium
- analytics

---

# 31. Definition of Done

A release is complete when:

- server controls all phase timers
- reconnect resumes correctly
- duplicate decisions are idempotent
- permanent connections cannot duplicate
- blocked users cannot rematch
- report/block actions can terminate sessions
- messages are persisted correctly
- achievement awards are idempotent
- XP cannot be client-forged
- Live Profiles expire correctly
- Redis failure does not destroy durable data
- API authorization is enforced
- rate limits exist
- structured logging and metrics exist
