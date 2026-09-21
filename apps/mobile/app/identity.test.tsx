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
    fireEvent.changeText(screen.getByTestId('display-name-input'), 'Priya');
    fireEvent.changeText(screen.getByTestId('avatar-url-input'), 'https://example.com/a.png');
    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => expect(screen.getByTestId('error-text')).toBeTruthy());
  });

  it('does not submit while display name or avatar URL is blank', async () => {
    renderWithQuery();
    fireEvent.changeText(screen.getByTestId('display-name-input'), 'Priya');
    fireEvent.press(screen.getByTestId('submit-button'));

    expect(api.post).not.toHaveBeenCalled();
  });
});
