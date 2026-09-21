import Fastify, { type FastifyInstance } from 'fastify';
import { AppError } from './shared/errors/AppError.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } });
      return;
    }

    app.log.error(error);
    reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
