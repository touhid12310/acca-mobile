import React from "react";
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { spacing } from "../../constants/theme";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "../../contexts/AuthContext";
import billingService from "../../services/billingService";
import { radius } from "../../constants/theme";

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
  const { isDark, colors } = useTheme();
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
              styles.upgrade,
              { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 },
            ]}
          >
            <Sparkles size={14} color={colors.onPrimary} strokeWidth={2.3} />
            <Text style={[styles.upgradeText, { color: colors.onPrimary }]}>Upgrade</Text>
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
  },
  logo: {
    height: 24,
    width: 132,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  upgrade: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  upgradeText: { fontSize: 12, fontWeight: "800" },
});
