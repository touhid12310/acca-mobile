import React from "react";
import { StyleSheet, Text, View, StyleProp, ViewStyle } from "react-native";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, spacing, shadow } from "../../constants/theme";
import { IconBadge } from "./IconBadge";

interface StatTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "danger" | "warning" | "info" | "neutral";
  trend?: "up" | "down";
  trendValue?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatTile({
  label,
  value,
  icon,
  tone = "primary",
  trend,
  trendValue,
  style,
}: StatTileProps) {
  const { colors } = useTheme();

  const trendColor =
    trend === "up" ? colors.tertiary : trend === "down" ? colors.error : colors.onSurfaceVariant;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, ...shadow.sm },
        style,
      ]}
    >
      <View style={styles.header}>
        <IconBadge icon={icon} tone={tone} size="sm" />
        {trend && (
          <View style={styles.trendRow}>
            {trend === "up" ? (
              <TrendingUp size={14} color={trendColor} strokeWidth={2.4} />
            ) : (
              <TrendingDown size={14} color={trendColor} strokeWidth={2.4} />
            )}
            {trendValue && (
              <Text style={[styles.trendText, { color: trendColor }]}>
                {trendValue}
              </Text>
            )}
          </View>
        )}
      </View>
      <Text
        style={[styles.label, { color: colors.onSurfaceVariant }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[styles.value, { color: colors.onSurface }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.sm,
    minWidth: 140,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "700",
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
});
