import React from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '../../contexts/ThemeContext';
import { spacing, radius } from '../../constants/theme';
import type { WorkOSProvider } from '../../services/workosService';

interface SocialAuthButtonsProps {
  onSelect: (provider: WorkOSProvider) => void;
  activeProvider?: WorkOSProvider | null;
  disabled?: boolean;
  heading?: string;
}

const GoogleSvg = () => (
  <Svg viewBox="0 0 24 24" width={22} height={22}>
    <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </Svg>
);

const AppleSvg = ({ color }: { color: string }) => (
  <Svg viewBox="0 0 24 24" width={22} height={22}>
    <Path
      fill={color}
      d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.823.99-2.158 1.747-3.213 1.66-.144-1.15.482-2.35 1.166-3.16.755-.97 2.142-1.69 3.224-1.58zM21.5 17.41c-.36.83-.79 1.61-1.29 2.34-.69 1-1.25 1.69-1.69 2.07-.69.62-1.43.94-2.22.96-.57 0-1.26-.16-2.05-.5-.8-.34-1.53-.5-2.2-.5-.7 0-1.45.16-2.26.5-.81.34-1.46.52-1.97.54-.76.03-1.51-.3-2.27-.99-.47-.41-1.06-1.13-1.76-2.16-.75-1.1-1.37-2.38-1.86-3.83-.52-1.57-.78-3.09-.78-4.56 0-1.69.36-3.15 1.09-4.37.58-.99 1.34-1.77 2.3-2.34.96-.57 1.99-.86 3.1-.88.6 0 1.39.19 2.37.55.98.36 1.61.55 1.88.55.21 0 .9-.21 2.07-.65 1.11-.4 2.04-.57 2.81-.51 2.08.17 3.64.99 4.68 2.47-1.86 1.13-2.78 2.71-2.76 4.74.02 1.58.59 2.9 1.72 3.94.51.49 1.08.86 1.71 1.12-.14.4-.28.79-.43 1.16z"
    />
  </Svg>
);

const MicrosoftSvg = () => (
  <Svg viewBox="0 0 24 24" width={22} height={22}>
    <Path fill="#F25022" d="M1 1h10v10H1z" />
    <Path fill="#7FBA00" d="M13 1h10v10H13z" />
    <Path fill="#00A4EF" d="M1 13h10v10H1z" />
    <Path fill="#FFB900" d="M13 13h10v10H13z" />
  </Svg>
);

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onSelect,
  activeProvider,
  disabled,
  heading = 'Or continue with',
}) => {
  const { colors, isDark } = useTheme();

  const buttons: Array<{
    key: WorkOSProvider;
    label: string;
    icon: React.ReactNode;
    background: string;
    border: string;
    color: string;
  }> = [
    {
      key: 'google',
      label: 'Google',
      icon: <GoogleSvg />,
      background: colors.surface,
      border: colors.outline,
      color: colors.onSurface,
    },
    {
      key: 'microsoft',
      label: 'Microsoft',
      icon: <MicrosoftSvg />,
      background: colors.surface,
      border: colors.outline,
      color: colors.onSurface,
    },
    {
      key: 'apple',
      label: 'Apple',
      icon: <AppleSvg color={isDark ? '#fff' : '#fff'} />,
      background: '#000',
      border: '#000',
      color: '#fff',
    },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.outline }]} />
        <Text style={[styles.dividerLabel, { color: colors.onSurfaceVariant }]}>
          {heading}
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.outline }]} />
      </View>

      <View style={styles.grid}>
        {buttons.map((btn) => {
          const isBusy = activeProvider === btn.key;
          const isDisabled = !!disabled || !!activeProvider;
          return (
            <Pressable
              key={btn.key}
              onPress={() => onSelect(btn.key)}
              disabled={isDisabled}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: btn.background,
                  borderColor: btn.border,
                  opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
                },
              ]}
              accessibilityLabel={`Continue with ${btn.label}`}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color={btn.color} />
              ) : (
                btn.icon
              )}
              <Text style={[styles.label, { color: btn.color }]}>{btn.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  dividerLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.lg,
    minHeight: 70,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SocialAuthButtons;
