import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../src/infrastructure/postgres/db.js';

export async function resetDatabase(): Promise<void> {
  await db.execute(
    sql`TRUNCATE TABLE refresh_tokens, live_profiles, chat_identities, users RESTART IDENTITY CASCADE`,
  );
}

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
