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
