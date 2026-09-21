import { api, ApiError } from './client';
import { useAuthStore } from '../auth/authStore';

describe('api client', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', refreshToken: null, isHydrated: true });
    global.fetch = jest.fn();
  });

  it('attaches the bearer token and parses a successful response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ hello: 'world' }) });

    const result = await api.get<{ hello: string }>('/v1/me');

    expect(result).toEqual({ hello: 'world' });
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('sets Content-Type when the request has a JSON body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

    await api.post('/v1/auth/register', { email: 'a@example.com', password: 'secret' }, false);

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.get('Content-Type')).toBe('application/json');
  });

  it('omits Content-Type on a bodyless POST (Go Live)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

    await api.post('/v1/live');

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.has('Content-Type')).toBe(false);
    expect(options.headers.get('Content-Type')).toBeNull();
  });

  it('omits Content-Type on a bodyless DELETE (End Live)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

    await api.del('/v1/live');

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.has('Content-Type')).toBe(false);
    expect(options.headers.get('Content-Type')).toBeNull();
  });

  it('throws ApiError with the server error code on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: 'EMAIL_TAKEN', message: 'taken' } }),
    });

    await expect(api.post('/v1/auth/register', {}, false)).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
    });
  });
});
