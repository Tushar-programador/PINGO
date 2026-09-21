import type { FastifyInstance } from 'fastify';
import * as authService from '../auth/auth.service.js';
import { authenticate } from '../../shared/auth/authenticate.js';

export async function usersRoutes(app: FastifyInstance) {
  app.get('/v1/me', { preHandler: authenticate }, async (request) => {
    const user = await authService.getUserById(request.userId!);
    return { id: user.id, email: user.email, status: user.status, createdAt: user.createdAt };
  });
}
