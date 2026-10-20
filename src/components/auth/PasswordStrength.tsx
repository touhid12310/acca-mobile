import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useTheme } from '../../contexts/ThemeContext';

type Strength = { level: 0 | 1 | 2 | 3; label: string };

/** Rough strength for the sign-up meter. Validation still only needs 8+ chars. */
export function passwordStrength(password: string): Strength {
  if (!password) return { level: 0, label: '' };
  if (password.length < 8) return { level: 1, label: 'Too short' };
  let score = 0;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (password.length >= 12) score += 1;
  if (score >= 4) return { level: 3, label: 'Strong' };
  if (score >= 2) return { level: 2, label: 'Fair' };
  return { level: 1, label: 'Weak' };
}

/** Three dashes and a word, sized to sit inside the password field. */
export function PasswordStrength({ password }: { password: string }) {
  const { colors, isDark } = useTheme();
  const { level, label } = passwordStrength(password);
  if (level === 0) return null;

  const tone = level === 3 ? colors.tertiary : level === 2 ? colors.warning : colors.error;
  const track = isDark ? 'rgba(148,163,184,0.25)' : '#e5e7eb';

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Password strength: ${label}`}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.dashes}>
        {[1, 2, 3].map((step) => (
          <Dash key={step} color={step <= level ? tone : track} />
        ))}
      </View>
      <Text style={[styles.label, { color: tone }]}>{label}</Text>
    </View>
  );
}

function Dash({ color }: { color: string }) {
  const style = useAnimatedStyle(() => ({
    backgroundColor: withTiming(color, { duration: 220 }),
  }));
  return <Animated.View style={[styles.dash, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dashes: {
    flexDirection: 'row',
    gap: 4,
  },
  dash: {
    width: 14,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 30,
  },
});
