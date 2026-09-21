import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../src/shared/auth/jwt.js';

describe('access tokens', () => {
  it('round-trips the user id', () => {
    const token = signAccessToken('user-123');
    expect(verifyAccessToken(token).sub).toBe('user-123');
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken('user-123');
    expect(() => verifyAccessToken(`${token}tampered`)).toThrow();
  });
});
