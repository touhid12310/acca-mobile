import React from "react";
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Bell, ChevronLeft } from "lucide-react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, spacing } from "../../constants/theme";
import { BrandText } from "./BrandText";
import notificationService from "../../services/notificationService";

const LOGO_LIGHT = require("../../../assets/logo-light.png");
const LOGO_DARK = require("../../../assets/logo-dark.png");

type BrandedHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Render the wordmark brand strip above the title row. Default true. */
  showBrand?: boolean;
  /** Render the notification bell in the brand strip. Default true. */
  showNotifications?: boolean;
};

/** Bell + unread badge in the brand strip. Opens the notification feed. */
export function NotificationBell() {
  const { colors } = useTheme();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const result = await notificationService.unreadCount();
      if (!result.success || !result.data) return 0;
      const payload = result.data as any;
      return Number(payload.data?.unread_count ?? payload.unread_count ?? 0);
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  return (
    <Pressable
      onPress={() => router.push("/notifications" as any)}
      hitSlop={8}
      style={styles.bellButton}
      accessibilityLabel="Notifications"
    >
      <Bell size={20} color={colors.onSurface} strokeWidth={2} />
      {unreadCount > 0 && (
        <View style={[styles.bellBadge, { backgroundColor: colors.error }]}>
          <Text style={styles.bellBadgeText}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function BrandedHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  right,
  style,
  showBrand = true,
  showNotifications = true,
}: BrandedHeaderProps) {
  const { colors, isDark } = useTheme();

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={[styles.container, style]}>
      {showBrand && (
        <View
          style={[
            styles.brandStrip,
            {
              backgroundColor: isDark ? "#1e293b" : "#edf1f6",
              borderBottomColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.08)",
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <Image
            source={isDark ? LOGO_DARK : LOGO_LIGHT}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          {showNotifications && <NotificationBell />}
        </View>
      )}

      <View style={styles.row}>
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
              <BrandText>{title}</BrandText>
            </Text>
          </View>
        </View>

        {right && <View style={styles.rightSlot}>{right}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Outer container has no horizontal padding so the brand strip can span
     edge-to-edge. The title row applies its own horizontal padding. */
  container: {
    paddingTop: 0,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  /* Logo left, notification bell right. */
  brandStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },
  /* Wordmark sits at a modest height; the asset's intrinsic aspect ratio
     keeps the chevron + "AccountE" text legible without dominating. */
  brandLogo: {
    height: 24,
    width: 132,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
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
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  rightSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
