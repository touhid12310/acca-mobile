import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Download } from 'lucide-react-native';

import { useAppLock } from '../contexts/AppLockContext';
import { useTheme } from '../contexts/ThemeContext';
import { notifyToast } from '../contexts/NotificationContext';
import { checkForUpdate, openStore, snoozeUpdate, storeName, type UpdateDecision } from '../services/appUpdate';
import { AppDarkBackground, ConfirmDialog } from './ui';
import { PrimaryButton } from './auth/AuthButtons';
import { TopLayer } from './common/TopLayer';
import { radius, spacing } from '../constants/theme';

const LOGO_LIGHT = require('../../assets/logo-light.png');
const LOGO_DARK = require('../../assets/logo-dark.png');

/** Coming back to the app checks again, at most this often. */
const RECHECK_MS = 60 * 60 * 1000;

/** The sign-in button's brand indigo, for the icon circle and Update button. */
const BRAND_INDIGO = '#4f46e5';

/**
 * "A new version is available" (Update / Later) and "Update required" (a
 * full screen with only Update), from admin → Settings → App updates. Checked
 * on launch and when the app comes back to the screen. Rendered by the root
 * layout after the app lock: the required screen covers even a locked app,
 * the popup waits until it is unlocked.
 */
export function AppUpdatePrompt() {
  const { locked, privacyCover, ready } = useAppLock();
  const { colors, isDark } = useTheme();
  const [decision, setDecision] = useState<UpdateDecision>(null);
  // The popup shows once per app run; "Later" also waits a few days.
  const [popupDone, setPopupDone] = useState(false);
  const lastCheck = useRef(0);
  const checking = useRef(false);

  const check = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    lastCheck.current = Date.now();
    try {
      const next = await checkForUpdate();
      if (next !== undefined) setDecision(next);
    } catch {
      // Never let the check itself break the app.
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastCheck.current > RECHECK_MS) void check();
    });
    return () => subscription.remove();
  }, [check]);

  const required = decision?.kind === 'required';

  // Android's back button must not get past "Update required".
  useEffect(() => {
    if (!required) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [required]);

  if (!decision) return null;

  const update = async () => {
    try {
      await openStore(decision.storeUrl);
    } catch {
      notifyToast.error(`Couldn't open the ${storeName()}. Please update AccountE from there.`);
    }
  };

  if (required) {
    return (
      <TopLayer>
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.container,
            { backgroundColor: isDark ? '#0b1830' : colors.background },
          ]}
          accessibilityViewIsModal
        >
          {isDark && <AppDarkBackground />}
          <Image source={isDark ? LOGO_DARK : LOGO_LIGHT} style={styles.logo} resizeMode="contain" />
          <View style={[styles.iconCircle, { backgroundColor: BRAND_INDIGO }]}>
            <Download size={34} color="#ffffff" strokeWidth={2.2} />
          </View>
          <Text style={[styles.title, { color: colors.onSurface }]}>Update required</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            This version of AccountE is no longer supported. Update to version {decision.version} from the{' '}
            {storeName()} to keep using the app. Your data stays safe.
          </Text>
          <View style={styles.actions}>
            <PrimaryButton label="Update now" icon={Download} onPress={update} style={styles.updateButton} />
          </View>
        </View>
      </TopLayer>
    );
  }

  return (
    <ConfirmDialog
      visible={!popupDone && ready && !locked && !privacyCover}
      tone="primary"
      icon={Download}
      accentColor={BRAND_INDIGO}
      title="A new version is available"
      message={`AccountE ${decision.version} is ready in the ${storeName()}, with the latest fixes and improvements.`}
      confirmLabel="Update now"
      cancelLabel="Later"
      onConfirm={() => {
        setPopupDone(true);
        void update();
      }}
      onCancel={() => {
        setPopupDone(true);
        void snoozeUpdate(decision.version);
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10000,
    elevation: 10000,
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
    maxWidth: 320,
  },
  updateButton: {
    alignSelf: 'stretch',
  },
  actions: {
    alignSelf: 'stretch',
    maxWidth: 360,
    width: '100%',
    marginTop: spacing.lg,
    alignItems: 'center',
  },
});
