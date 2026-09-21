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
