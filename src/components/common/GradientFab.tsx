import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { gradients, shadow, spacing } from "../../constants/theme";

const SIZE = 56;

/**
 * The round brand-gradient "+" button floating bottom right (Activity,
 * Accounts), kept clear of the home indicator / navigation bar.
 *
 * Every layer has an explicit size: on iOS a `flex: 1` Pressable inside the
 * absolutely placed button didn't fill it, so only the top half of the circle
 * was drawn. On Android a Pressable with a style function (and a borderless
 * ripple) wasn't laid out at all — the gradient showed as an unclipped square
 * over the top half and the "+" sat in a corner — and an absolute-fill one
 * only got its width. So a plain view clips the circle, the gradient fills it,
 * and the Pressable has a static 56×56 style; iOS dims the "+" while pressed
 * through the children function instead. The shadow sits on the outer view,
 * which doesn't clip — iOS drops shadows on a view with `overflow: hidden`.
 */
export default function GradientFab({
  onPress,
  accessibilityLabel,
}: {
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.fab, { bottom: 20 + insets.bottom }, shadow.lg]}>
      <View style={styles.clip}>
        <LinearGradient
          colors={gradients.primary as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={styles.pressable}
          android_ripple={{ color: "rgba(255,255,255,0.25)" }}
        >
          {({ pressed }) => (
            <View style={Platform.OS === "ios" && pressed ? styles.pressed : undefined}>
              <Plus size={26} color="#ffffff" strokeWidth={2.6} />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: gradients.primary[0],
  },
  clip: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: "hidden",
  },
  pressable: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
});
