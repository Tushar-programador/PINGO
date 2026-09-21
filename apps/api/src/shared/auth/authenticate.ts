import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/AppError.js';
import { verifyAccessToken } from './jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Missing bearer token', 401);
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    request.userId = payload.sub;
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401);
  }
}
