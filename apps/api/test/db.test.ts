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
