# 24H Conversation App — Complete Product Documentation

> Combined Product PRD, Technical PRD/System Design, and Business Logic.

---

# 24H Conversation App — Product PRD

## 1. Product Overview

A social conversation app where users go live for 24 hours and meet other currently-live people through short, mutual-consent conversation stages.

### Core experience

> **30 seconds to meet. 3 minutes to connect. A lifetime if it's mutual.**

The product is designed to feel like a social game rather than a traditional swipe/dating app.

### Core loop

1. User has a permanent account and Chat Identity.
2. User chooses **Go Live**.
3. A temporary Live Profile becomes discoverable for 24 hours.
4. User is matched with another eligible live user.
5. They talk for 30 seconds.
6. Both independently choose whether to continue.
7. If both continue, they get 3 more minutes.
8. Both independently choose whether to create a permanent connection.
9. If both agree, a permanent connection/chat is created.
10. Live Profile expires after 24 hours, while account, identity, achievements, score and permanent connections remain.

---

## 2. Problem

Traditional social/dating apps often require heavy profile browsing, swiping and commitment before people actually talk.

This product reduces that friction by making the first interaction:

- short
- mutual
- low-pressure
- time-boxed
- game-like
- consent-driven

---

## 3. Goals

### Primary goals

- Make meeting new people fast.
- Encourage actual conversations rather than endless browsing.
- Give both users control at every stage.
- Create a lightweight social-game progression system.
- Keep the permanent identity separate from the temporary live state.
- Build an architecture capable of realtime interaction at scale.

### Non-goals

- Do not claim scientifically measured compatibility.
- Do not expose private rejection reasons.
- Do not allow money to bypass consent.
- Do not use activity score as a measure of attractiveness, safety or worth.
- Do not require precise location sharing.

---

## 4. User Account vs Chat Identity vs Live Profile

### Permanent Account

Contains:

- authentication
- account status
- settings
- privacy
- subscription state

It survives indefinitely.

### Permanent Chat Identity

Created the first time the user enters the chat/matching experience.

Example:

- display name
- avatar
- intro
- interests
- language
- optional intent

The identity persists.

### Temporary Live Profile

Created whenever the user selects **Go Live**.

Contains:

- current live state
- daily vibe
- current intent
- discovery preferences
- live metadata
- expiration time

The Live Profile expires after 24 hours.

---

## 5. Go Live

When the user selects **Go Live**:

1. Verify account is active.
2. Verify Chat Identity exists.
3. Create Live Profile.
4. Set `startedAt`.
5. Set `expiresAt = startedAt + 24 hours`.
6. Add user to eligible matchmaking pool.
7. Mark user as live.
8. Begin presence heartbeat.

The server is authoritative for the live period.

---

## 6. Daily Vibe

A user can optionally choose a temporary vibe:

- Chill
- Curious
- Funny
- Talkative
- Serious
- Just meeting people
- Learning something
- Open to anything

This is temporary context and does not modify permanent identity.

---

## 7. Matching

A match can only happen between eligible live users.

### Basic eligibility

Both users must:

- have active accounts
- have valid Chat Identities
- have active Live Profiles
- not be blocked by each other
- not have an active conversation with another person
- satisfy applicable discovery preferences
- satisfy age/safety requirements
- not be restricted by moderation

### Match philosophy

Matching should optimize for:

- eligibility
- availability
- reasonable preferences
- variety
- low latency

Avoid exposing a numerical compatibility score as a fact.

---

## 8. Conversation Flow

```text
MATCHED
   |
   v
PHASE_30_ACTIVE
   |
   v
PHASE_30_EXPIRED
   |
   +---- either END ----> CLOSED
   |
   +---- both CONTINUE -> PHASE_3M_ACTIVE
                              |
                              v
                         PHASE_3M_EXPIRED
                              |
                              +---- either END ----> CLOSED
                              |
                              +---- both CONNECT -> PERMANENT_CONNECTION
```

### Phase 1 — 30 seconds

Purpose:

> "Do I want to continue talking?"

At 30 seconds both users independently choose:

- Continue
- End

The other user should not be told the private rejection reason or which decision caused the conversation to end.

### Phase 2 — 3 minutes

If both chose Continue:

- phase becomes active
- timer is reset to 3 minutes
- both can continue messaging

At 3 minutes both choose:

- End
- Connect

If both choose Connect, create a permanent connection.

### Permanent Connection

A permanent connection:

- survives Live Profile expiration
- appears in Connections
- supports normal ongoing messaging
- contributes to confirmed match count
- can remain until users disconnect/block according to product rules

---

## 9. Safety

Core controls:

- Block
- Report
- Mute
- Leave
- Safe Exit

Safety actions override normal conversation flow.

### Safety principles

- Never reveal who reported whom.
- A block removes the blocked user from future candidate pools.
- Moderation can terminate an active session.
- Exact location is never required.
- Broad city/region may be used where appropriate.
- Premium cannot bypass safety controls or consent.

---

## 10. Gamification

The product uses several separate progression systems.

### XP

Measures activity/progression.

### Level

Represents cumulative XP.

### Achievements

Milestones users unlock.

### Streaks

Reward consistent participation.

### Match Count

Counts confirmed mutual permanent connections.

### Conversation Time

Counts valid active conversation time.

### Trust

A separate safety/behavior signal. Trust must not be treated as an activity score.

---

## 11. Match Achievements

| Milestone | Example Achievement |
|---:|---|
| 5 | First Connections |
| 25 | Connector |
| 100 | Socializer |
| 250 | Networker |
| 500 | Super Connector |
| 1,000 | Social Legend |

A "match" means a confirmed permanent mutual connection.

---

## 12. Conversation-Time Achievements

| Time | Achievement |
|---:|---|
| 60 minutes | First Hour |
| 3 hours | Talker |
| 9 hours | Conversationalist |
| 25 hours | Deep Talker |
| 50 hours | Social Explorer |
| 100 hours | Conversation Veteran |

Only valid active conversation time counts.

Idle screen time does not count.

---

## 13. Streaks

| Streak | Achievement |
|---:|---|
| 3 days | Getting Started |
| 7 days | Regular |
| 30 days | Dedicated |
| 100 days | Social Habit |
| 365 days | Legend |

---

## 14. XP Model

Example configurable values:

| Action | XP |
|---|---:|
| Complete 30-second phase | +5 |
| Both advance to 3-minute phase | +15 |
| Create permanent mutual connection | +30 |
| Complete daily challenge | +10 |
| Earn achievement | +25 |
| Qualifying daily activity | +5 |

All values should be server-configurable.

---

## 15. Anti-Farming

Prevent users from artificially farming progression.

Rules:

- No XP just for opening a conversation.
- No XP for idle time.
- Achievements can only be awarded once.
- Repeated matching with the same user can be limited.
- Detect abnormal session frequency.
- Detect automation/bot behavior.
- Conversation time is measured server-side.
- Match count only increments after a confirmed permanent connection.

---

## 16. Daily Challenges

Examples:

- Complete 5 conversations.
- Talk for 15 minutes.
- Complete 3 mutual connections.
- Answer 5 daily questions.
- Meet someone from another city/region.

Rewards may include XP and seasonal progress.

---

## 17. Seasonal Achievements

Example monthly challenge:

- Complete 5 conversations.
- Get 3 mutual matches.
- Reach 60 minutes of conversation.
- Talk to someone from another city/region.
- Complete 5 daily questions.

Reward:

- seasonal badge

Badges can remain permanently on the account.

---

## 18. Conversation Prompts

Optional prompts:

- What are you currently excited about?
- What is your perfect Sunday?
- What is one place you want to visit?
- What could you talk about for hours?
- What are you currently obsessed with?
- What are you learning right now?
- What is a green flag you appreciate in people?

---

## 19. Social/Game Features

Potential future features:

### Conversation Missions

Example:

> Find one thing you both have in common.

### Mystery Match

Reveal limited information progressively.

### Mini Games

- Would You Rather
- Two Truths & a Lie
- Guess My Answer

### Daily Global Question

Everyone gets the same question.

### City/Region Badges

Use broad geography without exposing precise location.

### Seasonal Challenges

Limited-time achievement sets.

### Profile Badges

Users can select up to three earned badges to display.

---

## 20. Monetization

Possible model:

### Free

- limited daily conversation opportunities
- core matching
- permanent connections
- achievements

### Rewarded Ads

Users can optionally watch an ad for additional opportunities.

### Premium

Potential benefits:

- remove ads
- additional conversation opportunities
- profile customization
- cosmetic features
- advanced non-sensitive discovery preferences

### Monetization restrictions

Premium must not:

- force a match
- bypass consent
- reveal private rejection decisions
- buy Trust
- buy achievements
- interrupt active conversations with ads
- place ads over safety controls

Conversation content should not be used for sensitive ad personalization.

---

## 21. Notifications

Potential notifications:

- match found
- someone is ready for the next phase
- connection created
- new message from permanent connection
- achievement unlocked
- streak reminder
- live profile expiring

Realtime state remains authoritative if push notification delivery is delayed.

---

## 22. Analytics

Track:

- live starts
- live duration
- match rate
- 30-second completion rate
- continue rate
- 3-minute completion rate
- permanent connection rate
- average valid conversation time
- daily active users
- live-to-conversation conversion
- conversation-to-connection conversion
- block rate
- report rate
- retention
- monetization conversion

Avoid collecting unnecessary sensitive conversation content.

---

## 23. Core Product Rule

> **30 seconds to meet. 3 minutes to connect. A lifetime if it's mutual.**

The system should always preserve mutual consent at each progression gate.


---

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


---

# 24H Conversation App — Business Logic Specification

## 1. Purpose

This document defines the authoritative business rules for:

- accounts
- Chat Identity
- Live Profiles
- matching
- conversations
- phase decisions
- permanent connections
- messaging
- XP
- levels
- achievements
- streaks
- Trust
- safety
- challenges
- monetization
- notifications
- edge cases

---

# 2. Business Principles

1. Account identity is permanent.
2. Live state is temporary.
3. Live Profiles last 24 hours.
4. Conversation progression requires mutual consent.
5. A private rejection must not expose the rejecting user's decision.
6. Server time is authoritative.
7. Safety controls override normal conversation flow.
8. Permanent connections require mutual agreement.
9. XP measures activity, not attractiveness or safety.
10. Trust is separate from activity progression.
11. Premium cannot bypass consent or safety.

---

# 3. Entities

## User

Permanent authenticated account.

## Chat Identity

Permanent public-facing identity.

## Live Profile

Temporary 24-hour discovery state.

## Match

A pairing that creates a conversation session.

## Conversation Session

A timed interaction between two users.

## Decision

A user's choice at a phase gate.

## Permanent Connection

A confirmed mutual long-term connection.

## Achievement

One-time milestone reward.

## XP Event

A server-generated progression event.

## Trust

Private safety/behavior signal.

---

# 4. Chat Identity Creation

First time a user enters the chat experience:

```text
IF Chat Identity does not exist
    show identity creation
ELSE
    load existing identity
```

Required:

- display name
- avatar

Optional:

- intro
- interests
- language
- intent

After creation, the identity is persistent.

---

# 5. Go Live

Preconditions:

```text
account.status == ACTIVE
identity.exists == true
user not restricted from live matching
```

Create:

```text
LiveProfile
startedAt = serverNow()
expiresAt = startedAt + 24h
status = ACTIVE
```

Then:

```text
presence = LIVE
matchmaking eligibility = true
```

---

# 6. Live Profile Expiration

When:

```text
serverNow() >= expiresAt
```

the Live Profile becomes expired.

Effects:

- remove from matchmaking
- mark offline/not-live
- prevent new conversations
- preserve permanent identity
- preserve achievements
- preserve XP
- preserve permanent connections

Existing permanent connections remain available.

---

# 7. Re-Going Live

After expiration, the user can start another Live Profile.

Each Live Profile gets a new ID and new:

```text
startedAt
expiresAt
```

Do not overwrite historical live-session records if analytics require history.

---

# 8. Daily Vibe

A Live Profile may contain one temporary vibe.

Examples:

```text
CHILL
CURIOUS
FUNNY
TALKATIVE
SERIOUS
MEET_PEOPLE
LEARNING
OPEN
```

Vibe:

- expires with Live Profile
- does not modify permanent identity
- may affect discovery/prompts

---

# 9. Matching Eligibility

A user is eligible only if:

```text
account active
AND identity exists
AND live profile active
AND not blocked
AND not restricted
AND no conflicting active conversation
AND discovery rules satisfied
```

Before finalizing a match, re-check eligibility from authoritative state.

---

# 10. Match Creation

When two eligible users are paired:

1. Create conversation session.
2. Mark both as occupied for matching.
3. Create phase 30 timer.
4. Emit Match Found.
5. Emit Conversation Started.

State:

```text
MATCHED
→ PHASE_30_ACTIVE
```

---

# 11. 30-Second Phase

Duration:

```text
30 seconds
```

The server stores:

```text
phaseStartedAt
phaseExpiresAt
```

The client displays countdown based on server time.

During this phase:

- both can message
- both can leave
- both can block/report
- safety exit remains available

---

# 12. 30-Second Decision

At expiration, each user selects:

```text
CONTINUE
END
```

Decision storage:

```text
conversationId
userId
phase = 30
decision
```

Unique:

```text
conversationId + userId + phase
```

---

# 13. 30-Second Decision Matrix

| User A | User B | Result |
|---|---|---|
| Continue | Continue | Start 3-minute phase |
| Continue | End | Close |
| End | Continue | Close |
| End | End | Close |
| No decision | Any | Close when decision deadline is reached |

The other user should not receive the private rejection reason.

---

# 14. 3-Minute Phase

If both continue:

```text
state = PHASE_3M_ACTIVE
phaseStartedAt = serverNow()
phaseExpiresAt = serverNow() + 3m
```

The users receive another three minutes.

---

# 15. 3-Minute Decision

At expiration:

```text
END
CONNECT
```

Each user decides independently.

---

# 16. 3-Minute Decision Matrix

| User A | User B | Result |
|---|---|---|
| Connect | Connect | Permanent Connection |
| Connect | End | Close |
| End | Connect | Close |
| End | End | Close |
| No decision | Any | Close |

---

# 17. Permanent Connection Rules

A permanent connection is created only when:

```text
A.decision == CONNECT
AND
B.decision == CONNECT
```

Create exactly one connection.

Canonical ordering:

```text
canonicalUserA = min(userA, userB)
canonicalUserB = max(userA, userB)
```

Unique constraint prevents duplicates.

---

# 18. Closing a Conversation

A conversation may close because of:

- End decision
- timeout without required consent
- block
- report requiring termination
- moderation action
- safety exit
- technical policy restriction

Set:

```text
state = CLOSED
closedAt = serverNow()
closeReason = ...
```

Do not reveal private decision details to the other user.

---

# 19. Safe Exit

Safe Exit immediately ends the conversation.

It should:

- terminate active conversation
- prevent further messages in that session
- preserve safety event data required for moderation
- optionally allow reporting/blocking

Safe Exit must be accessible without navigating through multiple screens.

---

# 20. Blocking

When A blocks B:

- terminate any active conversation
- remove B from A's future candidate pool
- prevent future matching
- prevent future direct messaging where applicable

Block should take precedence over normal conversation progression.

---

# 21. Reporting

A user can report another user with:

- category
- optional details

Possible categories:

- harassment
- spam
- inappropriate content
- impersonation
- scam/fraud
- unwanted behavior
- safety concern
- other

Reporter identity must not be revealed to the reported user.

---

# 22. Messaging

During timed conversations:

- both users can send messages
- server validates sender authorization
- message is persisted
- message gets server timestamp
- duplicate client messages are rejected/idempotently acknowledged

After permanent connection:

- normal persistent chat rules apply

---

# 23. Valid Conversation Time

Conversation time counts only while:

```text
conversation is ACTIVE
AND
phase is valid
AND
both users are part of session
```

Do not count:

- idle time after closure
- time after expiration
- client-manipulated timestamps

Use server timestamps.

---

# 24. XP Rules

Initial configurable rules:

| Event | XP |
|---|---:|
| Complete 30-sec phase | +5 |
| Both advance to 3-min | +15 |
| Permanent connection | +30 |
| Daily challenge | +10 |
| Achievement | +25 |
| Qualifying daily activity | +5 |

XP should be awarded through server-side events.

---

# 25. XP Anti-Farming

Do not award XP for:

- opening chat
- sitting idle
- refreshing
- reconnecting
- repeatedly starting/canceling sessions

Controls:

- event idempotency
- rate limits
- repeated-user limits
- anomaly detection
- server-side timers
- server-side statistics

---

# 26. Match Count

Increment match count only after:

```text
permanent connection successfully created
```

Do not count:

- match found
- 30-second conversation started
- Continue decision
- 3-minute phase started

---

# 27. Match Achievements

Suggested milestones:

| Count | Achievement |
|---:|---|
| 5 | First Connections |
| 25 | Connector |
| 100 | Socializer |
| 250 | Networker |
| 500 | Super Connector |
| 1,000 | Social Legend |

Each achievement is awarded once.

---

# 28. Conversation-Time Achievements

| Time | Achievement |
|---:|---|
| 60 min | First Hour |
| 3 h | Talker |
| 9 h | Conversationalist |
| 25 h | Deep Talker |
| 50 h | Social Explorer |
| 100 h | Conversation Veteran |

Time must be calculated from valid server-side conversation duration.

---

# 29. Streak Logic

Suggested milestones:

```text
3 days
7 days
30 days
100 days
365 days
```

A day qualifies when the user completes the configured minimum activity.

Do not require the user to remain online continuously.

---

# 30. Level Logic

Use configurable thresholds.

Example:

```text
Level 1 = 0 XP
Level 2 = 100 XP
Level 3 = 250 XP
Level 4 = 450 XP
...
```

Thresholds should be stored in configuration/database so the progression curve can change without an app release.

---

# 31. Trust Logic

Trust is not XP.

Potential inputs:

- confirmed moderation outcomes
- confirmed spam
- automation detection
- repeated confirmed abuse
- account restrictions

Rules:

- one block does not automatically mean abuse
- raw moderation signals remain private
- Trust cannot be purchased
- high XP does not imply high Trust
- high Trust does not imply high popularity

---

# 32. Daily Challenge Logic

Daily challenge example:

```text
Complete 5 conversations
```

Server checks qualifying conversation events.

When condition is met:

```text
challenge.status = COMPLETED
award reward
```

Use an idempotency key to prevent duplicate rewards.

---

# 33. Seasonal Challenge Logic

Example:

```text
Complete 5 conversations
Get 3 permanent connections
Reach 60 minutes
Meet someone from another region
Answer 5 daily questions
```

Reward:

```text
seasonal achievement/badge
```

Seasonal badge remains after the season if product rules specify permanent ownership.

---

# 34. Profile Display

Permanent profile may show:

- display name
- avatar
- selected interests
- selected achievements
- selected badges
- optional stats

Avoid exposing:

- private rejection history
- reports
- moderation details
- raw Trust signals
- exact location

---

# 35. Privacy

Do not require precise location.

If geography is useful, use:

- city
- broad region
- country

Avoid:

- exact address
- exact coordinates
- building-level location

---

# 36. Monetization Rules

Free tier may have:

- daily conversation limits
- ads
- rewarded opportunities

Premium may provide:

- no ads
- more opportunities
- customization
- non-sensitive preference controls

Premium must not:

- force matching
- reveal rejection decisions
- bypass blocks
- bypass safety
- buy Trust
- buy achievements
- manipulate mutual consent

---

# 37. Ad Rules

Ads must never:

- interrupt an active timed conversation
- appear over safety controls
- block a Safe Exit
- use sensitive conversation content for ad targeting

Rewarded ads should be optional.

---

# 38. Notification Rules

Possible notifications:

```text
MATCH_FOUND
CONNECTION_CREATED
NEW_MESSAGE
ACHIEVEMENT_UNLOCKED
STREAK_REMINDER
LIVE_EXPIRING
```

Do not send notifications revealing another person's private rejection decision.

---

# 39. Edge Cases

## User closes app

Session continues according to server state.

On reconnect:

1. authenticate
2. fetch authoritative conversation state
3. synchronize timer
4. continue or close based on server state

## User loses network

Allow reconnect within configured grace rules.

## Both decide simultaneously

Atomic server transaction determines the transition.

## User sends duplicate message

Use `clientMessageId`.

## User blocks during timer

Conversation immediately closes.

## Live Profile expires during conversation

Define product rule explicitly; recommended:

- do not allow new matches after expiry
- existing active conversation can finish its current phase according to conversation state
- permanent connection may still be created if both complete the flow

## Server restarts

Recover from durable state.

## Redis restarts

Rebuild ephemeral presence/match pools from authoritative data where needed.

---

# 40. Business Events

Recommended events:

```text
USER_CREATED
CHAT_IDENTITY_CREATED
LIVE_STARTED
LIVE_EXPIRED
MATCH_CREATED
CONVERSATION_STARTED
PHASE_30_COMPLETED
PHASE_3M_STARTED
PHASE_3M_COMPLETED
PERMANENT_CONNECTION_CREATED
CONVERSATION_CLOSED
MESSAGE_SENT
ACHIEVEMENT_EARNED
XP_GRANTED
STREAK_UPDATED
REPORT_CREATED
BLOCK_CREATED
TRUST_UPDATED
```

Events should be idempotent where they trigger rewards or side effects.

---

# 41. Analytics Definitions

## Match

A conversation session successfully created between two eligible users.

## Permanent Match

A permanent connection created after mutual Connect decisions.

## 30-sec Completion

Both users remain in the session until the phase reaches its decision point.

## Continue Rate

Number of users choosing Continue / eligible users reaching the 30-second decision.

## Connection Rate

Permanent connections / completed 3-minute decision sessions.

## Valid Conversation Time

Server-measured active session time.

---

# 42. Guardrails

The system must not allow:

- client-generated XP
- client-generated achievements
- duplicate permanent connections
- blocked-user rematching
- unauthorized message sending
- timer manipulation
- private decision leakage
- premium consent bypass
- exact-location exposure

---

# 43. Example End-to-End Flow

```text
User A creates Chat Identity
        ↓
User A goes Live
        ↓
Live Profile active for 24h
        ↓
User B also goes Live
        ↓
Match created
        ↓
30-second conversation
        ↓
A = Continue
B = Continue
        ↓
3-minute conversation
        ↓
A = Connect
B = Connect
        ↓
Permanent Connection created
        ↓
+30 XP
        ↓
Match count +1
        ↓
Achievement evaluation
        ↓
Users can continue permanent chat
```

---

# 44. Configurable Business Values

Keep these configurable:

```text
LIVE_PROFILE_DURATION = 24h
PHASE_30_DURATION = 30s
PHASE_3M_DURATION = 3m

XP_PHASE_30 = 5
XP_PHASE_3M = 15
XP_CONNECTION = 30
XP_DAILY_CHALLENGE = 10
XP_ACHIEVEMENT = 25

MATCH_MILESTONES = [5, 25, 100, 250, 500, 1000]

TIME_MILESTONES = [
  60m,
  3h,
  9h,
  25h,
  50h,
  100h
]
```

These values should not require a mobile app release to change.

---

# 45. Final Business Rule

The complete product loop is:

```text
PERMANENT ACCOUNT
      ↓
PERMANENT CHAT IDENTITY
      ↓
GO LIVE
      ↓
24-HOUR LIVE PROFILE
      ↓
MATCH
      ↓
30 SECONDS
      ↓
BOTH CONTINUE?
   ┌───────┴────────┐
   NO              YES
   ↓                ↓
 CLOSE           3 MINUTES
                    ↓
              BOTH CONNECT?
               ┌────┴────┐
               NO        YES
               ↓          ↓
             CLOSE   PERMANENT CHAT
```

> **30 seconds to meet. 3 minutes to connect. A lifetime if it's mutual.**
