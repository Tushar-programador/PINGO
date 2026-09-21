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
