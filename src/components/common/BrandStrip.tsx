import React from "react";
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { gradients, spacing } from "../../constants/theme";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "../../contexts/AuthContext";
import billingService from "../../services/billingService";

const LOGO_LIGHT = require("../../../assets/logo-light.png");
const LOGO_DARK = require("../../../assets/logo-dark.png");

/** Pill height; the corner radius is derived from it so it stays a true pill. */
const UPGRADE_HEIGHT = 32;

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
  const { isAuthenticated } = useAuth();
  const billingQuery = useQuery({
    queryKey: ["billing-overview"],
    enabled: isAuthenticated,
    staleTime: 60_000,
    queryFn: async () => {
      const response = await billingService.getOverview();
      if (!response.success || !response.data) return null;
      return "data" in response.data ? response.data.data : response.data;
    },
  });
  const isFree = billingQuery.data?.current_plan?.slug === "free";

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
      <View style={styles.actions}>
        {isFree && (
          <Pressable
            onPress={() => router.push("/billing" as never)}
            style={({ pressed }) => [
              styles.upgradePressable,
              { opacity: pressed ? 0.82 : 1 },
            ]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Upgrade your plan"
          >
            {/* The gradient IS the pill — icon and label are its in-flow
                children. An absolutely-positioned fill behind the label lets
                the two disagree about geometry on Android; sizing the painted
                view to its own content removes that failure mode. */}
            <LinearGradient
              colors={gradients.primary as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.upgrade}
            >
              <Sparkles size={13} color="#ffffff" strokeWidth={2.4} />
              <Text style={styles.upgradeText} numberOfLines={1}>
                Upgrade
              </Text>
            </LinearGradient>
          </Pressable>
        )}
        {showNotifications && <NotificationBell />}
      </View>
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
    gap: spacing.sm,
  },
  logo: {
    height: 24,
    width: 132,
    // On narrow screens the wordmark gives up space, never the actions —
    // otherwise flexbox squeezes the pill narrower than its own label.
    flexShrink: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  upgradePressable: {
    flexShrink: 0,
    borderRadius: UPGRADE_HEIGHT / 2,
  },
  upgrade: {
    height: UPGRADE_HEIGHT,
    paddingHorizontal: spacing.md,
    borderRadius: UPGRADE_HEIGHT / 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  upgradeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.2,
    // Android pads the glyph box, which pushes the label off-centre inside a
    // fixed-height pill.
    includeFontPadding: false,
  },
});
