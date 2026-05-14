import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import authService from '../../src/services/authService';

// Codes already processed in this app session — prevents double-exchange when
// the inline WebBrowser handler in (auth)/login.tsx catches the redirect AND
// the deep link also fires the same callback.
const processedCodes = new Set<string>();

const MOBILE_REDIRECT_URI = 'accounte://auth/callback';

export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
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
    const state = typeof params.state === 'string' ? params.state : undefined;
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

    if (!code || !state) {
      finishWithError('Missing authorization code or state');
      return;
    }

    if (processedCodes.has(code)) {
      // Inline handler already exchanged this code; the other path will
      // navigate to /(tabs) shortly — just sit on the loader.
      return;
    }
    processedCodes.add(code);

    (async () => {
      try {
        const result = await authService.googleExchange(
          code,
          state,
          MOBILE_REDIRECT_URI,
        );
        if (result.success && result.data) {
          const data = result.data as { data?: { access_token?: string; user?: any } };
          const accessToken = data.data?.access_token;
          const user = data.data?.user;
          if (accessToken) {
            setMessage('Welcome!');
            await loginWithToken(accessToken, user);
            router.replace('/(tabs)');
            return;
          }
        }
        finishWithError(
          (result.data as { message?: string } | undefined)?.message ||
            'Sign-in failed',
        );
      } catch (err: any) {
        finishWithError(err?.message || 'Sign-in failed');
      }
    })();
  }, [params.code, params.state, params.error, params.error_description, loginWithToken]);

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
