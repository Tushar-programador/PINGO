import type { FastifyInstance } from 'fastify';
import { loginSchema, refreshSchema, registerSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/v1/auth/register', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const { user, accessToken, refreshToken } = await authService.register(body.email, body.password);
    reply.status(201).send({ userId: user.id, accessToken, refreshToken });
  });

  app.post('/v1/auth/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const { user, accessToken, refreshToken } = await authService.login(body.email, body.password);
    reply.send({ userId: user.id, accessToken, refreshToken });
  });

  app.post('/v1/auth/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    const tokens = await authService.refresh(body.refreshToken);
    reply.send(tokens);
  });
}
