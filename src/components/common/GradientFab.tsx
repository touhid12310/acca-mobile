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
 * was drawn. The shadow sits on the outer view, which doesn't clip — iOS drops
 * shadows on a view with `overflow: hidden` — and the inner one clips the
 * gradient and the Android ripple to the circle.
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
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        // iOS ignores android_ripple, so dim the button while pressed there.
        style={({ pressed }) => [
          styles.pressable,
          Platform.OS === "ios" && pressed && { opacity: 0.85 },
        ]}
        android_ripple={{
          color: "rgba(255,255,255,0.25)",
          borderless: true,
          radius: SIZE / 2,
        }}
      >
        <LinearGradient
          colors={gradients.primary as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Plus size={26} color="#ffffff" strokeWidth={2.6} />
      </Pressable>
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
  pressable: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
