# Phase 1 — Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `@pingo/api` service — auth, permanent Chat Identity, temporary 24h Live Profile, and a basic (unfiltered) Discovery list — backed by real PostgreSQL and Redis, with every route tested through Fastify's `.inject()`.

**Architecture:** Modular monolith (Fastify + TypeScript), one module per business concept (`auth`, `users`, `identities`, `live-profiles`, `discovery`), Drizzle ORM over PostgreSQL as the durable store, Redis wired in but not yet load-bearing (matchmaking pools/presence land in Phase 2). Every module's routes call a service; only services touch Drizzle.

**Tech Stack:** Node.js (ESM) + TypeScript (strict) + Fastify + Drizzle ORM + `postgres` (postgres-js) + ioredis + argon2 + jsonwebtoken + zod + Vitest + pnpm workspaces + docker-compose (Postgres, Redis).

**Spec:** `docs/24H_Conversation_App_COMPLETE.md` — Product PRD §4–7, Technical PRD §2,§6,§7,§13,§24, Business Logic §4–9. Strategy context: `docs/superpowers/plans/2026-09-21-project-roadmap.md`.

## Global Constraints

- Node.js ESM throughout (`"type": "module"` in every package.json); TypeScript `strict: true`.
- All commands run from the repo root via `pnpm --filter @pingo/api <script>` unless stated otherwise.
- Server-authoritative time: every `startedAt`/`expiresAt` is computed from `new Date()` on the server; the API never accepts a client-supplied timestamp (Technical PRD §7, §24).
- Never trust a client-supplied user id: `userId` is only ever derived from a verified access token via the `authenticate` preHandler (Technical PRD §24).
- Passwords are hashed with argon2; access tokens are short-lived JWTs; refresh tokens are opaque random values, stored only as a SHA-256 hash, and rotate on every use (Technical PRD §24, Business Logic principle 2.6).
- Only `infrastructure/postgres/schema.ts` defines table shapes; only a module's own `*.service.ts` file queries Drizzle for that module's tables. Routes never query the database directly.
- Tests hit a real local PostgreSQL/Redis (via docker-compose), not mocks — `resetDatabase()` truncates between tests.

---

### Task 1: Monorepo scaffold + Fastify health check

**Files:**
- Create: `package.json` (repo root)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/vitest.setup.ts`
- Create: `apps/api/.env.example`
- Create: `apps/api/src/shared/errors/AppError.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`
- Test: `apps/api/test/health.test.ts`

**Interfaces:**
- Produces: `buildApp(): FastifyInstance` (exported from `apps/api/src/app.ts`) — every later task registers its routes inside this function and every test imports it. `AppError` class (`code: string, message: string, statusCode: number`) — the one error type routes/services are allowed to throw for expected failures.

- [ ] **Step 1: Scaffold the workspace**

`package.json` (repo root):

```json
{
  "name": "pingo",
  "private": true,
  "packageManager": "pnpm@9.12.0"
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "sourceMap": true
  }
}
```

`apps/api/package.json`:

```json
{
  "name": "@pingo/api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "vitest run"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "fastify": "^5.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.8.1",
    "tsx": "^4.19.1",
    "typescript": "^5.6.3",
    "vitest": "^2.1.4"
  }
}
```

`apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src", "test"]
}
```

`apps/api/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
  },
});
```

`apps/api/vitest.setup.ts`:

```ts
import 'dotenv/config';
```

`apps/api/.env.example`:

```
PORT=3000
```

Copy it: `cp apps/api/.env.example apps/api/.env`

- [ ] **Step 2: Write `AppError` (needed by the error handler below)**

`apps/api/src/shared/errors/AppError.ts`:

```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

- [ ] **Step 3: Write the failing test**

`apps/api/test/health.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';

describe('GET /health', () => {
  it('returns ok status', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 4: Run it and confirm it fails**

Run: `pnpm install && pnpm --filter @pingo/api test`
Expected: FAIL — `../src/app.js` does not exist yet.

- [ ] **Step 5: Implement `buildApp`**

`apps/api/src/app.ts`:

```ts
import Fastify, { type FastifyInstance } from 'fastify';
import { AppError } from './shared/errors/AppError.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } });
      return;
    }

    app.log.error(error);
    reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
```

`apps/api/src/server.ts`:

```ts
import 'dotenv/config';
import { buildApp } from './app.js';

const app = buildApp();
const port = Number(process.env.PORT ?? 3000);

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
```

- [ ] **Step 6: Run the test again**

Run: `pnpm --filter @pingo/api test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json apps/api
git commit -m "feat(api): scaffold Fastify app with health check"
```

---

### Task 2: PostgreSQL schema, migrations, and connection

**Files:**
- Create: `docker-compose.yml` (repo root)
- Create: `apps/api/drizzle.config.ts`
- Create: `apps/api/src/infrastructure/postgres/schema.ts`
- Create: `apps/api/src/infrastructure/postgres/db.ts`
- Create: `apps/api/src/infrastructure/postgres/migrate.ts`
- Create: `apps/api/test/testUtils.ts`
- Modify: `apps/api/package.json` (add `drizzle-orm`, `postgres`, `drizzle-kit`, `db:generate`/`db:migrate` scripts)
- Modify: `apps/api/.env.example` (add `DATABASE_URL`)
- Test: `apps/api/test/db.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 beyond the workspace layout.
- Produces: `db` (Drizzle instance, `apps/api/src/infrastructure/postgres/db.ts`), and the schema tables `users`, `chatIdentities`, `liveProfiles`, `refreshTokens` (`apps/api/src/infrastructure/postgres/schema.ts`) — every later task's service file imports these. `resetDatabase(): Promise<void>` (`apps/api/test/testUtils.ts`) — every later test's `beforeEach` calls this.

- [ ] **Step 1: Add Postgres to docker-compose**

`docker-compose.yml` (repo root):

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: pingo
      POSTGRES_PASSWORD: pingo
      POSTGRES_DB: pingo
    ports:
      - "5432:5432"
    volumes:
      - pingo_postgres_data:/var/lib/postgresql/data

volumes:
  pingo_postgres_data:
```

Run: `docker compose up -d`

- [ ] **Step 2: Add dependencies and scripts**

Modify `apps/api/package.json` — add to `dependencies`: `"drizzle-orm": "^0.36.1"`, `"postgres": "^3.4.4"`; add to `devDependencies`: `"drizzle-kit": "^0.28.0"`; add to `scripts`: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "tsx src/infrastructure/postgres/migrate.ts"`.

Run: `pnpm install`

- [ ] **Step 3: Add `DATABASE_URL`**

Append to `apps/api/.env.example` and `apps/api/.env`:

```
DATABASE_URL=postgres://pingo:pingo@localhost:5432/pingo
```

- [ ] **Step 4: Write the schema**

`apps/api/src/infrastructure/postgres/schema.ts`:

```ts
import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE | SUSPENDED | BANNED
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const chatIdentities = pgTable('chat_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  intro: text('intro'),
  interests: jsonb('interests').$type<string[]>().default(sql`'[]'::jsonb`),
  language: text('language'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const liveProfiles = pgTable('live_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  vibe: text('vibe'),
  intent: text('intent'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE | EXPIRED | ENDED
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 5: Write the connection module and migration runner**

`apps/api/src/infrastructure/postgres/db.ts`:

```ts
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

`apps/api/drizzle.config.ts`:

```ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infrastructure/postgres/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

`apps/api/src/infrastructure/postgres/migrate.ts`:

```ts
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: './drizzle' });
  await client.end();
  console.log('Migrations complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 6: Write the test helper and the failing test**

`apps/api/test/testUtils.ts`:

```ts
import { sql } from 'drizzle-orm';
import { db } from '../src/infrastructure/postgres/db.js';

export async function resetDatabase(): Promise<void> {
  await db.execute(
    sql`TRUNCATE TABLE refresh_tokens, live_profiles, chat_identities, users RESTART IDENTITY CASCADE`,
  );
}
```

`apps/api/test/db.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../src/infrastructure/postgres/db.js';
import { users } from '../src/infrastructure/postgres/schema.js';
import { resetDatabase } from './testUtils.js';

describe('database connection', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('can insert and read a user row', async () => {
    const [inserted] = await db
      .insert(users)
      .values({ email: 'db-test@example.com', passwordHash: 'x' })
      .returning();

    const rows = await db.select().from(users).where(eq(users.id, inserted.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('db-test@example.com');
  });
});
```

- [ ] **Step 7: Run it and confirm it fails**

Run: `pnpm --filter @pingo/api test`
Expected: FAIL — `relation "users" does not exist` (no migration has been generated/applied yet).

- [ ] **Step 8: Generate and apply the migration**

Run: `pnpm --filter @pingo/api db:generate && pnpm --filter @pingo/api db:migrate`
Expected: a new SQL file appears under `apps/api/drizzle/`, and the runner prints `Migrations complete`.

- [ ] **Step 9: Run the test again**

Run: `pnpm --filter @pingo/api test`
Expected: PASS (both `health.test.ts` and `db.test.ts`)

- [ ] **Step 10: Commit**

```bash
git add docker-compose.yml apps/api/drizzle.config.ts apps/api/drizzle apps/api/src/infrastructure/postgres apps/api/test apps/api/package.json apps/api/.env.example pnpm-lock.yaml
git commit -m "feat(api): add Postgres schema, migrations, and connection"
```

---

### Task 3: Redis client

**Files:**
- Modify: `docker-compose.yml` (add `redis` service)
- Create: `apps/api/src/infrastructure/redis/client.ts`
- Modify: `apps/api/package.json` (add `ioredis`)
- Modify: `apps/api/.env.example` (add `REDIS_URL`)
- Test: `apps/api/test/redis.test.ts`

**Interfaces:**
- Produces: `redis` (ioredis client, `apps/api/src/infrastructure/redis/client.ts`) — not consumed by any other Phase 1 task, but required before Phase 2 (matchmaking pools, presence, distributed locks all live here per Technical PRD §5, §10).

- [ ] **Step 1: Add Redis to docker-compose**

Modify `docker-compose.yml`, add alongside `postgres`:

```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

Run: `docker compose up -d`

- [ ] **Step 2: Add the dependency and env var**

Modify `apps/api/package.json` — add to `dependencies`: `"ioredis": "^5.4.1"`.
Append to `apps/api/.env.example` and `apps/api/.env`: `REDIS_URL=redis://localhost:6379`

Run: `pnpm install`

- [ ] **Step 3: Write the failing test**

`apps/api/test/redis.test.ts`:

```ts
import { describe, it, expect, afterAll } from 'vitest';
import { redis } from '../src/infrastructure/redis/client.js';

describe('redis client', () => {
  afterAll(async () => {
    await redis.quit();
  });

  it('can set and get a value', async () => {
    await redis.set('pingo:test:key', 'hello');
    const value = await redis.get('pingo:test:key');
    expect(value).toBe('hello');
    await redis.del('pingo:test:key');
  });
});
```

Run: `pnpm --filter @pingo/api test`
Expected: FAIL — `../src/infrastructure/redis/client.js` does not exist.

- [ ] **Step 4: Implement the client**

`apps/api/src/infrastructure/redis/client.ts`:

```ts
import Redis from 'ioredis';

const url = process.env.REDIS_URL;
if (!url) {
  throw new Error('REDIS_URL is not set');
}

export const redis = new Redis(url);
```

- [ ] **Step 5: Run the test again**

Run: `pnpm --filter @pingo/api test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml apps/api/src/infrastructure/redis apps/api/test/redis.test.ts apps/api/package.json apps/api/.env.example pnpm-lock.yaml
git commit -m "feat(api): add Redis client"
```

---

### Task 4: Password hashing, JWT access tokens, and the `authenticate` preHandler

**Files:**
- Create: `apps/api/src/shared/password.ts`
- Create: `apps/api/src/shared/auth/jwt.ts`
- Create: `apps/api/src/shared/auth/authenticate.ts`
- Modify: `apps/api/package.json` (add `argon2`, `jsonwebtoken`, `@types/jsonwebtoken`)
- Modify: `apps/api/.env.example` (add `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`)
- Test: `apps/api/test/password.test.ts`, `apps/api/test/jwt.test.ts`

**Interfaces:**
- Consumes: `AppError` from Task 1.
- Produces: `hashPassword(plain: string): Promise<string>`, `verifyPassword(hash: string, plain: string): Promise<boolean>` (`shared/password.ts`); `signAccessToken(userId: string): string`, `verifyAccessToken(token: string): { sub: string }` (`shared/auth/jwt.ts`); `authenticate(request, reply): Promise<void>` preHandler that sets `request.userId: string` (`shared/auth/authenticate.ts`) — every protected route in Tasks 5–8 uses this as its `preHandler`.

- [ ] **Step 1: Add dependencies and env vars**

Modify `apps/api/package.json` — add to `dependencies`: `"argon2": "^0.41.1"`, `"jsonwebtoken": "^9.0.2"`; add to `devDependencies`: `"@types/jsonwebtoken": "^9.0.7"`.
Append to `apps/api/.env.example` and `apps/api/.env`:

```
JWT_ACCESS_SECRET=dev-access-secret-change-me
JWT_ACCESS_TTL=15m
```

Run: `pnpm install`

- [ ] **Step 2: Write the failing tests**

`apps/api/test/password.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/shared/password.js';

describe('password hashing', () => {
  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    await expect(verifyPassword(hash, 'correct-horse-battery-staple')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false);
  });
});
```

`apps/api/test/jwt.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../src/shared/auth/jwt.js';

describe('access tokens', () => {
  it('round-trips the user id', () => {
    const token = signAccessToken('user-123');
    expect(verifyAccessToken(token).sub).toBe('user-123');
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken('user-123');
    expect(() => verifyAccessToken(`${token}tampered`)).toThrow();
  });
});
```

Run: `pnpm --filter @pingo/api test`
Expected: FAIL — modules under `shared/` don't exist yet.

- [ ] **Step 3: Implement password hashing and JWT helpers**

`apps/api/src/shared/password.ts`:

```ts
import argon2 from 'argon2';

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}
```

`apps/api/src/shared/auth/jwt.ts`:

```ts
import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}
```

- [ ] **Step 4: Run the tests again**

Run: `pnpm --filter @pingo/api test`
Expected: PASS for `password.test.ts` and `jwt.test.ts`.

- [ ] **Step 5: Write the `authenticate` preHandler (no test yet — it's exercised end-to-end in Task 5)**

`apps/api/src/shared/auth/authenticate.ts`:

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/AppError.js';
import { verifyAccessToken } from './jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Missing bearer token', 401);
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    request.userId = payload.sub;
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401);
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/shared apps/api/test/password.test.ts apps/api/test/jwt.test.ts apps/api/package.json apps/api/.env.example pnpm-lock.yaml
git commit -m "feat(api): add password hashing, access tokens, and auth preHandler"
```

---

### Task 5: Auth routes (register/login/refresh) + `GET /v1/me`

**Files:**
- Create: `apps/api/src/modules/auth/auth.schemas.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.routes.ts`
- Create: `apps/api/src/modules/users/users.routes.ts`
- Modify: `apps/api/src/app.ts` (register `@fastify/rate-limit`, `authRoutes`, `usersRoutes`; handle `ZodError`)
- Modify: `apps/api/package.json` (add `@fastify/rate-limit`, `zod`)
- Modify: `apps/api/test/testUtils.ts` (add `registerTestUser`)
- Test: `apps/api/test/auth.test.ts`

**Interfaces:**
- Consumes: `db`, `users`, `refreshTokens` (Task 2); `hashPassword`, `verifyPassword`, `signAccessToken`, `authenticate` (Task 4); `AppError` (Task 1).
- Produces: `registerTestUser(app, email, password?): Promise<{ userId: string; accessToken: string; refreshToken: string }>` (`test/testUtils.ts`) — used by every test from Task 6 onward. Routes `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/refresh`, `GET /v1/me`.

- [ ] **Step 1: Add dependencies**

Modify `apps/api/package.json` — add to `dependencies`: `"@fastify/rate-limit": "^10.1.1"`, `"zod": "^3.23.8"`.

Run: `pnpm install`

- [ ] **Step 2: Write the failing test**

`apps/api/test/auth.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { resetDatabase } from './testUtils.js';

describe('auth flow', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('registers, logs in, fetches /v1/me, and rotates refresh tokens', async () => {
    const app = buildApp();

    const registerRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'alice@example.com', password: 'super-secret-1' },
    });
    expect(registerRes.statusCode).toBe(201);
    const { accessToken, refreshToken, userId } = registerRes.json();

    const meRes = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().id).toBe(userId);

    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'alice@example.com', password: 'super-secret-1' },
    });
    expect(loginRes.statusCode).toBe(200);

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.json().refreshToken).not.toBe(refreshToken);

    const reuseRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(reuseRes.statusCode).toBe(401);
  });

  it('rejects duplicate registration', async () => {
    const app = buildApp();
    const payload = { email: 'bob@example.com', password: 'super-secret-1' };
    await app.inject({ method: 'POST', url: '/v1/auth/register', payload });
    const dup = await app.inject({ method: 'POST', url: '/v1/auth/register', payload });
    expect(dup.statusCode).toBe(409);
  });

  it('rejects a wrong password on login', async () => {
    const app = buildApp();
    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'carl@example.com', password: 'super-secret-1' },
    });
    const wrong = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'carl@example.com', password: 'wrong-password' },
    });
    expect(wrong.statusCode).toBe(401);
  });

  it('rejects /v1/me without a token', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/v1/me' });
    expect(res.statusCode).toBe(401);
  });
});
```

Run: `pnpm --filter @pingo/api test`
Expected: FAIL — no `/v1/auth/*` routes exist yet.

- [ ] **Step 3: Implement the auth module**

`apps/api/src/modules/auth/auth.schemas.ts`:

```ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = registerSchema;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
```

`apps/api/src/modules/auth/auth.service.ts`:

```ts
import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../infrastructure/postgres/db.js';
import { refreshTokens, users } from '../../infrastructure/postgres/schema.js';
import { AppError } from '../../shared/errors/AppError.js';
import { signAccessToken } from '../../shared/auth/jwt.js';
import { hashPassword, verifyPassword } from '../../shared/password.js';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function issueTokenPair(userId: string) {
  const accessToken = signAccessToken(userId);
  const refreshToken = randomBytes(32).toString('hex');

  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  return { accessToken, refreshToken };
}

export async function register(email: string, password: string) {
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    throw new AppError('EMAIL_TAKEN', 'An account with this email already exists', 409);
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email, passwordHash }).returning();

  return { user, ...(await issueTokenPair(user.id)) };
}

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || user.status !== 'ACTIVE') {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  return { user, ...(await issueTokenPair(user.id)) };
}

export async function refresh(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const [stored] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));

  if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
    throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired', 401);
  }

  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, stored.id));

  return issueTokenPair(stored.userId);
}
```

`apps/api/src/modules/auth/auth.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { loginSchema, refreshSchema, registerSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/v1/auth/register', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const { user, accessToken, refreshToken } = await authService.register(body.email, body.password);
    reply.status(201).send({ userId: user.id, accessToken, refreshToken });
  });

  app.post('/v1/auth/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const { user, accessToken, refreshToken } = await authService.login(body.email, body.password);
    reply.send({ userId: user.id, accessToken, refreshToken });
  });

  app.post('/v1/auth/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    const tokens = await authService.refresh(body.refreshToken);
    reply.send(tokens);
  });
}
```

`apps/api/src/modules/users/users.routes.ts`:

```ts
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../../infrastructure/postgres/db.js';
import { users } from '../../infrastructure/postgres/schema.js';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticate } from '../../shared/auth/authenticate.js';

export async function usersRoutes(app: FastifyInstance) {
  app.get('/v1/me', { preHandler: authenticate }, async (request) => {
    const [user] = await db.select().from(users).where(eq(users.id, request.userId!));
    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found', 404);
    }
    return { id: user.id, email: user.email, status: user.status, createdAt: user.createdAt };
  });
}
```

- [ ] **Step 4: Wire it into `app.ts` and handle `ZodError`**

Modify `apps/api/src/app.ts`:

```ts
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { AppError } from './shared/errors/AppError.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } });
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: error.errors.map((e) => e.message).join(', ') },
      });
      return;
    }

    app.log.error(error);
    reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  });

  app.register(rateLimit, { global: false });

  app.get('/health', async () => ({ status: 'ok' }));
  app.register(authRoutes);
  app.register(usersRoutes);

  return app;
}
```

- [ ] **Step 5: Add the `registerTestUser` helper**

Modify `apps/api/test/testUtils.ts` — append:

```ts
import type { FastifyInstance } from 'fastify';

export async function registerTestUser(
  app: FastifyInstance,
  email: string,
  password = 'super-secret-1',
): Promise<{ userId: string; accessToken: string; refreshToken: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email, password },
  });
  return res.json();
}
```

- [ ] **Step 6: Run the tests again**

Run: `pnpm --filter @pingo/api test`
Expected: PASS (all of `health`, `db`, `redis`, `password`, `jwt`, `auth`)

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/auth apps/api/src/modules/users apps/api/src/app.ts apps/api/test/auth.test.ts apps/api/test/testUtils.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): add register/login/refresh and GET /v1/me"
```

---

### Task 6: Chat Identity module

**Files:**
- Create: `apps/api/src/modules/identities/identities.schemas.ts`
- Create: `apps/api/src/modules/identities/identities.service.ts`
- Create: `apps/api/src/modules/identities/identities.routes.ts`
- Modify: `apps/api/src/app.ts` (register `identitiesRoutes`)
- Test: `apps/api/test/identities.test.ts`

**Interfaces:**
- Consumes: `db`, `chatIdentities` (Task 2); `authenticate` (Task 4); `registerTestUser` (Task 5).
- Produces: `identityExists(userId: string): Promise<boolean>` (`identities.service.ts`) — Task 7's `goLive` precondition check calls this directly. Routes `POST /v1/chat-identity`, `GET /v1/chat-identity`.

- [ ] **Step 1: Write the failing test**

`apps/api/test/identities.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { registerTestUser, resetDatabase } from './testUtils.js';

describe('chat identity', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('creates and fetches a chat identity', async () => {
    const app = buildApp();
    const { accessToken } = await registerTestUser(app, 'dana@example.com');

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/chat-identity',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { displayName: 'Dana', avatarUrl: 'https://example.com/a.png', interests: ['music'] },
    });
    expect(createRes.statusCode).toBe(201);

    const getRes = await app.inject({
      method: 'GET',
      url: '/v1/chat-identity',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().displayName).toBe('Dana');
  });

  it('rejects creating a second identity for the same user', async () => {
    const app = buildApp();
    const { accessToken } = await registerTestUser(app, 'erin@example.com');
    const payload = { displayName: 'Erin', avatarUrl: 'https://example.com/a.png' };

    await app.inject({ method: 'POST', url: '/v1/chat-identity', headers: { authorization: `Bearer ${accessToken}` }, payload });
    const second = await app.inject({ method: 'POST', url: '/v1/chat-identity', headers: { authorization: `Bearer ${accessToken}` }, payload });
    expect(second.statusCode).toBe(409);
  });

  it('returns 404 when no identity exists yet', async () => {
    const app = buildApp();
    const { accessToken } = await registerTestUser(app, 'frank@example.com');
    const res = await app.inject({
      method: 'GET',
      url: '/v1/chat-identity',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
```

Run: `pnpm --filter @pingo/api test`
Expected: FAIL — no `/v1/chat-identity` routes exist yet.

- [ ] **Step 2: Implement the identities module**

`apps/api/src/modules/identities/identities.schemas.ts`:

```ts
import { z } from 'zod';

export const createIdentitySchema = z.object({
  displayName: z.string().min(1).max(40),
  avatarUrl: z.string().url(),
  intro: z.string().max(280).optional(),
  interests: z.array(z.string().min(1).max(30)).max(10).optional(),
  language: z.string().min(2).max(10).optional(),
});

export type CreateIdentityInput = z.infer<typeof createIdentitySchema>;
```

`apps/api/src/modules/identities/identities.service.ts`:

```ts
import { eq } from 'drizzle-orm';
import { db } from '../../infrastructure/postgres/db.js';
import { chatIdentities } from '../../infrastructure/postgres/schema.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { CreateIdentityInput } from './identities.schemas.js';

export async function createIdentity(userId: string, input: CreateIdentityInput) {
  const existing = await db.select().from(chatIdentities).where(eq(chatIdentities.userId, userId));
  if (existing.length > 0) {
    throw new AppError('IDENTITY_EXISTS', 'Chat identity already exists for this user', 409);
  }

  const [identity] = await db
    .insert(chatIdentities)
    .values({
      userId,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      intro: input.intro,
      interests: input.interests ?? [],
      language: input.language,
    })
    .returning();

  return identity;
}

export async function getIdentity(userId: string) {
  const [identity] = await db.select().from(chatIdentities).where(eq(chatIdentities.userId, userId));
  if (!identity) {
    throw new AppError('IDENTITY_NOT_FOUND', 'No chat identity for this user', 404);
  }
  return identity;
}

export async function identityExists(userId: string): Promise<boolean> {
  const [identity] = await db
    .select({ id: chatIdentities.id })
    .from(chatIdentities)
    .where(eq(chatIdentities.userId, userId));
  return Boolean(identity);
}
```

`apps/api/src/modules/identities/identities.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/auth/authenticate.js';
import { createIdentitySchema } from './identities.schemas.js';
import * as identitiesService from './identities.service.js';

export async function identitiesRoutes(app: FastifyInstance) {
  app.post('/v1/chat-identity', { preHandler: authenticate }, async (request, reply) => {
    const body = createIdentitySchema.parse(request.body);
    const identity = await identitiesService.createIdentity(request.userId!, body);
    reply.status(201).send(identity);
  });

  app.get('/v1/chat-identity', { preHandler: authenticate }, async (request) => {
    return identitiesService.getIdentity(request.userId!);
  });
}
```

- [ ] **Step 3: Register the routes**

Modify `apps/api/src/app.ts` — add the import `import { identitiesRoutes } from './modules/identities/identities.routes.js';` and, after `app.register(usersRoutes);`, add `app.register(identitiesRoutes);`.

- [ ] **Step 4: Run the tests again**

Run: `pnpm --filter @pingo/api test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identities apps/api/src/app.ts apps/api/test/identities.test.ts
git commit -m "feat(api): add chat identity create/get"
```

---

### Task 7: Live Profile module (Go Live / End Live / current status)

**Files:**
- Create: `apps/api/src/modules/live-profiles/live-profiles.schemas.ts`
- Create: `apps/api/src/modules/live-profiles/live-profiles.service.ts`
- Create: `apps/api/src/modules/live-profiles/live-profiles.routes.ts`
- Modify: `apps/api/src/app.ts` (register `liveProfilesRoutes`)
- Test: `apps/api/test/live-profiles.test.ts`

**Interfaces:**
- Consumes: `db`, `users`, `liveProfiles` (Task 2); `authenticate` (Task 4); `identityExists` (Task 6); `registerTestUser` (Task 5).
- Produces: `getCurrentLiveProfile(userId): Promise<LiveProfileView | null>` where `LiveProfileView` is the selected `liveProfiles` row plus a computed `isActive: boolean` (`live-profiles.service.ts`) — Task 8's discovery query re-derives the same "active" condition (`status = 'ACTIVE' AND expiresAt > now`) directly in SQL rather than importing this, since it needs to filter many rows at once. Routes `POST /v1/live`, `DELETE /v1/live`, `GET /v1/live/me`.

Scope note: per the roadmap's phase split, this task implements Go Live exactly as Business Logic §5–7 describes (24h expiry, account/identity preconditions, idempotent re-calls) but does **not** yet run an active background sweep to flip `status` to `EXPIRED` — that only matters once Phase 2's matchmaking pools need to react to expiry, and premature background jobs here would just be dead code. Reads compute "is this still active" live from `status` + `expiresAt` instead of trusting a possibly-stale `status` column.

- [ ] **Step 1: Write the failing test**

`apps/api/test/live-profiles.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { registerTestUser, resetDatabase } from './testUtils.js';

async function createIdentityFor(app: FastifyInstance, accessToken: string, displayName: string) {
  await app.inject({
    method: 'POST',
    url: '/v1/chat-identity',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { displayName, avatarUrl: 'https://example.com/a.png' },
  });
}

describe('live profiles', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('requires a chat identity before going live', async () => {
    const app = buildApp();
    const { accessToken } = await registerTestUser(app, 'gina@example.com');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/live',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(409);
  });

  it('goes live, is idempotent on a second call, and can end early', async () => {
    const app = buildApp();
    const { accessToken } = await registerTestUser(app, 'hank@example.com');
    await createIdentityFor(app, accessToken, 'Hank');

    const first = await app.inject({ method: 'POST', url: '/v1/live', headers: { authorization: `Bearer ${accessToken}` } });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json();
    expect(firstBody.isActive).toBe(true);

    const second = await app.inject({ method: 'POST', url: '/v1/live', headers: { authorization: `Bearer ${accessToken}` } });
    expect(second.json().id).toBe(firstBody.id);

    const ended = await app.inject({ method: 'DELETE', url: '/v1/live', headers: { authorization: `Bearer ${accessToken}` } });
    expect(ended.statusCode).toBe(200);
    expect(ended.json().isActive).toBe(false);

    const me = await app.inject({ method: 'GET', url: '/v1/live/me', headers: { authorization: `Bearer ${accessToken}` } });
    expect(me.json().status).toBe('ENDED');
  });
});
```

Run: `pnpm --filter @pingo/api test`
Expected: FAIL — no `/v1/live` routes exist yet.

- [ ] **Step 2: Implement the live-profiles module**

`apps/api/src/modules/live-profiles/live-profiles.schemas.ts`:

```ts
import { z } from 'zod';

export const goLiveSchema = z.object({
  vibe: z.enum(['CHILL', 'CURIOUS', 'FUNNY', 'TALKATIVE', 'SERIOUS', 'MEET_PEOPLE', 'LEARNING', 'OPEN']).optional(),
  intent: z.string().max(60).optional(),
});

export type GoLiveInput = z.infer<typeof goLiveSchema>;
```

`apps/api/src/modules/live-profiles/live-profiles.service.ts`:

```ts
import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from '../../infrastructure/postgres/db.js';
import { liveProfiles, users } from '../../infrastructure/postgres/schema.js';
import { AppError } from '../../shared/errors/AppError.js';
import { identityExists } from '../identities/identities.service.js';
import type { GoLiveInput } from './live-profiles.schemas.js';

const LIVE_PROFILE_DURATION_MS = 24 * 60 * 60 * 1000;

function withComputedStatus<T extends { status: string; expiresAt: Date }>(profile: T) {
  return { ...profile, isActive: profile.status === 'ACTIVE' && profile.expiresAt.getTime() > Date.now() };
}

async function findCurrentActive(userId: string) {
  const [profile] = await db
    .select()
    .from(liveProfiles)
    .where(and(eq(liveProfiles.userId, userId), eq(liveProfiles.status, 'ACTIVE'), gt(liveProfiles.expiresAt, new Date())));
  return profile;
}

export async function goLive(userId: string, input: GoLiveInput) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.status !== 'ACTIVE') {
    throw new AppError('ACCOUNT_NOT_ACTIVE', 'Account is not active', 403);
  }

  if (!(await identityExists(userId))) {
    throw new AppError('IDENTITY_REQUIRED', 'Create a chat identity before going live', 409);
  }

  const existing = await findCurrentActive(userId);
  if (existing) {
    return withComputedStatus(existing);
  }

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + LIVE_PROFILE_DURATION_MS);

  const [profile] = await db
    .insert(liveProfiles)
    .values({ userId, vibe: input.vibe, intent: input.intent, startedAt, expiresAt, status: 'ACTIVE' })
    .returning();

  return withComputedStatus(profile);
}

export async function endLive(userId: string) {
  const existing = await findCurrentActive(userId);
  if (!existing) {
    throw new AppError('NOT_LIVE', 'No active live profile to end', 404);
  }

  const [updated] = await db
    .update(liveProfiles)
    .set({ status: 'ENDED' })
    .where(eq(liveProfiles.id, existing.id))
    .returning();

  return withComputedStatus(updated);
}

export async function getCurrentLiveProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(liveProfiles)
    .where(eq(liveProfiles.userId, userId))
    .orderBy(desc(liveProfiles.createdAt))
    .limit(1);

  return profile ? withComputedStatus(profile) : null;
}
```

`apps/api/src/modules/live-profiles/live-profiles.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/auth/authenticate.js';
import { AppError } from '../../shared/errors/AppError.js';
import { goLiveSchema } from './live-profiles.schemas.js';
import * as liveProfilesService from './live-profiles.service.js';

export async function liveProfilesRoutes(app: FastifyInstance) {
  app.post('/v1/live', { preHandler: authenticate }, async (request, reply) => {
    const body = goLiveSchema.parse(request.body ?? {});
    const profile = await liveProfilesService.goLive(request.userId!, body);
    reply.send(profile);
  });

  app.delete('/v1/live', { preHandler: authenticate }, async (request) => {
    return liveProfilesService.endLive(request.userId!);
  });

  app.get('/v1/live/me', { preHandler: authenticate }, async (request) => {
    const profile = await liveProfilesService.getCurrentLiveProfile(request.userId!);
    if (!profile) {
      throw new AppError('NOT_LIVE', 'No live profile found', 404);
    }
    return profile;
  });
}
```

- [ ] **Step 3: Register the routes**

Modify `apps/api/src/app.ts` — add `import { liveProfilesRoutes } from './modules/live-profiles/live-profiles.routes.js';` and, after `app.register(identitiesRoutes);`, add `app.register(liveProfilesRoutes);`.

- [ ] **Step 4: Run the tests again**

Run: `pnpm --filter @pingo/api test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/live-profiles apps/api/src/app.ts apps/api/test/live-profiles.test.ts
git commit -m "feat(api): add Go Live / End Live / live status"
```

---

### Task 8: Basic Discovery

**Files:**
- Create: `apps/api/src/modules/discovery/discovery.service.ts`
- Create: `apps/api/src/modules/discovery/discovery.routes.ts`
- Modify: `apps/api/src/app.ts` (register `discoveryRoutes`)
- Test: `apps/api/test/discovery.test.ts`

**Interfaces:**
- Consumes: `db`, `liveProfiles`, `chatIdentities` (Task 2); `authenticate` (Task 4); `registerTestUser` (Task 5).
- Produces: Route `GET /v1/discover`.

Scope note: this is deliberately the "basic discovery" from Technical PRD §30 Phase 1, not the real matchmaking engine — no Redis pools, no blocking (the `blocks` table doesn't exist until Phase 5), no preference filtering. It excludes only the caller and any user without a currently-active live profile. Real eligibility re-checking and pairing land in the Phase 2 plan.

- [ ] **Step 1: Write the failing test**

`apps/api/test/discovery.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { registerTestUser, resetDatabase } from './testUtils.js';

async function goLiveWithIdentity(app: FastifyInstance, email: string, displayName: string) {
  const { accessToken } = await registerTestUser(app, email);
  await app.inject({
    method: 'POST',
    url: '/v1/chat-identity',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { displayName, avatarUrl: 'https://example.com/a.png' },
  });
  await app.inject({ method: 'POST', url: '/v1/live', headers: { authorization: `Bearer ${accessToken}` } });
  return accessToken;
}

describe('discovery', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('lists other live users but excludes self and non-live accounts', async () => {
    const app = buildApp();
    const ivyToken = await goLiveWithIdentity(app, 'ivy@example.com', 'Ivy');
    await goLiveWithIdentity(app, 'jack@example.com', 'Jack');
    await registerTestUser(app, 'idle@example.com'); // never goes live

    const res = await app.inject({
      method: 'GET',
      url: '/v1/discover',
      headers: { authorization: `Bearer ${ivyToken}` },
    });

    expect(res.statusCode).toBe(200);
    const names = res.json().users.map((u: { displayName: string }) => u.displayName);
    expect(names).toEqual(['Jack']);
  });
});
```

Run: `pnpm --filter @pingo/api test`
Expected: FAIL — no `/v1/discover` route exists yet.

- [ ] **Step 2: Implement the discovery module**

`apps/api/src/modules/discovery/discovery.service.ts`:

```ts
import { and, desc, eq, gt, ne } from 'drizzle-orm';
import { db } from '../../infrastructure/postgres/db.js';
import { chatIdentities, liveProfiles } from '../../infrastructure/postgres/schema.js';

export async function listLiveUsers(excludingUserId: string, limit = 20) {
  return db
    .select({
      liveProfileId: liveProfiles.id,
      userId: liveProfiles.userId,
      vibe: liveProfiles.vibe,
      intent: liveProfiles.intent,
      expiresAt: liveProfiles.expiresAt,
      displayName: chatIdentities.displayName,
      avatarUrl: chatIdentities.avatarUrl,
      intro: chatIdentities.intro,
    })
    .from(liveProfiles)
    .innerJoin(chatIdentities, eq(chatIdentities.userId, liveProfiles.userId))
    .where(
      and(
        eq(liveProfiles.status, 'ACTIVE'),
        gt(liveProfiles.expiresAt, new Date()),
        ne(liveProfiles.userId, excludingUserId),
      ),
    )
    .orderBy(desc(liveProfiles.startedAt))
    .limit(limit);
}
```

`apps/api/src/modules/discovery/discovery.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/auth/authenticate.js';
import { listLiveUsers } from './discovery.service.js';

export async function discoveryRoutes(app: FastifyInstance) {
  app.get('/v1/discover', { preHandler: authenticate }, async (request) => {
    const users = await listLiveUsers(request.userId!);
    return { users };
  });
}
```

- [ ] **Step 3: Register the routes**

Modify `apps/api/src/app.ts` — add `import { discoveryRoutes } from './modules/discovery/discovery.routes.js';` and, after `app.register(liveProfilesRoutes);`, add `app.register(discoveryRoutes);`.

- [ ] **Step 4: Run the tests again**

Run: `pnpm --filter @pingo/api test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/discovery apps/api/src/app.ts apps/api/test/discovery.test.ts
git commit -m "feat(api): add basic discovery listing"
```

---

### Task 9: End-to-end smoke test + README

**Files:**
- Create: `apps/api/test/e2e.test.ts`
- Create: `apps/api/README.md`

**Interfaces:**
- Consumes: every route and helper from Tasks 1–8. Produces nothing new — this is the "does the whole thing actually work together" checkpoint for Phase 1.

- [ ] **Step 1: Write the end-to-end test**

`apps/api/test/e2e.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { resetDatabase } from './testUtils.js';

describe('end-to-end: register through discovery', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('lets two users register, build identities, go live, and discover each other', async () => {
    const app = buildApp();

    async function onboard(email: string, displayName: string) {
      const registerRes = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email, password: 'super-secret-1' },
      });
      const { accessToken } = registerRes.json();

      await app.inject({
        method: 'POST',
        url: '/v1/chat-identity',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { displayName, avatarUrl: 'https://example.com/a.png' },
      });

      const liveRes = await app.inject({
        method: 'POST',
        url: '/v1/live',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      return { accessToken, liveProfile: liveRes.json() };
    }

    const kay = await onboard('kay@example.com', 'Kay');
    const lee = await onboard('lee@example.com', 'Lee');

    expect(kay.liveProfile.isActive).toBe(true);
    expect(lee.liveProfile.isActive).toBe(true);

    const discoverRes = await app.inject({
      method: 'GET',
      url: '/v1/discover',
      headers: { authorization: `Bearer ${kay.accessToken}` },
    });

    const names = discoverRes.json().users.map((u: { displayName: string }) => u.displayName);
    expect(names).toContain('Lee');
    expect(names).not.toContain('Kay');
  });
});
```

- [ ] **Step 2: Run the full suite**

Run: `pnpm --filter @pingo/api test`
Expected: PASS — every test file from Tasks 1–9 passes.

- [ ] **Step 3: Write the README**

`apps/api/README.md`:

```markdown
# @pingo/api

Phase 1 foundation: auth, Chat Identity, Live Profile, basic Discovery.

## Setup

1. `cp .env.example .env`
2. From the repo root: `docker compose up -d` (starts Postgres + Redis)
3. `pnpm install`
4. `pnpm --filter @pingo/api db:generate && pnpm --filter @pingo/api db:migrate`
5. `pnpm --filter @pingo/api dev`

## Tests

Tests run against the same Postgres/Redis started above and truncate tables
between runs — make sure migrations have been applied first.

`pnpm --filter @pingo/api test`
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/test/e2e.test.ts apps/api/README.md
git commit -m "test(api): add Phase 1 end-to-end smoke test and README"
```

---

## Self-Review Notes

- **Spec coverage:** PRD §4 (accounts/identity/live-profile separation) → Tasks 2, 6, 7. PRD §5/§6 (Go Live preconditions, vibe) → Task 7. PRD §7 (basic eligibility = live + not self) → Task 8 (blocking/discovery-preferences explicitly deferred to Phases 2/5, noted inline). Technical PRD §6 (core DB model) → Task 2 schema. Technical PRD §7/§24 (server-authoritative time, never trust client IDs) → enforced in `live-profiles.service.ts` and `authenticate.ts`. Technical PRD §13 (REST surface) → routes match `/v1/auth/*`, `/v1/me`, `/v1/chat-identity`, `/v1/live*`, `/v1/discover` exactly. Business Logic §4 (identity creation) → Task 6. §5–7 (Go Live, expiration, re-going-live) → Task 7. §9 (matching eligibility, partial) → Task 8. Definition of Done items relevant to this phase (server controls timers, API authorization enforced, rate limits exist) are satisfied; the remaining Definition of Done items (idempotent decisions, no duplicate connections, block enforcement, XP integrity) apply to Phases 2–5 and are out of scope here.
- **Placeholder scan:** no TBD/"add appropriate handling" steps; every step has runnable code.
- **Type consistency:** `AppError(code, message, statusCode)` used identically in Tasks 4–8; `request.userId` set once in Task 4's `authenticate` and read the same way in Tasks 5–8; `withComputedStatus`/`isActive` shape from Task 7 matches what Task 7's own test asserts (`isActive`, `status`); `registerTestUser`'s return shape (`userId`, `accessToken`, `refreshToken`) matches the JSON Task 5's routes actually send.
