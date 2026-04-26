import React from "react";
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../../contexts/ThemeContext";
import { gradients, radius, shadow } from "../../constants/theme";

interface HeroCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  withShadow?: boolean;
}

/**
 * Brand hero/balance card with a unified look across the app.
 * - Dark mode: deep navy `#0f213d` + indigo/violet glow blobs.
 * - Light mode: indigo→violet `gradients.primary` linear gradient.
 * Both modes show white text content and look like the same surface family.
 */
export function HeroCard({
  children,
  style,
  withShadow = true,
}: HeroCardProps) {
  const { isDark } = useTheme();

  if (isDark) {
    return (
      <View style={[styles.base, styles.darkBg, withShadow && shadow.lg, style]}>
        <View style={styles.glowA} pointerEvents="none" />
        <View style={styles.glowB} pointerEvents="none" />
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={gradients.primary as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.base, withShadow && shadow.lg, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xxl,
    overflow: "hidden",
  },
  darkBg: {
    backgroundColor: "#0f213d",
  },
  glowA: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#6366f1",
    opacity: 0.22,
    top: -80,
    right: -60,
  },
  glowB: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#a855f7",
    opacity: 0.18,
    bottom: -40,
    left: -30,
  },
});
