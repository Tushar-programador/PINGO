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
