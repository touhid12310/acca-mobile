import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Fingerprint, Lock, ScanFace } from 'lucide-react-native';

import { useAppLock } from '../contexts/AppLockContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button, ConfirmDialog } from './ui';
import { radius, spacing } from '../constants/theme';

const LOGO_LIGHT = require('../../assets/logo-light.png');
const LOGO_DARK = require('../../assets/logo-dark.png');

/**
 * Full-screen cover for the biometric app lock. Rendered above every screen
 * by the root layout; asks for Face ID / fingerprint as soon as it appears,
 * falls back to the phone's PIN, and always offers a way out (sign out).
 */
export function AppLockOverlay() {
  const { locked, privacyCover, unlock, capability } = useAppLock();
  const { logout } = useAuth();
  const { colors, isDark } = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const promptedFor = useRef(false);

  // Prompt once each time the lock appears; the button retries.
  useEffect(() => {
    if (!locked) {
      promptedFor.current = false;
      setMessage(null);
      return;
    }
    if (promptedFor.current) return;
    promptedFor.current = true;
    const timer = setTimeout(() => {
      void unlock();
    }, 250);
    return () => clearTimeout(timer);
  }, [locked, unlock]);

  if (!locked && !privacyCover) return null;

  const Icon = /face/i.test(capability.label)
    ? ScanFace
    : /finger|touch/i.test(capability.label)
      ? Fingerprint
      : Lock;

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.container, { backgroundColor: colors.background }]}
      accessibilityViewIsModal
    >
      <Image source={isDark ? LOGO_DARK : LOGO_LIGHT} style={styles.logo} resizeMode="contain" />

      {locked && (
        <>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryContainer }]}>
            <Icon size={34} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={[styles.title, { color: colors.onSurface }]}>AccountE is locked</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Unlock with {capability.label} to see your finances.
          </Text>
          {message && <Text style={[styles.error, { color: colors.error }]}>{message}</Text>}

          <View style={styles.actions}>
            <Button
              label={`Unlock with ${capability.label}`}
              icon={Icon}
              fullWidth
              onPress={async () => {
                setMessage(null);
                const ok = await unlock();
                if (!ok) setMessage("That didn't work. Try again, or use your phone's PIN.");
              }}
            />
            <Pressable onPress={() => setConfirmLogout(true)} hitSlop={10} style={styles.signOut}>
              <Text style={[styles.signOutText, { color: colors.onSurfaceVariant }]}>
                Sign out instead
              </Text>
            </Pressable>
          </View>
        </>
      )}

      <ConfirmDialog
        visible={confirmLogout}
        title="Sign out?"
        message="You can sign back in with your email. The app lock stays on for this phone."
        icon={Lock}
        confirmLabel="Sign out"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          await logout(false);
          router.replace('/(auth)/login');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  logo: {
    width: 180,
    height: 48,
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 300,
  },
  actions: {
    alignSelf: 'stretch',
    maxWidth: 360,
    width: '100%',
    marginTop: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  signOut: {
    paddingVertical: spacing.sm,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
