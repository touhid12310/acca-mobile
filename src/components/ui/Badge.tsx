import React from "react";
import { StyleSheet, Text, View, ViewStyle, StyleProp } from "react-native";
import { LucideIcon } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, spacing } from "../../constants/theme";

export type BadgeTone =
  | "primary"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral";

export type BadgeSize = "sm" | "md";

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  size?: BadgeSize;
  icon?: LucideIcon;
  solid?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Badge({
  label,
  tone = "neutral",
  size = "sm",
  icon: Icon,
  solid,
  style,
}: BadgeProps) {
  const { colors } = useTheme();

  const palette = {
    primary: { bg: colors.primaryContainer, fg: colors.onPrimaryContainer, solidBg: colors.primary, solidFg: colors.onPrimary },
    success: { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer, solidBg: colors.tertiary, solidFg: colors.onTertiary },
    danger: { bg: colors.errorContainer, fg: colors.onErrorContainer, solidBg: colors.error, solidFg: colors.onError },
    warning: { bg: colors.warningContainer, fg: colors.onWarningContainer, solidBg: colors.warning, solidFg: colors.onWarning },
    info: { bg: colors.infoContainer, fg: colors.onInfoContainer, solidBg: colors.info, solidFg: colors.onInfo },
    neutral: { bg: colors.surfaceVariant, fg: colors.onSurfaceVariant, solidBg: colors.secondary, solidFg: "#ffffff" },
  }[tone];

  const bg = solid ? palette.solidBg : palette.bg;
  const fg = solid ? palette.solidFg : palette.fg;

  const padding = size === "sm"
    ? { paddingHorizontal: spacing.sm, paddingVertical: 3, fontSize: 11, iconSize: 12 }
    : { paddingHorizontal: spacing.md, paddingVertical: 6, fontSize: 12, iconSize: 14 };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bg, paddingHorizontal: padding.paddingHorizontal, paddingVertical: padding.paddingVertical },
        style,
      ]}
    >
      {Icon && <Icon size={padding.iconSize} color={fg} strokeWidth={2.3} />}
      <Text style={[styles.label, { color: fg, fontSize: padding.fontSize }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  label: {
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
