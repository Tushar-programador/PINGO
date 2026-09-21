import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';
import { AppError } from '../src/shared/errors/AppError.js';

describe('GET /health', () => {
  it('returns ok status', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});

describe('Error Handler', () => {
  it('handles AppError with custom status code and message', async () => {
    const app = buildApp();
    app.get('/test-app-error', async () => {
      throw new AppError('SOME_CODE', 'some message', 418);
    });
    const response = await app.inject({ method: 'GET', url: '/test-app-error' });
    expect(response.statusCode).toBe(418);
    expect(response.json()).toEqual({
      error: { code: 'SOME_CODE', message: 'some message' },
    });
  });

  it('handles plain Error with 500 status and INTERNAL_ERROR code', async () => {
    const app = buildApp();
    app.get('/test-plain-error', async () => {
      throw new Error('boom');
    });
    const response = await app.inject({ method: 'GET', url: '/test-plain-error' });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
  });
});
