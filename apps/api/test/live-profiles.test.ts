import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { registerTestUser, resetDatabase } from './testUtils.js';

async function createIdentityFor(app: FastifyInstance, accessToken: string, displayName: string) {
  await app.inject({
    method: 'POST',
    url: '/v1/chat-identity',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { displayName, avatarUrl: 'https://example.com/a.png' },
  });
}

describe('live profiles', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('requires a chat identity before going live', async () => {
    const app = buildApp();
    const { accessToken } = await registerTestUser(app, 'gina@example.com');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/live',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(409);
  });

  it('goes live, is idempotent on a second call, and can end early', async () => {
    const app = buildApp();
    const { accessToken } = await registerTestUser(app, 'hank@example.com');
    await createIdentityFor(app, accessToken, 'Hank');

    const first = await app.inject({ method: 'POST', url: '/v1/live', headers: { authorization: `Bearer ${accessToken}` } });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json();
    expect(firstBody.isActive).toBe(true);

    const second = await app.inject({ method: 'POST', url: '/v1/live', headers: { authorization: `Bearer ${accessToken}` } });
    expect(second.json().id).toBe(firstBody.id);

    const ended = await app.inject({ method: 'DELETE', url: '/v1/live', headers: { authorization: `Bearer ${accessToken}` } });
    expect(ended.statusCode).toBe(200);
    expect(ended.json().isActive).toBe(false);

    const me = await app.inject({ method: 'GET', url: '/v1/live/me', headers: { authorization: `Bearer ${accessToken}` } });
    expect(me.json().status).toBe('ENDED');
  });
});
