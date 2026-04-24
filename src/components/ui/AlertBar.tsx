import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from "react-native";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  XCircle,
  X,
  LucideIcon,
} from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, spacing } from "../../constants/theme";

export type AlertTone = "success" | "error" | "warning" | "info" | "neutral";

interface AlertBarProps {
  tone?: AlertTone;
  title?: string;
  message: string;
  icon?: LucideIcon;
  onClose?: () => void;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}

export function AlertBar({
  tone = "info",
  title,
  message,
  icon: CustomIcon,
  onClose,
  action,
  style,
}: AlertBarProps) {
  const { colors } = useTheme();

  const palette = {
    success: { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer, Icon: CheckCircle2 },
    error: { bg: colors.errorContainer, fg: colors.onErrorContainer, Icon: XCircle },
    warning: { bg: colors.warningContainer, fg: colors.onWarningContainer, Icon: AlertCircle },
    info: { bg: colors.infoContainer, fg: colors.onInfoContainer, Icon: Info },
    neutral: { bg: colors.surfaceVariant, fg: colors.onSurface, Icon: Info },
  }[tone];

  const Icon = CustomIcon || palette.Icon;

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }, style]}>
      <Icon size={20} color={palette.fg} strokeWidth={2.2} />
      <View style={styles.content}>
        {title && (
          <Text style={[styles.title, { color: palette.fg }]} numberOfLines={2}>
            {title}
          </Text>
        )}
        <Text
          style={[
            styles.message,
            { color: palette.fg, opacity: title ? 0.85 : 1 },
          ]}
        >
          {message}
        </Text>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <Text style={[styles.action, { color: palette.fg }]}>
              {action.label}
            </Text>
          </Pressable>
        )}
      </View>
      {onClose && (
        <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
          <X size={18} color={palette.fg} strokeWidth={2.2} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  action: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.xs,
    textDecorationLine: "underline",
  },
  close: {
    padding: 2,
  },
});
