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
