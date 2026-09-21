import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { api } from '../src/shared/api/client.js';
import { useAuthStore } from '../src/shared/auth/authStore.js';
import { colors, glass, gradientColors } from '../src/shared/theme/glass.js';

interface LoginResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post<LoginResponse>('/v1/auth/login', { email, password }, false),
    onSuccess: async (data) => {
      await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      router.replace('/');
    },
  });

  return (
    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={glass.background}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={glass.background}>
        <View style={glass.container}>
          <View style={glass.cardShadow}>
            <BlurView intensity={50} tint="dark" style={glass.card}>
              <Text style={glass.heading}>Log in</Text>
              <TextInput
                testID="email-input"
                placeholder="Email"
                placeholderTextColor={colors.placeholderText}
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={glass.input}
              />
              <TextInput
                testID="password-input"
                placeholder="Password"
                placeholderTextColor={colors.placeholderText}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={glass.input}
              />
              <Pressable
                testID="submit-button"
                onPress={() => mutation.mutate()}
                style={({ pressed }) => [glass.button, pressed && glass.buttonPressed]}
              >
                <Text style={glass.buttonText}>{mutation.isPending ? 'Logging in…' : 'Log in'}</Text>
              </Pressable>
              {mutation.isError ? (
                <Text testID="error-text" style={glass.errorText}>
                  {(mutation.error as Error).message}
                </Text>
              ) : null}
              <Link href="/register" style={glass.link}>
                Need an account? Register
              </Link>
            </BlurView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
