import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { resetDatabase } from './testUtils.js';

describe('auth flow', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('registers, logs in, fetches /v1/me, and rotates refresh tokens', async () => {
    const app = buildApp();

    const registerRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'alice@example.com', password: 'super-secret-1' },
    });
    expect(registerRes.statusCode).toBe(201);
    const { accessToken, refreshToken, userId } = registerRes.json();

    const meRes = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().id).toBe(userId);

    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'alice@example.com', password: 'super-secret-1' },
    });
    expect(loginRes.statusCode).toBe(200);

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.json().refreshToken).not.toBe(refreshToken);

    const reuseRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(reuseRes.statusCode).toBe(401);
  });

  it('rejects duplicate registration', async () => {
    const app = buildApp();
    const payload = { email: 'bob@example.com', password: 'super-secret-1' };
    await app.inject({ method: 'POST', url: '/v1/auth/register', payload });
    const dup = await app.inject({ method: 'POST', url: '/v1/auth/register', payload });
    expect(dup.statusCode).toBe(409);
  });

  it('rejects a wrong password on login', async () => {
    const app = buildApp();
    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'carl@example.com', password: 'super-secret-1' },
    });
    const wrong = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'carl@example.com', password: 'wrong-password' },
    });
    expect(wrong.statusCode).toBe(401);
  });

  it('rejects /v1/me without a token', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/v1/me' });
    expect(res.statusCode).toBe(401);
  });
});
