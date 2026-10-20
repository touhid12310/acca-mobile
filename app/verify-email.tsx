import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MailWarning } from 'lucide-react-native';

import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import authService from '../src/services/authService';
import analyticsService from '../src/services/analyticsService';
import { AuthShell, Reveal } from '../src/components/auth/AuthShell';
import { AuthIconBadge, AuthTitle } from '../src/components/auth/AuthParts';
import { PrimaryButton } from '../src/components/auth/AuthButtons';

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
          analyticsService.logLogin('email_link');
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

  if (isError) {
    return (
      <AuthShell>
        <AuthIconBadge icon={MailWarning} index={0} />
        <AuthTitle title="We couldn't verify your email" subtitle={message} index={1} />
        <Reveal index={2} style={styles.actionTop}>
          <PrimaryButton
            label="Back to sign in"
            onPress={() => router.replace('/(auth)/login')}
          />
        </Reveal>
      </AuthShell>
    );
  }

  return (
    <AuthShell centered>
      <Reveal index={0} style={styles.status}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.message, { color: colors.onSurface }]}>{message}</Text>
      </Reveal>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  status: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 22,
  },
  actionTop: {
    marginTop: 4,
  },
});
