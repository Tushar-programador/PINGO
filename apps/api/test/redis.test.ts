import { describe, it, expect, afterAll } from 'vitest';
import { redis } from '../src/infrastructure/redis/client.js';

describe('redis client', () => {
  afterAll(async () => {
    await redis.quit();
  });

  it('can set and get a value', async () => {
    await redis.set('pingo:test:key', 'hello');
    const value = await redis.get('pingo:test:key');
    expect(value).toBe('hello');
    await redis.del('pingo:test:key');
  });
});
