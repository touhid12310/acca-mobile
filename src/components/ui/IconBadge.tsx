import React from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import { LucideIcon } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { radius } from "../../constants/theme";

type IconBadgeTone =
  | "primary"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral";

type IconBadgeShape = "circle" | "rounded";

type IconBadgeSize = "xs" | "sm" | "md" | "lg" | "xl";

interface IconBadgeProps {
  icon: LucideIcon;
  tone?: IconBadgeTone;
  size?: IconBadgeSize;
  shape?: IconBadgeShape;
  color?: string;
  bg?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconBadge({
  icon: Icon,
  tone = "primary",
  size = "md",
  shape = "circle",
  color,
  bg,
  style,
}: IconBadgeProps) {
  const { colors, isDark } = useTheme();

  // In dark mode the saturated *Container colors render as heavy solid blobs.
  // Use a translucent tint of the foreground instead for a soft, modern look.
  const tint = (hex: string) => `${hex}26`;
  const palette = isDark
    ? {
        primary: { bg: tint(colors.primary), fg: colors.primary },
        success: { bg: tint(colors.tertiary), fg: colors.tertiary },
        danger: { bg: tint(colors.error), fg: colors.error },
        warning: { bg: tint(colors.warning), fg: colors.warning },
        info: { bg: tint(colors.info), fg: colors.info },
        neutral: { bg: colors.surfaceVariant, fg: colors.onSurfaceVariant },
      }[tone]
    : {
        primary: { bg: colors.primaryContainer, fg: colors.primary },
        success: { bg: colors.tertiaryContainer, fg: colors.tertiary },
        danger: { bg: colors.errorContainer, fg: colors.error },
        warning: { bg: colors.warningContainer, fg: colors.warning },
        info: { bg: colors.infoContainer, fg: colors.info },
        neutral: { bg: colors.surfaceVariant, fg: colors.onSurfaceVariant },
      }[tone];

  const sizes = {
    xs: { box: 28, icon: 14 },
    sm: { box: 36, icon: 18 },
    md: { box: 44, icon: 20 },
    lg: { box: 52, icon: 24 },
    xl: { box: 64, icon: 30 },
  }[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: sizes.box,
          height: sizes.box,
          backgroundColor: bg || palette.bg,
          borderRadius: shape === "circle" ? radius.pill : radius.md,
        },
        style,
      ]}
    >
      <Icon size={sizes.icon} color={color || palette.fg} strokeWidth={2.2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
