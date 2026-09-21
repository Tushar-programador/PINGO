import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from '../../infrastructure/postgres/db.js';
import { liveProfiles } from '../../infrastructure/postgres/schema.js';
import { AppError } from '../../shared/errors/AppError.js';
import * as authService from '../auth/auth.service.js';
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
  const user = await authService.getUserById(userId);
  if (user.status !== 'ACTIVE') {
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
