import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/auth/authenticate.js';
import { listLiveUsers } from './discovery.service.js';

export async function discoveryRoutes(app: FastifyInstance) {
  app.get('/v1/discover', { preHandler: authenticate }, async (request) => {
    const users = await listLiveUsers(request.userId!);
    return { users };
  });
}
