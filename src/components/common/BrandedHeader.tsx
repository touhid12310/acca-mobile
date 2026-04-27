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
import { ChevronLeft } from "lucide-react-native";
import { router } from "expo-router";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, spacing } from "../../constants/theme";

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
};

export function BrandedHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  right,
  style,
  showBrand = true,
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
              {title}
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
  brandStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  /* Wordmark sits at a modest height; the asset's intrinsic aspect ratio
     keeps the chevron + "Accounte" text legible without dominating. */
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
