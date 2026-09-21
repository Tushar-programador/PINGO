import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
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
  const normalizedEmail = email.toLowerCase();

  const existing = await db.select().from(users).where(eq(users.email, normalizedEmail));
  if (existing.length > 0) {
    throw new AppError('EMAIL_TAKEN', 'An account with this email already exists', 409);
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email: normalizedEmail, passwordHash }).returning();

  return { user, ...(await issueTokenPair(user.id)) };
}

export async function login(email: string, password: string) {
  const normalizedEmail = email.toLowerCase();

  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
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

  const [revoked] = await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
    .returning();

  if (!revoked || revoked.expiresAt.getTime() < Date.now()) {
    throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired', 401);
  }

  const [user] = await db.select().from(users).where(eq(users.id, revoked.userId));

  if (!user || user.status !== 'ACTIVE') {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, revoked.userId), isNull(refreshTokens.revokedAt)));
    throw new AppError('ACCOUNT_NOT_ACTIVE', 'Account is not active', 403);
  }

  return issueTokenPair(revoked.userId);
}

export async function getUserById(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }
  return user;
}
