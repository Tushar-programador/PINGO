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
