import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { api } from '../src/shared/api/client.js';
import { useAuthStore } from '../src/shared/auth/authStore.js';

interface RegisterResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post<RegisterResponse>('/v1/auth/register', { email, password }, false),
    onSuccess: async (data) => {
      await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      router.replace('/');
    },
  });

  return (
    <LinearGradient colors={['#1a1c2e', '#0a0b14']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.background}>
      <View style={styles.container}>
        <View style={styles.cardShadow}>
          <BlurView intensity={50} tint="dark" style={styles.card}>
            <Text style={styles.heading}>Create an account</Text>
            <TextInput
              testID="email-input"
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />
            <TextInput
              testID="password-input"
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.45)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
            <Pressable
              testID="submit-button"
              onPress={() => mutation.mutate()}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              <Text style={styles.buttonText}>{mutation.isPending ? 'Creating account…' : 'Register'}</Text>
            </Pressable>
            {mutation.isError ? (
              <Text testID="error-text" style={styles.errorText}>
                {(mutation.error as Error).message}
              </Text>
            ) : null}
            <Link href="/login" style={styles.link}>
              Already have an account? Log in
            </Link>
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
  link: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
