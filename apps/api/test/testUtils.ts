import { sql } from 'drizzle-orm';
import { db } from '../src/infrastructure/postgres/db.js';

export async function resetDatabase(): Promise<void> {
  await db.execute(
    sql`TRUNCATE TABLE refresh_tokens, live_profiles, chat_identities, users RESTART IDENTITY CASCADE`,
  );
}
