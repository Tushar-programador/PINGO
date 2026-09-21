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
