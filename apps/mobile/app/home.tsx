import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
      <LinearGradient colors={['#1a1c2e', '#0a0b14']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.background}>
        <View style={styles.liveContainer}>
          <View style={styles.cardShadow}>
            <BlurView intensity={50} tint="dark" style={styles.card}>
              <Text testID="live-countdown" style={styles.countdownText}>
                {remainingHours}h {remainingMinutes % 60}m
              </Text>
              <Text style={styles.countdownLabel}>remaining while you're live</Text>
              <Pressable
                testID="end-live-button"
                onPress={() => endLive.mutate()}
                style={({ pressed }) => [styles.endButton, pressed && styles.endButtonPressed]}
              >
                <Text style={styles.endButtonText}>{endLive.isPending ? 'Ending…' : 'End Live'}</Text>
              </Pressable>
            </BlurView>
          </View>

          <Text style={styles.sectionHeading}>Currently live</Text>
          <FlatList
            testID="discover-list"
            data={discoverQuery.data?.users ?? []}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.rowShadow}>
                <BlurView intensity={40} tint="dark" style={styles.row}>
                  <Text style={styles.rowText}>{item.displayName}</Text>
                </BlurView>
              </View>
            )}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1c2e', '#0a0b14']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.background}>
      <View style={styles.container}>
        <View style={styles.cardShadow}>
          <BlurView intensity={50} tint="dark" style={styles.card}>
            <Text style={styles.heading}>You're not live right now.</Text>
            <Pressable
              testID="go-live-button"
              onPress={() => goLive.mutate()}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              <Text style={styles.buttonText}>{goLive.isPending ? 'Going live…' : 'Go Live'}</Text>
            </Pressable>
          </BlurView>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  liveContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 64,
    gap: 16,
  },
  // Shadow lives on an unclipped wrapper — a shadow and `overflow: hidden`
  // on the same view cancel each other out on iOS, so the rounded-corner
  // clip needed for the blur has to happen on the inner view instead.
  cardShadow: {
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  card: {
    borderRadius: 28,
    padding: 28,
    gap: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  countdownText: {
    fontSize: 56,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  countdownLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#6c5ce7',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    alignSelf: 'stretch',
  },
  buttonPressed: {
    backgroundColor: '#5a4bd1',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // The "end live" action is intentionally muted — outlined rather than
  // solid-filled — so it doesn't compete visually with primary actions
  // and isn't easy to tap by accident.
  endButton: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  endButtonText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  rowShadow: {
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  row: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  rowText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});
