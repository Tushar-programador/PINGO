import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../src/shared/auth/authStore.js';
import { api, ApiError } from '../src/shared/api/client.js';
import { colors, glass, gradientColors } from '../src/shared/theme/glass.js';

export default function Index() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);

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
    retry: 0,
  });

  if (!isHydrated || (accessToken && identityQuery.isLoading)) {
    return (
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={glass.background}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      </LinearGradient>
    );
  }

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  if (identityQuery.isError) {
    return (
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={glass.background}>
        <View style={styles.center}>
          <Text testID="gate-error-text" style={glass.errorText}>
            Something went wrong. Pull down or tap to retry.
          </Text>
          <Pressable
            testID="gate-retry-button"
            onPress={() => identityQuery.refetch()}
            style={({ pressed }) => [glass.button, styles.retryButton, pressed && glass.buttonPressed]}
          >
            <Text style={glass.buttonText}>Retry</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  if (!identityQuery.data) {
    return <Redirect href="/identity" />;
  }

  return <Redirect href="/home" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  retryButton: {
    paddingHorizontal: 32,
  },
});
