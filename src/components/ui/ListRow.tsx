import React from "react";
import { Pressable, StyleSheet, Text, View, StyleProp, ViewStyle } from "react-native";
import { ChevronRight, LucideIcon } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, spacing } from "../../constants/theme";
import { IconBadge } from "./IconBadge";

interface ListRowProps {
  icon?: LucideIcon;
  iconTone?: "primary" | "success" | "danger" | "warning" | "info" | "neutral";
  title: string;
  subtitle?: string;
  value?: string;
  valueSub?: string;
  valueColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "card" | "plain";
  destructive?: boolean;
}

export function ListRow({
  icon,
  iconTone = "primary",
  title,
  subtitle,
  value,
  valueSub,
  valueColor,
  onPress,
  showChevron,
  right,
  style,
  variant = "plain",
  destructive,
}: ListRowProps) {
  const { colors } = useTheme();

  const inner = (
    <>
      {icon && <IconBadge icon={icon} tone={destructive ? "danger" : iconTone} size="md" />}
      <View style={styles.textBlock}>
        <Text
          style={[
            styles.title,
            { color: destructive ? colors.error : colors.onSurface },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, { color: colors.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right ?? (
        <View style={styles.valueBlock}>
          {value && (
            <Text
              style={[
                styles.value,
                { color: valueColor || colors.onSurface },
              ]}
              numberOfLines={1}
            >
              {value}
            </Text>
          )}
          {valueSub && (
            <Text
              style={[styles.valueSub, { color: colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {valueSub}
            </Text>
          )}
        </View>
      )}
      {showChevron && (
        <ChevronRight size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
      )}
    </>
  );

  const base: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: variant === "card" ? spacing.lg : 0,
    backgroundColor: variant === "card" ? colors.surface : "transparent",
    borderRadius: variant === "card" ? radius.lg : 0,
  };

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {({ pressed }) => (
          <View style={[base, { opacity: pressed ? 0.6 : 1 }, style]}>
            {inner}
          </View>
        )}
      </Pressable>
    );
  }

  return <View style={[base, style]}>{inner}</View>;
}

const styles = StyleSheet.create({
  textBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  valueBlock: {
    alignItems: "flex-end",
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12.5,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
  },
  valueSub: {
    fontSize: 12,
  },
});
