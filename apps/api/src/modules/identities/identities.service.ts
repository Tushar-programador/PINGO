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
