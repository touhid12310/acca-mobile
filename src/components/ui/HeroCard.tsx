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
 * - Dark mode: deep navy `#0f213d` base + indigo/violet glow blobs.
 * - Light mode: ocean (sky-blue → indigo) linear gradient.
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
        <View
          style={[
            styles.glowA,
            { backgroundColor: "#6366f1", opacity: 0.22 },
          ]}
          pointerEvents="none"
        />
        <View
          style={[
            styles.glowB,
            { backgroundColor: "#a855f7", opacity: 0.18 },
          ]}
          pointerEvents="none"
        />
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={gradients.ocean as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.base, withShadow && shadow.lg, style]}
    >
      <View
        style={[styles.glowA, { backgroundColor: "#67e8f9", opacity: 0.5 }]}
        pointerEvents="none"
      />
      <View
        style={[styles.glowB, { backgroundColor: "#ec4899", opacity: 0.35 }]}
        pointerEvents="none"
      />
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
    top: -80,
    right: -60,
  },
  glowB: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: -40,
    left: -30,
  },
});
