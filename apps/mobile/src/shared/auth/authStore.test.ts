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
