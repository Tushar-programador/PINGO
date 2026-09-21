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
