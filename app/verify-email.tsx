import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import authService from '../src/services/authService';

/**
 * Deep-link landing page for the email-verification link.
 *
 * Triggered when the user opens `accounte://verify-email?token=...` from the
 * verification email on their phone. The route is registered at the app root
 * level (sibling of `(auth)` and `(tabs)`) so the OS can route to it
 * regardless of the user's current navigation state.
 *
 * Flow:
 *   1. Read `token` from the deep link params.
 *   2. POST it to /auth/email-link/verify on the backend.
 *   3. On success, the backend marks the user verified and returns a
 *      Sanctum token + user — install both via loginWithToken and drop the
 *      user into the tab bar.
 */
export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const { loginWithToken } = useAuth();
  const { colors } = useTheme();
  const [message, setMessage] = useState('Verifying your email…');
  const [isError, setIsError] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const token = typeof params.token === 'string' ? params.token : undefined;
      if (!token) {
        setMessage('Missing verification token. Please open the link from your email again.');
        setIsError(true);
        return;
      }

      try {
        const result = await authService.verifyEmailLink(token);
        const data = result.data as { data?: { access_token?: string; user?: any } };
        const accessToken = data.data?.access_token;
        const user = data.data?.user;

        if (result.success && accessToken) {
          setMessage('Email verified — welcome!');
          await loginWithToken(accessToken, user);
          router.replace('/(tabs)');
          return;
        }

        const msg =
          (result.data as { message?: string } | undefined)?.message ||
          'This link is invalid or has expired. Please request a new one.';
        setMessage(msg);
        setIsError(true);
      } catch (err: any) {
        setMessage(err?.message || 'Could not verify your email. Please try again.');
        setIsError(true);
      }
    })();
  }, [params.token, loginWithToken]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!isError && <ActivityIndicator size="large" color={colors.primary} />}
      <Text style={[styles.message, { color: colors.onSurface }]}>{message}</Text>
      {isError && (
        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          style={[styles.button, { backgroundColor: colors.primary }]}
          hitSlop={6}
        >
          <Text style={styles.buttonText}>Back to sign in</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 22,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
