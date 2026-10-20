import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { PressableScale } from './PressableScale';

/** AccountE indigo, the same shade as the middle of the auth header. */
const BRAND_INDIGO = '#4f46e5';

type AuthButtonProps = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  /** Label while loading, e.g. "Signing in…". */
  loadingLabel?: string;
  disabled?: boolean;
  icon?: LucideIcon;
  /** Icon after the label, e.g. an arrow. Hidden while loading. */
  iconRight?: LucideIcon;
  style?: StyleProp<ViewStyle>;
};

/** Full-width solid indigo pill for the main action. */
export function PrimaryButton({
  label,
  onPress,
  loading,
  loadingLabel,
  disabled,
  icon: Icon,
  iconRight: IconRight,
  style,
}: AuthButtonProps) {
  const inactive = !!disabled || !!loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      style={[styles.cta, { opacity: disabled && !loading ? 0.55 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : Icon ? (
        <Icon size={19} color="#ffffff" strokeWidth={2.3} />
      ) : null}
      <Text style={styles.ctaLabel} numberOfLines={1}>
        {loading && loadingLabel ? loadingLabel : label}
      </Text>
      {IconRight && !loading ? <IconRight size={19} color="#ffffff" strokeWidth={2.3} /> : null}
    </PressableScale>
  );
}

/** Outlined pill for the second-choice action. */
export function OutlineButton({
  label,
  onPress,
  loading,
  loadingLabel,
  disabled,
  icon: Icon,
  style,
}: AuthButtonProps) {
  const { colors, isDark } = useTheme();
  const inactive = !!disabled || !!loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      style={[
        styles.outline,
        {
          borderColor: isDark ? colors.outline : '#dfe3f0',
          backgroundColor: isDark ? 'rgba(129,140,248,0.08)' : '#f7f7ff',
          opacity: inactive && !loading ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : Icon ? (
        <Icon size={18} color={colors.primary} strokeWidth={2.2} />
      ) : null}
      <Text style={[styles.outlineLabel, { color: colors.primary }]} numberOfLines={1}>
        {loading && loadingLabel ? loadingLabel : label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  cta: {
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BRAND_INDIGO,
    boxShadow: '0px 10px 22px rgba(79, 70, 229, 0.3)',
  },
  ctaLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  outline: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  outlineLabel: {
    fontSize: 15,
    fontWeight: '600',
    includeFontPadding: false,
  },
});
