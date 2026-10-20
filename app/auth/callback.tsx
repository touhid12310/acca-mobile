import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';

import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import socialAuthService from '../../src/services/socialAuthService';
import analyticsService from '../../src/services/analyticsService';
import metaEvents from '../../src/services/metaEvents';
import { AuthShell, Reveal } from '../../src/components/auth/AuthShell';
import { AuthIconBadge, AuthLink, AuthTitle } from '../../src/components/auth/AuthParts';
import { CodeInput } from '../../src/components/auth/CodeInput';
import { PrimaryButton } from '../../src/components/auth/AuthButtons';

// Codes already processed in this app session — prevents double-exchange if
// the inline WebBrowser.openAuthSessionAsync() handler in (auth)/login.tsx
// catches the redirect AND the deep link also fires the same callback.
export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
    // Set by the inline WebBrowser handler in (auth)/login.tsx when the
    // exchange already happened there and 2FA is required — skip the
    // exchange step and jump straight to the code prompt.
    pending_token?: string;
  }>();
  const { loginWithToken } = useAuth();
  const { colors } = useTheme();
  const handedOffToken =
    typeof params.pending_token === 'string' ? params.pending_token : null;
  const [message, setMessage] = useState(
    handedOffToken ? 'Two-factor authentication required' : 'Signing you in…',
  );
  const ran = useRef(false);

  // 2FA state — when the backend says the account has TOTP enabled, we
  // stop on this screen and prompt for the 6-digit code.
  const [pendingToken, setPendingToken] = useState<string | null>(handedOffToken);
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const codeParam = typeof params.code === 'string' ? params.code : undefined;
    const stateParam = typeof params.state === 'string' ? params.state : undefined;
    const error = typeof params.error === 'string' ? params.error : undefined;
    const errorDescription =
      typeof params.error_description === 'string'
        ? params.error_description
        : undefined;
    const pendingTokenParam =
      typeof params.pending_token === 'string' ? params.pending_token : undefined;

    const finishWithError = (msg: string) => {
      setMessage(msg);
      setTimeout(() => router.replace('/(auth)/login'), 1200);
    };

    if (error) {
      finishWithError(errorDescription || error);
      return;
    }

    // Hand-off from inline login handler: exchange already done, 2FA
    // required. The prompt is already showing (state starts from the param).
    if (pendingTokenParam) {
      return;
    }

    if (!codeParam || !stateParam) {
      finishWithError('Missing authorization code');
      return;
    }

    // Duplicate callback exchanges are coalesced by socialAuthService.
    (async () => {
      try {
        const result = await socialAuthService.exchange(codeParam, stateParam);

        if (result.requiresTwoFactor && result.pendingToken) {
          setPendingToken(result.pendingToken);
          setMessage('Two-factor authentication required');
          return;
        }

        if (result.success && result.accessToken) {
          setMessage('Welcome back!');
          await loginWithToken(result.accessToken, result.user);
          analyticsService.logLogin('google');
          if (result.isNewUser) metaEvents.logRegistration('google');
          router.replace('/(tabs)');
          return;
        }
        if (result.requiresPasswordLogin) {
          finishWithError(
            result.message ||
              'An account already exists. Sign in with its existing method before linking social sign-in.',
          );
          return;
        }
        finishWithError(result.message || 'Sign-in failed');
      } catch (err: any) {
        finishWithError(err?.message || 'Sign-in failed');
      }
    })();
  }, [
    params.code,
    params.state,
    params.error,
    params.error_description,
    params.pending_token,
    loginWithToken,
  ]);

  const handleVerifyTwoFactor = async () => {
    if (!pendingToken) return;
    const trimmed = code.replace(/\D/g, '').slice(0, 6);
    if (trimmed.length !== 6) {
      setTwoFactorError('Enter the 6-digit code from your authenticator app');
      return;
    }
    if (isVerifying) return;
    setIsVerifying(true);
    setTwoFactorError(null);
    try {
      const result = await socialAuthService.verifyTwoFactor(pendingToken, trimmed);
      if (result.success && result.accessToken) {
        await loginWithToken(result.accessToken, result.user);
        router.replace('/(tabs)');
      } else {
        setTwoFactorError(result.message || 'Invalid code. Try again.');
      }
    } catch (err: any) {
      setTwoFactorError(err?.message || 'Could not verify the code.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (pendingToken) {
    return (
      <AuthShell>
        <AuthIconBadge icon={ShieldCheck} index={0} />
        <AuthTitle
          title="Two-step verification"
          subtitle="Enter the 6-digit code from your authenticator app to finish signing in."
          index={1}
        />
        <Reveal index={2}>
          <CodeInput
            value={code}
            onChangeText={(digits) => {
              setCode(digits);
              if (twoFactorError) setTwoFactorError(null);
            }}
            autoFocus
            error={!!twoFactorError}
            accessibilityLabel="Authenticator code"
            onSubmitEditing={handleVerifyTwoFactor}
          />
          {twoFactorError && (
            <Text style={[styles.errorText, { color: colors.error }]}>{twoFactorError}</Text>
          )}
        </Reveal>
        <Reveal index={3} style={styles.actionTop}>
          <PrimaryButton
            label="Verify & sign in"
            loadingLabel="Verifying…"
            onPress={handleVerifyTwoFactor}
            loading={isVerifying}
            disabled={code.length !== 6}
          />
        </Reveal>
        <Reveal index={4}>
          <AuthLink label="Cancel" muted onPress={() => router.replace('/(auth)/login')} />
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
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  errorText: {
    fontSize: 12.5,
    marginTop: 8,
    textAlign: 'center',
  },
  actionTop: {
    marginTop: 4,
  },
});
