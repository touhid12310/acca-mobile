import React from "react";
import { StyleSheet, Text, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { LucideIcon } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, spacing } from "../../constants/theme";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected, onPress, icon: Icon, style }: ChipProps) {
  const { colors } = useTheme();

  const bg = selected ? colors.primary : colors.surfaceVariant;
  const fg = selected ? colors.onPrimary : colors.onSurfaceVariant;

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={6}
      activeOpacity={0.8}
      style={[styles.container, { backgroundColor: bg }, style]}
    >
      {Icon && <Icon size={14} color={fg} strokeWidth={2.3} />}
      <Text
        style={[styles.label, { color: fg }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: 19, // half the 38px height → pill
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
