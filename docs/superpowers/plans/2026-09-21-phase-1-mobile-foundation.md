# Phase 1 — Mobile Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `@pingo/mobile` — register/login, Chat Identity creation, Go Live with a server-driven countdown, and a basic Discover list — as a real Expo app talking to the `@pingo/api` service built in `2026-09-21-phase-1-backend-foundation.md`.

**Architecture:** Expo Router (file-based routing under `app/`), Zustand for the auth-token store, TanStack Query for all server data, a single `fetch`-based API client as the only thing allowed to call the network. Screens are thin — they call `api.*` and render; the token store and API client live under `src/shared/` because both `app/_layout.tsx` and every screen need them. `src/features/<name>/` is intentionally not introduced yet — Phase 1 has no feature-specific logic complex enough to warrant its own module beyond a single screen file; it starts once Phase 2 (realtime matching, live phase timers) needs it.

**Tech Stack:** Expo + TypeScript + Expo Router + TanStack Query + Zustand + `expo-secure-store` + Jest (`jest-expo` preset) + `@testing-library/react-native`.

**Spec:** `docs/24H_Conversation_App_COMPLETE.md` — Product PRD §4–7, Technical PRD §2, §7, §23, §29. Strategy context: `docs/superpowers/plans/2026-09-21-project-roadmap.md`. Pairs with: `docs/superpowers/plans/2026-09-21-phase-1-backend-foundation.md` (this plan calls that API verbatim — same request/response shapes).

## Global Constraints

- Expo Router file-based routing: a new screen is a new file under `app/`; nothing needs manual route registration.
- Auth tokens are only ever persisted via `expo-secure-store` (never `AsyncStorage`, never plain component state) and are only read from storage once, at hydration, into the Zustand store (`src/shared/auth/authStore.ts`) — every other part of the app reads the token from that store, never from storage directly.
- `src/shared/api/client.ts` is the only module allowed to call `fetch`; every screen goes through `api.get/post/del`.
- Server-authoritative time (Technical PRD §7): the app never invents its own expiry. The Go Live countdown is a local re-render of `expiresAt - Date.now()`, where `expiresAt` always comes from the server response — never a client-owned timer that could drift from truth.
- Tests use `jest-expo` + `@testing-library/react-native`; `expo-router` and the API client are mocked at the module boundary — no real network calls in tests. When mocking `src/shared/api/client`, always mock only the `api` object via `jest.requireActual` for the rest of the module — automocking the whole module would replace the `ApiError` class's constructor with a no-op, silently breaking every `error instanceof ApiError` check.

---

### Task 1: Expo scaffold + smoke test

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/jest.config.js`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx`
- Test: `apps/mobile/app/index.test.tsx`

**Interfaces:**
- Produces: a working Expo + Jest toolchain; `app/_layout.tsx` (extended with `QueryClientProvider` in Task 3) and `app/index.tsx` (a placeholder, fully replaced by the real auth/identity gate in Task 6).

- [ ] **Step 1: Scaffold the app**

`apps/mobile/package.json`:

```json
{
  "name": "@pingo/mobile",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "test": "jest"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.3",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.1.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@testing-library/react-native": "^12.9.0",
    "@types/react": "~18.3.12",
    "babel-preset-expo": "~12.0.0",
    "jest": "^29.7.0",
    "jest-expo": "~52.0.0",
    "react-test-renderer": "18.3.1",
    "typescript": "^5.6.3"
  }
}
```

`apps/mobile/app.json`:

```json
{
  "expo": {
    "name": "Pingo",
    "slug": "pingo",
    "scheme": "pingo",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "plugins": ["expo-router"]
  }
}
```

`apps/mobile/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-native",
    "lib": ["ES2022", "DOM"]
  },
  "include": ["app", "src"]
}
```

`apps/mobile/babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
```

`apps/mobile/jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
};
```

Run: `pnpm install`

- [ ] **Step 2: Write the failing test**

`apps/mobile/app/index.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import Index from './index';

describe('Index screen', () => {
  it('renders the app name', () => {
    render(<Index />);
    expect(screen.getByText('Pingo')).toBeTruthy();
  });
});
```

Run: `pnpm --filter @pingo/mobile test`
Expected: FAIL — `./index` does not exist yet.

- [ ] **Step 3: Implement the placeholder screen and root layout**

`apps/mobile/app/index.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Pingo</Text>
    </View>
  );
}
```

`apps/mobile/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm --filter @pingo/mobile test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app.json apps/mobile/tsconfig.json apps/mobile/babel.config.js apps/mobile/jest.config.js apps/mobile/app pnpm-lock.yaml
git commit -m "feat(mobile): scaffold Expo app with Expo Router"
```

---

### Task 2: Secure token storage, auth store, and API client

**Files:**
- Create: `apps/mobile/src/shared/storage/tokenStorage.ts`
- Create: `apps/mobile/src/shared/auth/authStore.ts`
- Create: `apps/mobile/src/shared/api/client.ts`
- Create: `apps/mobile/.env.example`
- Modify: `apps/mobile/package.json` (add `expo-secure-store`, `zustand`)
- Test: `apps/mobile/src/shared/storage/tokenStorage.test.ts`, `apps/mobile/src/shared/auth/authStore.test.ts`, `apps/mobile/src/shared/api/client.test.ts`

**Interfaces:**
- Produces: `getStoredTokens(): Promise<{accessToken, refreshToken} | null>`, `saveStoredTokens(tokens): Promise<void>`, `clearStoredTokens(): Promise<void>` (`tokenStorage.ts`); `useAuthStore` — Zustand store with state `{ accessToken: string | null; refreshToken: string | null; isHydrated: boolean }` and actions `hydrate(): Promise<void>`, `setTokens(tokens: {accessToken, refreshToken}): Promise<void>`, `logout(): Promise<void>` (`authStore.ts`) — every screen in Tasks 3–6 uses this. `api.get<T>(path, auth?)`, `api.post<T>(path, payload?, auth?)`, `api.del<T>(path, auth?)`, and the `ApiError` class (`status: number; code: string; message: string`) (`client.ts`) — every screen in Tasks 3–6 uses this.

- [ ] **Step 1: Add dependencies and the API base URL**

Modify `apps/mobile/package.json` — add to `dependencies`: `"expo-secure-store": "~14.0.0"`, `"zustand": "^5.0.1"`.

`apps/mobile/.env.example`:

```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Copy it: `cp apps/mobile/.env.example apps/mobile/.env`

Run: `pnpm install`

- [ ] **Step 2: Write the failing storage test**

`apps/mobile/src/shared/storage/tokenStorage.test.ts`:

```ts
import * as SecureStore from 'expo-secure-store';
import { clearStoredTokens, getStoredTokens, saveStoredTokens } from './tokenStorage';

jest.mock('expo-secure-store');

describe('tokenStorage', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => store.get(key) ?? null);
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (key: string, value: string) => {
      store.set(key, value);
    });
    (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (key: string) => {
      store.delete(key);
    });
  });

  it('returns null when nothing is stored', async () => {
    await expect(getStoredTokens()).resolves.toBeNull();
  });

  it('saves and retrieves a token pair', async () => {
    await saveStoredTokens({ accessToken: 'a', refreshToken: 'r' });
    await expect(getStoredTokens()).resolves.toEqual({ accessToken: 'a', refreshToken: 'r' });
  });

  it('clears stored tokens', async () => {
    await saveStoredTokens({ accessToken: 'a', refreshToken: 'r' });
    await clearStoredTokens();
    await expect(getStoredTokens()).resolves.toBeNull();
  });
});
```

Run: `pnpm --filter @pingo/mobile test`
Expected: FAIL — `./tokenStorage` does not exist yet.

- [ ] **Step 3: Implement token storage**

`apps/mobile/src/shared/storage/tokenStorage.ts`:

```ts
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'pingo.accessToken';
const REFRESH_TOKEN_KEY = 'pingo.refreshToken';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export async function saveStoredTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearStoredTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm --filter @pingo/mobile test`
Expected: PASS

- [ ] **Step 5: Write the failing auth-store test**

`apps/mobile/src/shared/auth/authStore.test.ts`:

```ts
import { useAuthStore } from './authStore';
import * as tokenStorage from '../storage/tokenStorage';

jest.mock('../storage/tokenStorage');

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, isHydrated: false });
    jest.clearAllMocks();
  });

  it('hydrates from storage', async () => {
    (tokenStorage.getStoredTokens as jest.Mock).mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState()).toMatchObject({ accessToken: 'a', refreshToken: 'r', isHydrated: true });
  });

  it('persists tokens when setTokens is called', async () => {
    (tokenStorage.saveStoredTokens as jest.Mock).mockResolvedValue(undefined);

    await useAuthStore.getState().setTokens({ accessToken: 'x', refreshToken: 'y' });

    expect(tokenStorage.saveStoredTokens).toHaveBeenCalledWith({ accessToken: 'x', refreshToken: 'y' });
    expect(useAuthStore.getState().accessToken).toBe('x');
  });

  it('clears tokens on logout', async () => {
    useAuthStore.setState({ accessToken: 'x', refreshToken: 'y', isHydrated: true });
    (tokenStorage.clearStoredTokens as jest.Mock).mockResolvedValue(undefined);

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
```

Run: `pnpm --filter @pingo/mobile test`
Expected: FAIL — `./authStore` does not exist yet.

- [ ] **Step 6: Implement the auth store**

`apps/mobile/src/shared/auth/authStore.ts`:

```ts
import { create } from 'zustand';
import {
  clearStoredTokens,
  getStoredTokens,
  saveStoredTokens,
  type StoredTokens,
} from '../storage/tokenStorage.js';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setTokens: (tokens: StoredTokens) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  isHydrated: false,
  hydrate: async () => {
    const tokens = await getStoredTokens();
    set({ accessToken: tokens?.accessToken ?? null, refreshToken: tokens?.refreshToken ?? null, isHydrated: true });
  },
  setTokens: async (tokens) => {
    await saveStoredTokens(tokens);
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  },
  logout: async () => {
    await clearStoredTokens();
    set({ accessToken: null, refreshToken: null });
  },
}));
```

- [ ] **Step 7: Run the test again**

Run: `pnpm --filter @pingo/mobile test`
Expected: PASS

- [ ] **Step 8: Write the failing API-client test**

`apps/mobile/src/shared/api/client.test.ts`:

```ts
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
```

Run: `pnpm --filter @pingo/mobile test`
Expected: FAIL — `./client` does not exist yet.

- [ ] **Step 9: Implement the API client**

`apps/mobile/src/shared/api/client.ts`:

```ts
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
```

- [ ] **Step 10: Run the full suite**

Run: `pnpm --filter @pingo/mobile test`
Expected: PASS (`index`, `tokenStorage`, `authStore`, `client`)

- [ ] **Step 11: Commit**

```bash
git add apps/mobile/src/shared apps/mobile/.env.example apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(mobile): add secure token storage, auth store, and API client"
```

---

### Task 3: Login and Register screens

**Files:**
- Create: `apps/mobile/app/login.tsx`
- Create: `apps/mobile/app/register.tsx`
- Modify: `apps/mobile/app/_layout.tsx` (wrap in `QueryClientProvider`)
- Modify: `apps/mobile/package.json` (add `@tanstack/react-query`)
- Test: `apps/mobile/app/login.test.tsx`, `apps/mobile/app/register.test.tsx`

**Interfaces:**
- Consumes: `useAuthStore().setTokens` (Task 2), `api.post` (Task 2).
- Produces: routes `/login`, `/register`, both navigating to `/` (the gate — built in Task 6) on success.

- [ ] **Step 1: Add TanStack Query and wire the provider**

Modify `apps/mobile/package.json` — add to `dependencies`: `"@tanstack/react-query": "^5.59.0"`.

Modify `apps/mobile/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
```

Run: `pnpm install`

- [ ] **Step 2: Write the failing tests**

`apps/mobile/app/login.test.tsx`:

```tsx
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginScreen from './login';
import { api } from '../src/shared/api/client';
import { useAuthStore } from '../src/shared/auth/authStore';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Link: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('../src/shared/api/client', () => {
  const actual = jest.requireActual('../src/shared/api/client');
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), del: jest.fn() } };
});

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('LoginScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, isHydrated: true });
    jest.clearAllMocks();
  });

  it('logs in and stores the returned tokens', async () => {
    (api.post as jest.Mock).mockResolvedValue({ userId: 'u1', accessToken: 'a', refreshToken: 'r' });

    renderWithQuery(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'nina@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'super-secret-1');
    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('a'));
    expect(api.post).toHaveBeenCalledWith(
      '/v1/auth/login',
      { email: 'nina@example.com', password: 'super-secret-1' },
      false,
    );
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('shows an error message when login fails', async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error('Invalid email or password'));

    renderWithQuery(<LoginScreen />);
    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => expect(screen.getByTestId('error-text')).toBeTruthy());
  });
});
```

`apps/mobile/app/register.test.tsx`:

```tsx
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterScreen from './register';
import { api } from '../src/shared/api/client';
import { useAuthStore } from '../src/shared/auth/authStore';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Link: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('../src/shared/api/client', () => {
  const actual = jest.requireActual('../src/shared/api/client');
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), del: jest.fn() } };
});

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('RegisterScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, isHydrated: true });
    jest.clearAllMocks();
  });

  it('registers and stores the returned tokens', async () => {
    (api.post as jest.Mock).mockResolvedValue({ userId: 'u2', accessToken: 'a2', refreshToken: 'r2' });

    renderWithQuery(<RegisterScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'omar@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'super-secret-1');
    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('a2'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('shows an error message when the email is already taken', async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error('An account with this email already exists'));

    renderWithQuery(<RegisterScreen />);
    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => expect(screen.getByTestId('error-text')).toBeTruthy());
  });
});
```

Run: `pnpm --filter @pingo/mobile test`
Expected: FAIL — `./login` and `./register` don't exist yet.

- [ ] **Step 3: Implement the screens**

`apps/mobile/app/login.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { api } from '../src/shared/api/client.js';
import { useAuthStore } from '../src/shared/auth/authStore.js';

interface LoginResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post<LoginResponse>('/v1/auth/login', { email, password }, false),
    onSuccess: async (data) => {
      await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      router.replace('/');
    },
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text>Log in</Text>
      <TextInput testID="email-input" placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput
        testID="password-input"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable testID="submit-button" onPress={() => mutation.mutate()}>
        <Text>{mutation.isPending ? 'Logging in…' : 'Log in'}</Text>
      </Pressable>
      {mutation.isError ? <Text testID="error-text">{(mutation.error as Error).message}</Text> : null}
      <Link href="/register">Need an account? Register</Link>
    </View>
  );
}
```

`apps/mobile/app/register.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { api } from '../src/shared/api/client.js';
import { useAuthStore } from '../src/shared/auth/authStore.js';

interface RegisterResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post<RegisterResponse>('/v1/auth/register', { email, password }, false),
    onSuccess: async (data) => {
      await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      router.replace('/');
    },
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text>Create an account</Text>
      <TextInput testID="email-input" placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput
        testID="password-input"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable testID="submit-button" onPress={() => mutation.mutate()}>
        <Text>{mutation.isPending ? 'Creating account…' : 'Register'}</Text>
      </Pressable>
      {mutation.isError ? <Text testID="error-text">{(mutation.error as Error).message}</Text> : null}
      <Link href="/login">Already have an account? Log in</Link>
    </View>
  );
}
```

- [ ] **Step 4: Run the tests again**

Run: `pnpm --filter @pingo/mobile test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/login.tsx apps/mobile/app/register.tsx apps/mobile/app/login.test.tsx apps/mobile/app/register.test.tsx apps/mobile/app/_layout.tsx apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(mobile): add login and register screens"
```

---

### Task 4: Chat Identity creation screen

**Files:**
- Create: `apps/mobile/app/identity.tsx`
- Test: `apps/mobile/app/identity.test.tsx`

**Interfaces:**
- Consumes: `api.post` (Task 2).
- Produces: route `/identity`, which seeds the `['chat-identity']` query cache (consumed by Task 6's gate) before navigating to `/`.

- [ ] **Step 1: Write the failing test**

`apps/mobile/app/identity.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IdentityScreen from './identity';
import { api } from '../src/shared/api/client';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('../src/shared/api/client', () => {
  const actual = jest.requireActual('../src/shared/api/client');
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), del: jest.fn() } };
});

function renderWithQuery() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <IdentityScreen />
    </QueryClientProvider>,
  );
  return queryClient;
}

describe('IdentityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a chat identity, caches it, and returns to the gate', async () => {
    const identity = { id: 'ci1', displayName: 'Priya' };
    (api.post as jest.Mock).mockResolvedValue(identity);

    const queryClient = renderWithQuery();
    fireEvent.changeText(screen.getByTestId('display-name-input'), 'Priya');
    fireEvent.changeText(screen.getByTestId('avatar-url-input'), 'https://example.com/a.png');
    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(api.post).toHaveBeenCalledWith('/v1/chat-identity', {
      displayName: 'Priya',
      avatarUrl: 'https://example.com/a.png',
    });
    expect(queryClient.getQueryData(['chat-identity'])).toEqual(identity);
  });

  it('shows an error message when creation fails', async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error('Chat identity already exists for this user'));

    renderWithQuery();
    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => expect(screen.getByTestId('error-text')).toBeTruthy());
  });
});
```

Run: `pnpm --filter @pingo/mobile test`
Expected: FAIL — `./identity` does not exist yet.

- [ ] **Step 2: Implement the screen**

`apps/mobile/app/identity.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../src/shared/api/client.js';

interface ChatIdentity {
  id: string;
  displayName: string;
}

export default function IdentityScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post<ChatIdentity>('/v1/chat-identity', { displayName, avatarUrl }),
    onSuccess: (identity) => {
      queryClient.setQueryData(['chat-identity'], identity);
      router.replace('/');
    },
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text>Create your Chat Identity</Text>
      <TextInput
        testID="display-name-input"
        placeholder="Display name"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput testID="avatar-url-input" placeholder="Avatar URL" value={avatarUrl} onChangeText={setAvatarUrl} />
      <Pressable testID="submit-button" onPress={() => mutation.mutate()}>
        <Text>{mutation.isPending ? 'Saving…' : 'Continue'}</Text>
      </Pressable>
      {mutation.isError ? <Text testID="error-text">{(mutation.error as Error).message}</Text> : null}
    </View>
  );
}
```

- [ ] **Step 3: Run the tests again**

Run: `pnpm --filter @pingo/mobile test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/identity.tsx apps/mobile/app/identity.test.tsx
git commit -m "feat(mobile): add chat identity creation screen"
```

---

### Task 5: Home screen — Go Live, server-driven countdown, Discover list

**Files:**
- Create: `apps/mobile/app/home.tsx`
- Test: `apps/mobile/app/home.test.tsx`

**Interfaces:**
- Consumes: `api.get/post/del`, `ApiError` (Task 2).
- Produces: route `/home`.

Scope note: uses React Native's built-in `FlatList`, not `@shopify/flash-list`. Technical PRD §23's FlashList guidance is about long lists; Phase 1's basic discovery list is small (no pagination, no filtering beyond liveness — see the backend plan's Task 8 scope note), so pulling in another native dependency now isn't justified. Revisit once Phase 2's real matchmaking pool can return larger result sets.

- [ ] **Step 1: Write the failing test**

`apps/mobile/app/home.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomeScreen from './home';
import { api, ApiError } from '../src/shared/api/client';

jest.mock('../src/shared/api/client', () => {
  const actual = jest.requireActual('../src/shared/api/client');
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), del: jest.fn() } };
});

function renderHome() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <HomeScreen />
    </QueryClientProvider>,
  );
}

describe('HomeScreen', () => {
  afterEach(cleanup);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the Go Live button when not currently live', async () => {
    (api.get as jest.Mock).mockRejectedValue(new ApiError(404, 'NOT_LIVE', 'No live profile found'));

    renderHome();

    await waitFor(() => expect(screen.getByTestId('go-live-button')).toBeTruthy());
  });

  it('goes live and then shows the discover list', async () => {
    (api.get as jest.Mock)
      .mockRejectedValueOnce(new ApiError(404, 'NOT_LIVE', 'No live profile found'))
      .mockResolvedValueOnce({ users: [{ userId: 'u2', displayName: 'Mo', vibe: null }] });
    (api.post as jest.Mock).mockResolvedValue({
      id: 'lp1',
      isActive: true,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });

    renderHome();
    await waitFor(() => expect(screen.getByTestId('go-live-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('go-live-button'));

    await waitFor(() => expect(screen.getByTestId('live-countdown')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('Mo')).toBeTruthy());
  });
});
```

Run: `pnpm --filter @pingo/mobile test`
Expected: FAIL — `./home` does not exist yet.

- [ ] **Step 2: Implement the screen**

`apps/mobile/app/home.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../src/shared/api/client.js';

interface LiveProfile {
  id: string;
  isActive: boolean;
  expiresAt: string;
  status: string;
}

interface DiscoveredUser {
  userId: string;
  displayName: string;
  vibe: string | null;
}

async function fetchLiveStatus(): Promise<LiveProfile | null> {
  try {
    return await api.get<LiveProfile>('/v1/live/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

function useCountdown(expiresAt: string | undefined): number {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();
    const tick = () => setRemainingMs(Math.max(0, target - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return remainingMs;
}

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const liveQuery = useQuery({ queryKey: ['liveStatus'], queryFn: fetchLiveStatus });
  const isLive = Boolean(liveQuery.data?.isActive);

  const discoverQuery = useQuery({
    queryKey: ['discover'],
    queryFn: () => api.get<{ users: DiscoveredUser[] }>('/v1/discover'),
    enabled: isLive,
  });

  const goLive = useMutation({
    mutationFn: () => api.post<LiveProfile>('/v1/live'),
    onSuccess: (profile) => queryClient.setQueryData(['liveStatus'], profile),
  });

  const endLive = useMutation({
    mutationFn: () => api.del<LiveProfile>('/v1/live'),
    onSuccess: (profile) => queryClient.setQueryData(['liveStatus'], profile),
  });

  const remainingMs = useCountdown(isLive ? liveQuery.data?.expiresAt : undefined);

  if (isLive) {
    const remainingMinutes = Math.floor(remainingMs / 60000);
    const remainingHours = Math.floor(remainingMinutes / 60);

    return (
      <View style={{ flex: 1, padding: 24, gap: 12 }}>
        <Text testID="live-countdown">
          Live for {remainingHours}h {remainingMinutes % 60}m more
        </Text>
        <Pressable testID="end-live-button" onPress={() => endLive.mutate()}>
          <Text>End Live</Text>
        </Pressable>
        <Text>Currently live:</Text>
        <FlatList
          testID="discover-list"
          data={discoverQuery.data?.users ?? []}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => <Text>{item.displayName}</Text>}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text>You're not live right now.</Text>
      <Pressable testID="go-live-button" onPress={() => goLive.mutate()}>
        <Text>{goLive.isPending ? 'Going live…' : 'Go Live'}</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 3: Run the tests again**

Run: `pnpm --filter @pingo/mobile test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/home.tsx apps/mobile/app/home.test.tsx
git commit -m "feat(mobile): add Go Live, countdown, and discover list"
```

---

### Task 6: Auth/identity gate wiring

**Files:**
- Modify: `apps/mobile/app/index.tsx` (replace the Task 1 placeholder with the real gate)
- Modify: `apps/mobile/app/index.test.tsx` (replace the Task 1 smoke test with gate-behavior tests)
- Create: `apps/mobile/README.md`

**Interfaces:**
- Consumes: `useAuthStore` (`accessToken`, `isHydrated`, `hydrate`) (Task 2); `api.get`, `ApiError` (Task 2); routes `/login` (Task 3), `/identity` (Task 4), `/home` (Task 5).
- Produces: the real `/` route — on load it hydrates the auth store, then redirects to `/login` (no token), `/identity` (token but no chat identity), or `/home` (both present).

- [ ] **Step 1: Write the failing tests**

`apps/mobile/app/index.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from './index';
import { useAuthStore } from '../src/shared/auth/authStore';
import { api, ApiError } from '../src/shared/api/client';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
}));

jest.mock('../src/shared/api/client', () => {
  const actual = jest.requireActual('../src/shared/api/client');
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), del: jest.fn() } };
});

function renderIndex() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Index />
    </QueryClientProvider>,
  );
}

describe('Index gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: null, refreshToken: null, isHydrated: true });
  });

  it('redirects to /login when there is no access token', async () => {
    renderIndex();
    await waitFor(() => expect(screen.getByTestId('redirect').props.children).toBe('/login'));
  });

  it('redirects to /identity when authenticated but no chat identity exists', async () => {
    useAuthStore.setState({ accessToken: 'a', refreshToken: 'r', isHydrated: true });
    (api.get as jest.Mock).mockRejectedValue(new ApiError(404, 'IDENTITY_NOT_FOUND', 'none'));

    renderIndex();
    await waitFor(() => expect(screen.getByTestId('redirect').props.children).toBe('/identity'));
  });

  it('redirects to /home when authenticated with an existing identity', async () => {
    useAuthStore.setState({ accessToken: 'a', refreshToken: 'r', isHydrated: true });
    (api.get as jest.Mock).mockResolvedValue({ id: 'ci1', displayName: 'Nina' });

    renderIndex();
    await waitFor(() => expect(screen.getByTestId('redirect').props.children).toBe('/home'));
  });
});
```

Run: `pnpm --filter @pingo/mobile test`
Expected: FAIL — the current `index.tsx` always renders "Pingo" and never redirects.

- [ ] **Step 2: Implement the gate**

`apps/mobile/app/index.tsx`:

```tsx
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../src/shared/auth/authStore.js';
import { api, ApiError } from '../src/shared/api/client.js';

export default function Index() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [isHydrated, hydrate]);

  const identityQuery = useQuery({
    queryKey: ['chat-identity'],
    queryFn: async () => {
      try {
        return await api.get('/v1/chat-identity');
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: Boolean(accessToken),
  });

  if (!isHydrated || (accessToken && identityQuery.isLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  if (!identityQuery.data) {
    return <Redirect href="/identity" />;
  }

  return <Redirect href="/home" />;
}
```

Note: each piece of `authStore` state is selected with its own `useAuthStore((state) => state.field)` call rather than one selector returning `{ accessToken, isHydrated, hydrate }` — a fresh object literal on every call would compare unequal to itself on every render under Zustand's default `Object.is` check and cause a render loop.

- [ ] **Step 3: Run the tests again**

Run: `pnpm --filter @pingo/mobile test`
Expected: PASS — the full suite (Tasks 1–6) passes.

- [ ] **Step 4: Write the README**

`apps/mobile/README.md`:

```markdown
# @pingo/mobile

Phase 1 foundation: login/register, Chat Identity creation, Go Live with a
server-driven countdown, and a basic Discover list.

## Setup

1. `cp .env.example .env` and point `EXPO_PUBLIC_API_URL` at a running
   `@pingo/api` (see `apps/api/README.md`).
2. `pnpm install`
3. `pnpm --filter @pingo/mobile start`

## Tests

`pnpm --filter @pingo/mobile test`
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/index.tsx apps/mobile/app/index.test.tsx apps/mobile/README.md
git commit -m "feat(mobile): wire the auth/identity gate"
```

---

## Self-Review Notes

- **Spec coverage:** PRD §4 (identity creation flow) → Task 4. PRD §5/§6 (Go Live) → Task 5. Technical PRD §7/§24 (server-authoritative time, never trust client timestamps) → `useCountdown` in Task 5 only ever displays the server's `expiresAt`. Technical PRD §23 (mobile performance practices) → addressed where relevant to Phase 1 (cache server state via TanStack Query, avoid unnecessary renders via per-field Zustand selectors); FlashList and image-compression/CDN practices are explicitly deferred with a scope note since Phase 1 has no long lists or media upload yet (that's Phase 3+). Technical PRD §29 (repo structure) → followed with one noted deviation (`src/features/*` deferred until there's real feature-specific logic).
- **Placeholder scan:** no TBD/vague steps; every step has runnable code.
- **Type consistency:** `useAuthStore`'s state shape (`accessToken`, `refreshToken`, `isHydrated`) and action signatures (`hydrate()`, `setTokens(tokens)`, `logout()`) from Task 2 are used identically in Tasks 3, 4, and 6. `ApiError`'s constructor (`status, code, message`) from Task 2 matches every `new ApiError(...)` call in tests (Task 5, Task 6). The `LiveProfile` shape (`id`, `isActive`, `expiresAt`, `status`) in Task 5 matches the backend plan's `withComputedStatus` response exactly.
