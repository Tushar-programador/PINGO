import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/auth/authenticate.js';
import { createIdentitySchema } from './identities.schemas.js';
import * as identitiesService from './identities.service.js';

export async function identitiesRoutes(app: FastifyInstance) {
  app.post('/v1/chat-identity', { preHandler: authenticate }, async (request, reply) => {
    const body = createIdentitySchema.parse(request.body);
    const identity = await identitiesService.createIdentity(request.userId!, body);
    reply.status(201).send(identity);
  });

  app.get('/v1/chat-identity', { preHandler: authenticate }, async (request) => {
    return identitiesService.getIdentity(request.userId!);
  });
}
