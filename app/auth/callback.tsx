import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import socialAuthService from '../../src/services/socialAuthService';

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
  const [message, setMessage] = useState('Signing you in…');
  const ran = useRef(false);

  // 2FA state — when the backend says the account has TOTP enabled, we
  // stop on this screen and prompt for the 6-digit code.
  const [pendingToken, setPendingToken] = useState<string | null>(null);
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

    // Hand-off from inline login handler: exchange already done, 2FA required.
    if (pendingTokenParam) {
      setPendingToken(pendingTokenParam);
      setMessage('Two-factor authentication required');
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.outline ?? '#d1d5db',
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
            Two-factor authentication
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
            Enter the 6-digit code from your authenticator app to finish signing in.
          </Text>
          <TextInput
            value={code}
            onChangeText={(t) => {
              setCode(t.replace(/\D/g, '').slice(0, 6));
              if (twoFactorError) setTwoFactorError(null);
            }}
            keyboardType="number-pad"
            placeholder="000000"
            placeholderTextColor={colors.onSurfaceVariant}
            maxLength={6}
            autoFocus
            style={[
              styles.codeInput,
              {
                color: colors.onSurface,
                borderColor: colors.outline ?? '#d1d5db',
                backgroundColor: colors.surface,
              },
            ]}
          />
          {twoFactorError && (
            <Text style={styles.errorText}>{twoFactorError}</Text>
          )}
          <Pressable
            onPress={handleVerifyTwoFactor}
            disabled={isVerifying || code.length !== 6}
            style={[
              styles.verifyBtn,
              {
                backgroundColor: colors.primary,
                opacity: isVerifying || code.length !== 6 ? 0.6 : 1,
              },
            ]}
          >
            <Text style={styles.verifyBtnText}>
              {isVerifying ? 'Verifying…' : 'Verify & sign in'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            hitSlop={6}
            style={styles.cancelBtn}
          >
            <Text style={[styles.cancelText, { color: colors.onSurfaceVariant }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    opacity: 0.85,
    lineHeight: 18,
  },
  codeInput: {
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 6,
    fontWeight: '700',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
  },
  verifyBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  verifyBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 13,
  },
});
