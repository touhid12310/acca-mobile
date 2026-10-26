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
import { splitShadowStyle } from "./shadowSplit";

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
    const darkStyle = [styles.base, styles.darkBg, withShadow && shadow.lg, style];
    const darkBody = (
      <>
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
      </>
    );
    // iOS: shadow on an outer view, clip on an inner one (see splitShadowStyle).
    const darkSplit = splitShadowStyle(darkStyle);
    if (darkSplit) {
      return (
        <View style={darkSplit.outer}>
          <View style={darkSplit.inner}>{darkBody}</View>
        </View>
      );
    }
    return <View style={darkStyle}>{darkBody}</View>;
  }

  const lightStyle = [styles.base, withShadow && shadow.lg, style];
  const renderGradient = (gradientStyle: StyleProp<ViewStyle>) => (
    <LinearGradient
      colors={gradients.ocean as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={gradientStyle}
    >
      <View
        style={[styles.glowA, { backgroundColor: "#22d3ee", opacity: 0.4 }]}
        pointerEvents="none"
      />
      <View
        style={[styles.glowB, { backgroundColor: "#ffffff", opacity: 0.18 }]}
        pointerEvents="none"
      />
      {children}
    </LinearGradient>
  );

  const lightSplit = splitShadowStyle(lightStyle);
  if (lightSplit) {
    // A solid colour under the gradient lets iOS draw the shadow from the
    // rounded outline instead of rendering it offscreen.
    return (
      <View style={[{ backgroundColor: gradients.ocean[1] }, lightSplit.outer]}>
        {renderGradient(lightSplit.inner)}
      </View>
    );
  }
  return renderGradient(lightStyle);
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
