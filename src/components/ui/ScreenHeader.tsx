import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { router } from "expo-router";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, spacing } from "../../constants/theme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack,
  onBack,
  right,
  style,
  compact,
}: ScreenHeaderProps) {
  const { colors } = useTheme();

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={[styles.container, compact && styles.compact, style]}>
      <View style={styles.leftCluster}>
        {showBack && (
          <Pressable
            onPress={handleBack}
            style={[
              styles.backBtn,
              { backgroundColor: colors.surfaceVariant },
            ]}
            hitSlop={8}
          >
            <ChevronLeft size={22} color={colors.onSurface} strokeWidth={2.2} />
          </Pressable>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          {subtitle && (
            <Text
              style={[styles.subtitle, { color: colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
          <Text
            style={[styles.title, { color: colors.onSurface }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  compact: {
    paddingVertical: spacing.sm,
  },
  leftCluster: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minWidth: 0,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
