import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { registerTestUser, resetDatabase } from './testUtils.js';

async function goLiveWithIdentity(app: FastifyInstance, email: string, displayName: string) {
  const { accessToken } = await registerTestUser(app, email);
  await app.inject({
    method: 'POST',
    url: '/v1/chat-identity',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { displayName, avatarUrl: 'https://example.com/a.png' },
  });
  await app.inject({ method: 'POST', url: '/v1/live', headers: { authorization: `Bearer ${accessToken}` } });
  return accessToken;
}

describe('discovery', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('lists other live users but excludes self and non-live accounts', async () => {
    const app = buildApp();
    const ivyToken = await goLiveWithIdentity(app, 'ivy@example.com', 'Ivy');
    await goLiveWithIdentity(app, 'jack@example.com', 'Jack');
    await registerTestUser(app, 'idle@example.com'); // never goes live

    const res = await app.inject({
      method: 'GET',
      url: '/v1/discover',
      headers: { authorization: `Bearer ${ivyToken}` },
    });

    expect(res.statusCode).toBe(200);
    const names = res.json().users.map((u: { displayName: string }) => u.displayName);
    expect(names).toEqual(['Jack']);
  });
});
