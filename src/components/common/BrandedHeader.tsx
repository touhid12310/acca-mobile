import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { spacing } from "../../constants/theme";
import { ScreenHeader } from "../ui/ScreenHeader";
import { BrandStrip } from "./BrandStrip";

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
  /**
   * Apply the standard 16px horizontal inset to the title row. Default true.
   * Pass false when the header sits inside an already-padded container (most
   * screens pad their ScrollView contentContainer) — otherwise the padding
   * stacks and the header hangs to the right of the cards below it.
   */
  inset?: boolean;
};

/**
 * Brand strip (wordmark + bell) above a standard ScreenHeader. The title row is
 * ScreenHeader itself, so a page using BrandedHeader and a page using
 * ScreenHeader directly render pixel-identical eyebrows and titles.
 */
export function BrandedHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  right,
  style,
  showBrand = true,
  showNotifications = true,
  inset = true,
}: BrandedHeaderProps) {
  return (
    <View style={style}>
      {showBrand && <BrandStrip showNotifications={showNotifications} />}
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        showBack={showBack}
        onBack={onBack}
        right={right}
        style={inset ? styles.inset : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inset: {
    paddingHorizontal: spacing.lg,
  },
});
