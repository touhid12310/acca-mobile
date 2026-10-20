import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Reveal } from './AuthShell';

type AuthTitleProps = {
  title: string;
  subtitle?: ReactNode;
  /** Stagger position (see Reveal). */
  index?: number;
};

/** Centred sheet heading: bold title and a muted line under it. */
export function AuthTitle({ title, subtitle, index = 0 }: AuthTitleProps) {
  const { colors } = useTheme();
  return (
    <Reveal index={index} style={styles.titleBlock}>
      <Text style={[styles.title, { color: colors.onSurface }]} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>{subtitle}</Text>
      ) : null}
    </Reveal>
  );
}

/** Round tinted badge with an icon, shown above status headings. */
export function AuthIconBadge({ icon: Icon, index = 0 }: { icon: LucideIcon; index?: number }) {
  const { colors, isDark } = useTheme();
  return (
    <Reveal index={index} style={styles.badgeWrap}>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: colors.primaryContainer,
            borderColor: isDark ? 'rgba(199,210,254,0.18)' : 'rgba(99,102,241,0.14)',
          },
        ]}
      >
        <Icon
          size={28}
          color={isDark ? colors.onPrimaryContainer : colors.primary}
          strokeWidth={2.1}
        />
      </View>
    </Reveal>
  );
}

type AuthLinkProps = {
  label: string;
  onPress: () => void;
  /** Grey instead of the brand colour, for "Cancel"-type links. */
  muted?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Text button used for secondary actions in the sheet. */
export function AuthLink({ label, onPress, muted, disabled, style }: AuthLinkProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.link,
        { opacity: disabled ? 0.45 : pressed ? 0.55 : 1 },
        style,
      ]}
    >
      <Text
        style={[
          styles.linkText,
          { color: muted ? colors.onSurfaceVariant : colors.primary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** "──── Or sign in with ────" */
export function AuthDivider({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: colors.outline }]} />
      <Text style={[styles.dividerLabel, { color: colors.onSurfaceVariant }]}>{label}</Text>
      <View style={[styles.dividerLine, { backgroundColor: colors.outline }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 320,
  },
  badgeWrap: {
    alignItems: 'center',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    fontSize: 12.5,
    fontWeight: '500',
  },
});
