import React from "react";
import { Image, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { spacing } from "../../constants/theme";

const LOGO_LIGHT = require("../../../assets/logo-light.png");
const LOGO_DARK = require("../../../assets/logo-dark.png");

type BrandStripProps = {
  /** Hide the hairline divider when the strip sits over a custom header. */
  borderless?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Slim brand bar showing the Accounte wordmark. Picks the light/dark
 * variant of the asset based on the active theme so the wordmark always
 * has good contrast against its background.
 */
export function BrandStrip({ borderless = false, style }: BrandStripProps) {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          // Slightly tinted strip so the wordmark has a backdrop instead of
          // floating against the page background. Goes a little darker in
          // dark mode and a little dimmer in light mode for visible contrast.
          backgroundColor: isDark ? "#0f172a" : "#e2e8f0",
        },
        !borderless && {
          borderBottomColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(15,23,42,0.08)",
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        style,
      ]}
    >
      <Image
        source={isDark ? LOGO_DARK : LOGO_LIGHT}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  logo: {
    height: 24,
    width: 132,
  },
});
