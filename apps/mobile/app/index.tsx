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
