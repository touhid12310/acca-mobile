import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
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
import type { AlertTone } from "./AlertBar";

export interface ToastItem {
  id: string;
  tone?: AlertTone;
  title?: string;
  message: string;
  icon?: LucideIcon;
  duration?: number;
  action?: { label: string; onPress: () => void };
  onDismiss?: () => void;
}

interface ToastProps {
  item: ToastItem;
  onClose: (id: string) => void;
}

const ENTER_MS = 220;
const EXIT_MS = 180;

export function Toast({ item, onClose }: ToastProps) {
  const { colors } = useTheme();
  const tone = item.tone ?? "info";

  const palette = {
    success: { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer, Icon: CheckCircle2 },
    error: { bg: colors.errorContainer, fg: colors.onErrorContainer, Icon: XCircle },
    warning: { bg: colors.warningContainer, fg: colors.onWarningContainer, Icon: AlertCircle },
    info: { bg: colors.infoContainer, fg: colors.onInfoContainer, Icon: Info },
    neutral: { bg: colors.surfaceVariant, fg: colors.onSurface, Icon: Info },
  }[tone];

  const Icon = item.icon || palette.Icon;

  const translateY = useSharedValue(-24);
  const opacity = useSharedValue(0);

  const close = () => onClose(item.id);

  const dismiss = () => {
    translateY.value = withTiming(-24, {
      duration: EXIT_MS,
      easing: Easing.in(Easing.cubic),
    });
    opacity.value = withTiming(0, { duration: EXIT_MS }, (finished) => {
      if (finished) runOnJS(close)();
    });
  };

  useEffect(() => {
    translateY.value = withTiming(0, {
      duration: ENTER_MS,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, { duration: ENTER_MS });

    const ms = item.duration ?? (tone === "error" || tone === "warning" ? 5000 : 3500);
    const timeout = setTimeout(dismiss, ms);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleAction = () => {
    item.action?.onPress();
    dismiss();
  };

  return (
    <Animated.View
      style={[styles.outer, animatedStyle]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={dismiss}
        style={[
          styles.container,
          {
            backgroundColor: palette.bg,
            shadowColor: "#000",
          },
        ]}
        accessibilityRole="alert"
      >
        <Icon size={20} color={palette.fg} strokeWidth={2.2} />
        <View style={styles.content}>
          {item.title ? (
            <Text style={[styles.title, { color: palette.fg }]} numberOfLines={2}>
              {item.title}
            </Text>
          ) : null}
          <Text
            style={[
              styles.message,
              { color: palette.fg, opacity: item.title ? 0.85 : 1 },
            ]}
            numberOfLines={3}
          >
            {item.message}
          </Text>
        </View>
        {item.action ? (
          <Pressable onPress={handleAction} hitSlop={8} style={styles.actionBtn}>
            <Text style={[styles.action, { color: palette.fg }]}>
              {item.action.label}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={dismiss} hitSlop={10} style={styles.close}>
            <X size={18} color={palette.fg} strokeWidth={2.2} />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: "100%",
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
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
    textDecorationLine: "underline",
  },
  actionBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  close: {
    padding: 2,
  },
});
