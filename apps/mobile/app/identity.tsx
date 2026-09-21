import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { api } from '../src/shared/api/client.js';

interface ChatIdentity {
  id: string;
  displayName: string;
}

export default function IdentityScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post<ChatIdentity>('/v1/chat-identity', { displayName, avatarUrl }),
    onSuccess: (identity) => {
      queryClient.setQueryData(['chat-identity'], identity);
      router.replace('/');
    },
  });

  return (
    <LinearGradient colors={['#1a1c2e', '#0a0b14']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.background}>
      <View style={styles.container}>
        <View style={styles.cardShadow}>
          <BlurView intensity={50} tint="dark" style={styles.card}>
            <Text style={styles.heading}>Create your Chat Identity</Text>
            <TextInput
              testID="display-name-input"
              placeholder="Display name"
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.input}
            />
            <TextInput
              testID="avatar-url-input"
              placeholder="Avatar URL"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCapitalize="none"
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              style={styles.input}
            />
            <Pressable
              testID="submit-button"
              onPress={() => mutation.mutate()}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              <Text style={styles.buttonText}>{mutation.isPending ? 'Saving…' : 'Continue'}</Text>
            </Pressable>
            {mutation.isError ? (
              <Text testID="error-text" style={styles.errorText}>
                {(mutation.error as Error).message}
              </Text>
            ) : null}
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
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  button: {
    backgroundColor: '#6c5ce7',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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
  errorText: {
    color: '#ff8a80',
    fontSize: 14,
    textAlign: 'center',
  },
});
