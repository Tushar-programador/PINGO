import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { registerTestUser, resetDatabase } from './testUtils.js';

describe('chat identity', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('creates and fetches a chat identity', async () => {
    const app = buildApp();
    const { accessToken } = await registerTestUser(app, 'dana@example.com');

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/chat-identity',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { displayName: 'Dana', avatarUrl: 'https://example.com/a.png', interests: ['music'] },
    });
    expect(createRes.statusCode).toBe(201);

    const getRes = await app.inject({
      method: 'GET',
      url: '/v1/chat-identity',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().displayName).toBe('Dana');
  });

  it('rejects creating a second identity for the same user', async () => {
    const app = buildApp();
    const { accessToken } = await registerTestUser(app, 'erin@example.com');
    const payload = { displayName: 'Erin', avatarUrl: 'https://example.com/a.png' };

    await app.inject({ method: 'POST', url: '/v1/chat-identity', headers: { authorization: `Bearer ${accessToken}` }, payload });
    const second = await app.inject({ method: 'POST', url: '/v1/chat-identity', headers: { authorization: `Bearer ${accessToken}` }, payload });
    expect(second.statusCode).toBe(409);
  });

  it('returns 404 when no identity exists yet', async () => {
    const app = buildApp();
    const { accessToken } = await registerTestUser(app, 'frank@example.com');
    const res = await app.inject({
      method: 'GET',
      url: '/v1/chat-identity',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
