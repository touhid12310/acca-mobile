import React from "react";
import {
  Platform,
  StyleSheet,
  useWindowDimensions,
  type DimensionValue,
  type ViewStyle,
} from "react-native";
import { Modal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DialogModalProps = React.ComponentProps<typeof Modal>;

const PERCENT_KEYS = ["maxHeight", "minHeight"] as const;

/**
 * react-native-paper's Modal, with percentage heights that work on iOS.
 *
 * On iOS Paper's Surface draws the card as two layers: margins go on the outer
 * one, maxHeight / padding / content on the inner one. A `maxHeight: "70%"` is
 * then 70% of the card itself, so the content is cut to 70% of its own height
 * while the outer layer stays full height as an empty white panel under it.
 * Here a percentage maxHeight / minHeight becomes points of the area the card
 * is centred in (the window less the top / bottom margins Paper keeps clear:
 * the safe-area insets, or what `style` sets, e.g. room for the keyboard) —
 * what it already means on Android, which is passed through untouched.
 */
export default function DialogModal({
  contentContainerStyle,
  style,
  ...props
}: DialogModalProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (Platform.OS !== "ios") {
    return (
      <Modal
        {...props}
        style={style}
        contentContainerStyle={contentContainerStyle}
      />
    );
  }

  const wrapper = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const marginTop =
    typeof wrapper.marginTop === "number" ? wrapper.marginTop : insets.top;
  const marginBottom =
    typeof wrapper.marginBottom === "number"
      ? wrapper.marginBottom
      : insets.bottom;
  const available = height - marginTop - marginBottom;
  const flat = (StyleSheet.flatten(contentContainerStyle as ViewStyle) ??
    {}) as ViewStyle;
  const fixed: ViewStyle = {};
  for (const key of PERCENT_KEYS) {
    const points = percentOf(flat[key], available);
    if (points !== null) fixed[key] = points;
  }

  return (
    <Modal
      {...props}
      style={style}
      contentContainerStyle={[contentContainerStyle, fixed]}
    />
  );
}

function percentOf(value: DimensionValue | undefined, total: number) {
  if (typeof value !== "string" || !value.endsWith("%")) return null;
  const share = parseFloat(value);
  return Number.isFinite(share) ? (total * share) / 100 : null;
}
