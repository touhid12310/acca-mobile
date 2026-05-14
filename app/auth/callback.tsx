import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import socialAuthService from '../../src/services/socialAuthService';

// Codes already processed in this app session — prevents double-exchange if
// the inline WebBrowser.openAuthSessionAsync() handler in (auth)/login.tsx
// catches the redirect AND the deep link also fires the same callback.
const processedCodes = new Set<string>();

export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const { loginWithToken } = useAuth();
  const { colors } = useTheme();
  const [message, setMessage] = useState('Signing you in…');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = typeof params.code === 'string' ? params.code : undefined;
    const error = typeof params.error === 'string' ? params.error : undefined;
    const errorDescription =
      typeof params.error_description === 'string'
        ? params.error_description
        : undefined;

    const finishWithError = (msg: string) => {
      setMessage(msg);
      setTimeout(() => router.replace('/(auth)/login'), 1200);
    };

    if (error) {
      finishWithError(errorDescription || error);
      return;
    }

    if (!code) {
      finishWithError('Missing authorization code');
      return;
    }

    if (processedCodes.has(code)) {
      // Inline handler already exchanged this code. The other path will
      // navigate to /(tabs) shortly — just sit on the loader.
      return;
    }
    processedCodes.add(code);

    (async () => {
      try {
        const result = await socialAuthService.exchange(code);
        if (result.success && result.accessToken) {
          setMessage('Welcome back!');
          await loginWithToken(result.accessToken, result.user);
          router.replace('/(tabs)');
          return;
        }
        if (result.requiresPasswordLogin) {
          finishWithError(
            result.message ||
              'An account already exists. Sign in with your password first to link.',
          );
          return;
        }
        finishWithError(result.message || 'Sign-in failed');
      } catch (err: any) {
        finishWithError(err?.message || 'Sign-in failed');
      }
    })();
  }, [params.code, params.error, params.error_description, loginWithToken]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.message, { color: colors.onSurface }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  message: {
    fontSize: 15,
    opacity: 0.85,
  },
});
