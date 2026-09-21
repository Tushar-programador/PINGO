import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { api } from '../src/shared/api/client.js';
import { colors, glass, gradientColors } from '../src/shared/theme/glass.js';

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

  const canSubmit = displayName.trim().length > 0 && avatarUrl.trim().length > 0;

  return (
    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={glass.background}>
      <View style={glass.container}>
        <View style={glass.cardShadow}>
          <BlurView intensity={50} tint="dark" style={glass.card}>
            <Text style={glass.heading}>Create your Chat Identity</Text>
            <TextInput
              testID="display-name-input"
              placeholder="Display name"
              placeholderTextColor={colors.placeholderText}
              value={displayName}
              onChangeText={setDisplayName}
              style={glass.input}
            />
            <TextInput
              testID="avatar-url-input"
              placeholder="Avatar URL (required)"
              placeholderTextColor={colors.placeholderText}
              autoCapitalize="none"
              keyboardType="url"
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              style={glass.input}
            />
            <Pressable
              testID="submit-button"
              onPress={() => (canSubmit ? mutation.mutate() : undefined)}
              disabled={!canSubmit}
              style={({ pressed }) => [glass.button, !canSubmit && glass.buttonDisabled, pressed && canSubmit && glass.buttonPressed]}
            >
              <Text style={glass.buttonText}>{mutation.isPending ? 'Saving…' : 'Continue'}</Text>
            </Pressable>
            {mutation.isError ? (
              <Text testID="error-text" style={glass.errorText}>
                {(mutation.error as Error).message}
              </Text>
            ) : null}
          </BlurView>
        </View>
      </View>
    </LinearGradient>
  );
}
