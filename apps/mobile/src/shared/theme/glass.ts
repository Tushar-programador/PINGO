import { StyleSheet } from 'react-native';

// Shared glassmorphism visual language: gradient background, blur "glass"
// cards, and the button/input/text treatments used across every screen.
export const colors = {
  gradientStart: '#1a1c2e',
  gradientEnd: '#0a0b14',
  accent: '#6c5ce7',
  accentPressed: '#5a4bd1',
  error: '#ff8a80',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.65)',
  placeholderText: 'rgba(255,255,255,0.45)',
  cardBorder: 'rgba(255,255,255,0.12)',
  inputBackground: 'rgba(255,255,255,0.08)',
  inputBorder: 'rgba(255,255,255,0.16)',
} as const;

export const gradientColors: [string, string] = [colors.gradientStart, colors.gradientEnd];

export const glass = StyleSheet.create({
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
    borderColor: colors.cardBorder,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    backgroundColor: colors.accentPressed,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  link: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
