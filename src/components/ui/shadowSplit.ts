import { Platform, StyleProp, StyleSheet, ViewStyle } from "react-native";

// Keys that place / size the card in its parent, plus its paint (background,
// shadow). They go on the outer view; everything else lays out the children.
const OUTER_KEYS = new Set<string>([
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginStart",
  "marginEnd",
  "marginHorizontal",
  "marginVertical",
  "marginBlock",
  "marginBlockStart",
  "marginBlockEnd",
  "marginInline",
  "marginInlineStart",
  "marginInlineEnd",
  "position",
  "top",
  "bottom",
  "left",
  "right",
  "start",
  "end",
  "inset",
  "insetBlock",
  "insetBlockStart",
  "insetBlockEnd",
  "insetInline",
  "insetInlineStart",
  "insetInlineEnd",
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignSelf",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "aspectRatio",
  "display",
  "zIndex",
  "opacity",
  "transform",
  "transformOrigin",
  "backgroundColor",
  "shadowColor",
  "shadowOffset",
  "shadowOpacity",
  "shadowRadius",
  "elevation",
  "boxShadow",
]);

// Rounded corners are needed on both: the outer view shapes the shadow and
// background, the inner one clips the children.
const RADIUS_KEYS = new Set<string>([
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderTopStartRadius",
  "borderTopEndRadius",
  "borderBottomStartRadius",
  "borderBottomEndRadius",
  "borderStartStartRadius",
  "borderStartEndRadius",
  "borderEndStartRadius",
  "borderEndEndRadius",
  "borderCurve",
]);

/**
 * iOS draws the shadow* props on the view's own layer, so `overflow: "hidden"`
 * on that same view clips the shadow away (Android's `elevation` is drawn
 * outside the clip). For a style with both, this returns an outer style that
 * carries the shadow and an inner one that keeps the clip. Returns null when
 * one view is enough (Android, no shadow, or no clipping).
 */
export function splitShadowStyle(
  style: StyleProp<ViewStyle>
): { outer: ViewStyle; inner: ViewStyle } | null {
  if (Platform.OS !== "ios") return null;

  const flat = StyleSheet.flatten(style) || {};
  if (!flat.shadowOpacity || flat.overflow !== "hidden") return null;

  const outer: Record<string, unknown> = {};
  // The inner view fills the outer one when that has a set size or flex.
  const inner: Record<string, unknown> = { flexGrow: 1, flexShrink: 1 };
  for (const [key, value] of Object.entries(flat)) {
    if (RADIUS_KEYS.has(key)) {
      outer[key] = value;
      inner[key] = value;
    } else if (OUTER_KEYS.has(key)) {
      outer[key] = value;
    } else {
      inner[key] = value;
    }
  }

  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}
