import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { AppError } from './shared/errors/AppError.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { identitiesRoutes } from './modules/identities/identities.routes.js';
import { liveProfilesRoutes } from './modules/live-profiles/live-profiles.routes.js';
import { discoveryRoutes } from './modules/discovery/discovery.routes.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } });
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: error.errors.map((e) => e.message).join(', ') },
      });
      return;
    }

    const status = (error as { statusCode?: number }).statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      reply
        .status(status)
        .send({ error: { code: (error as { code?: string }).code ?? 'BAD_REQUEST', message: (error as Error).message } });
      return;
    }

    app.log.error(error);
    reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.register(rateLimit, { global: false });

  app.get('/health', async () => ({ status: 'ok' }));
  app.register(authRoutes);
  app.register(usersRoutes);
  app.register(identitiesRoutes);
  app.register(liveProfilesRoutes);
  app.register(discoveryRoutes);

  return app;
}
