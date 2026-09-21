import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { resetDatabase } from './testUtils.js';

describe('end-to-end: register through discovery', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('lets two users register, build identities, go live, and discover each other', async () => {
    const app = buildApp();

    async function onboard(email: string, displayName: string) {
      const registerRes = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email, password: 'super-secret-1' },
      });
      const { accessToken } = registerRes.json();

      await app.inject({
        method: 'POST',
        url: '/v1/chat-identity',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { displayName, avatarUrl: 'https://example.com/a.png' },
      });

      const liveRes = await app.inject({
        method: 'POST',
        url: '/v1/live',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      return { accessToken, liveProfile: liveRes.json() };
    }

    const kay = await onboard('kay@example.com', 'Kay');
    const lee = await onboard('lee@example.com', 'Lee');

    expect(kay.liveProfile.isActive).toBe(true);
    expect(lee.liveProfile.isActive).toBe(true);

    const discoverRes = await app.inject({
      method: 'GET',
      url: '/v1/discover',
      headers: { authorization: `Bearer ${kay.accessToken}` },
    });

    const names = discoverRes.json().users.map((u: { displayName: string }) => u.displayName);
    expect(names).toContain('Lee');
    expect(names).not.toContain('Kay');
  });
});
