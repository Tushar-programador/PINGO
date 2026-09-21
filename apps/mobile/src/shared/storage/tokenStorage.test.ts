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
