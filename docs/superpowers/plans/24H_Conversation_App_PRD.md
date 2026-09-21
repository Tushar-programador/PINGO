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
