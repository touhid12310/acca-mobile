import React from "react";
import { Pressable, StyleSheet, Text, StyleProp, ViewStyle } from "react-native";
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
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: bg,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {Icon && <Icon size={14} color={fg} strokeWidth={2.3} />}
      <Text
        style={[styles.label, { color: fg }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </Pressable>
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
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
