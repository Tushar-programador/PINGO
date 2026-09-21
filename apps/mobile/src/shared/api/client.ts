import { useAuthStore } from '../auth/authStore.js';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, body?.error?.code ?? 'UNKNOWN_ERROR', body?.error?.message ?? 'Request failed');
  }

  return body as T;
}

export const api = {
  get: <T>(path: string, auth = true) => request<T>(path, { method: 'GET' }, auth),
  post: <T>(path: string, payload?: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body: payload ? JSON.stringify(payload) : undefined }, auth),
  del: <T>(path: string, auth = true) => request<T>(path, { method: 'DELETE' }, auth),
};
