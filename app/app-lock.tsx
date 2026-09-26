import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Linking,
  AppState,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Fingerprint, Lock, ScanFace, ShieldAlert, Timer } from 'lucide-react-native';

import { useTheme } from '../src/contexts/ThemeContext';
import { useToast } from '../src/contexts/NotificationContext';
import { LOCK_TIMEOUT_OPTIONS, useAppLock } from '../src/contexts/AppLockContext';
import { Button, Card, IconBadge, ScreenHeader } from '../src/components/ui';
import { BrandStrip } from '../src/components';
import { radius, spacing } from '../src/constants/theme';

export default function AppLockScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const toast = useToast();
  const { settings, capability, enable, disable, setLockTimeout, refreshCapability } = useAppLock();
  const [busy, setBusy] = useState(false);

  // Coming back from the phone's settings after adding a fingerprint.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshCapability();
    });
    return () => subscription.remove();
  }, [refreshCapability]);

  const Icon = /face/i.test(capability.label)
    ? ScanFace
    : /finger|touch/i.test(capability.label)
      ? Fingerprint
      : Lock;

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      const result = next ? await enable() : await disable();
      if (result.ok) {
        toast.success(next ? `App lock is on — ${capability.label} protects AccountE.` : 'App lock is off.');
      } else if (result.message) {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <BrandStrip />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="App lock" subtitle="Keep your finances private on this phone" showBack />

        <Card variant="elevated" padding="xl" radiusSize="xxl" style={styles.intro}>
          <View style={[styles.introIcon, { backgroundColor: colors.primaryContainer }]}>
            <Icon size={30} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={[styles.introTitle, { color: colors.onSurface }]}>
            Unlock with {capability.label}
          </Text>
          <Text style={[styles.introText, { color: colors.onSurfaceVariant }]}>
            Anyone who picks up your phone sees a lock screen instead of your balances. Your phone&apos;s PIN
            always works as a backup, and the app is hidden in the recent-apps view.
          </Text>
        </Card>

        {!capability.available && (
          <Card variant="elevated" padding="lg" radiusSize="xl">
            <View style={styles.row}>
              <IconBadge icon={ShieldAlert} tone="warning" size="md" />
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>Set up a screen lock first</Text>
                <Text style={[styles.rowDescription, { color: colors.onSurfaceVariant }]}>
                  Add a fingerprint, face or PIN in your phone&apos;s settings, then come back here.
                </Text>
              </View>
            </View>
            <Button
              label="Open phone settings"
              variant="secondary"
              fullWidth
              onPress={() => {
                Linking.openSettings().catch(() => toast.error('Could not open settings.'));
              }}
            />
          </Card>
        )}

        <Card variant="elevated" padding="lg" radiusSize="xl">
          <View style={styles.row}>
            <IconBadge icon={Icon} tone={settings.enabled ? 'success' : 'primary'} size="md" />
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.onSurface }]}>
                Require {capability.label}
              </Text>
              <Text style={[styles.rowDescription, { color: colors.onSurfaceVariant }]}>
                {settings.enabled
                  ? 'On — AccountE asks before showing anything.'
                  : 'Off — anyone with your unlocked phone can open AccountE.'}
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={toggle}
              disabled={busy || (!settings.enabled && !capability.available)}
              trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </Card>

        {settings.enabled && (
          <View style={{ gap: spacing.sm }}>
            <View style={styles.sectionLabel}>
              <Timer size={14} color={colors.onSurfaceVariant} />
              <Text style={[styles.sectionLabelText, { color: colors.onSurfaceVariant }]}>
                Lock after leaving the app
              </Text>
            </View>
            <Card variant="elevated" padding={0} radiusSize="xl">
              {LOCK_TIMEOUT_OPTIONS.map((option, index) => {
                const selected = settings.timeout === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => void setLockTimeout(option.value)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      {
                        borderBottomColor: colors.outlineVariant,
                        borderBottomWidth: index === LOCK_TIMEOUT_OPTIONS.length - 1 ? 0 : StyleSheet.hairlineWidth,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: selected ? colors.primary : colors.onSurface, fontWeight: selected ? '700' : '500' },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {selected && <Check size={18} color={colors.primary} strokeWidth={2.4} />}
                  </Pressable>
                );
              })}
            </Card>
            <Text style={[styles.footnote, { color: colors.onSurfaceVariant }]}>
              “After 1 minute” lets you pop out to your camera or photos for a receipt without unlocking
              again.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  intro: {
    alignItems: 'center',
  },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  introText: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  rowDescription: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionLabel: {
    fontSize: 15,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: spacing.xs,
  },
});
