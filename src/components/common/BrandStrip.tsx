import React from "react";
import { Image, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { spacing } from "../../constants/theme";
import { NotificationBell } from "./NotificationBell";

const LOGO_LIGHT = require("../../../assets/logo-light.png");
const LOGO_DARK = require("../../../assets/logo-dark.png");

type BrandStripProps = {
  /** Hide the hairline divider when the strip sits over a custom header. */
  borderless?: boolean;
  /** Render the notification bell on the right. Default true. */
  showNotifications?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Slim brand bar: AccountE wordmark on the left, notification bell on the
 * right. Picks the light/dark variant of the asset based on the active theme
 * so the wordmark always has good contrast against its background.
 */
export function BrandStrip({
  borderless = false,
  showNotifications = true,
  style,
}: BrandStripProps) {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          // Slightly tinted strip so the wordmark has a backdrop instead of
          // floating against the page background. Goes a little darker in
          // dark mode and a little dimmer in light mode for visible contrast.
          backgroundColor: isDark ? "#1e293b" : "#edf1f6",
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
      {showNotifications && <NotificationBell />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  logo: {
    height: 24,
    width: 132,
  },
});
