import React from "react";
import { StyleSheet, Text, View, StyleProp, ViewStyle } from "react-native";
import { LucideIcon, PackageOpen } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, spacing } from "../../constants/theme";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  message,
  action,
  style,
  compact,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { paddingVertical: compact ? spacing.xl : spacing.xxxl * 1.5 },
        style,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: colors.primaryContainer },
        ]}
      >
        <Icon size={32} color={colors.primary} strokeWidth={1.8} />
      </View>
      <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
      {message && (
        <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>
          {message}
        </Text>
      )}
      {action && (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="primary"
          size="md"
          style={{ marginTop: spacing.lg }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280,
  },
});
