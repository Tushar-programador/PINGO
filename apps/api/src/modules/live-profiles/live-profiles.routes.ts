import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/auth/authenticate.js';
import { AppError } from '../../shared/errors/AppError.js';
import { goLiveSchema } from './live-profiles.schemas.js';
import * as liveProfilesService from './live-profiles.service.js';

export async function liveProfilesRoutes(app: FastifyInstance) {
  app.post('/v1/live', { preHandler: authenticate }, async (request, reply) => {
    const body = goLiveSchema.parse(request.body ?? {});
    const profile = await liveProfilesService.goLive(request.userId!, body);
    reply.send(profile);
  });

  app.delete('/v1/live', { preHandler: authenticate }, async (request) => {
    return liveProfilesService.endLive(request.userId!);
  });

  app.get('/v1/live/me', { preHandler: authenticate }, async (request) => {
    const profile = await liveProfilesService.getCurrentLiveProfile(request.userId!);
    if (!profile) {
      throw new AppError('NOT_LIVE', 'No live profile found', 404);
    }
    return profile;
  });
}
