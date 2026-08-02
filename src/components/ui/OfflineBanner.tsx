import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import NetInfo from "@react-native-community/netinfo";
import { WifiOff } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, spacing } from "../../constants/theme";

const ANIM_MS = 200;

export function OfflineBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOffline =
        state.isConnected === false || state.isInternetReachable === false;
      setOffline(isOffline);
    });
    return () => unsubscribe();
  }, []);

  // Mount state has to live in React, not in the shared value. Reading
  // `opacity.value` during render never subscribed to anything — the banner only
  // unmounted if some other state change happened to re-render us — and it trips
  // Reanimated's strict-mode "reading `value` during render" warning.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (offline) {
      setMounted(true);
    }
  }, [offline]);

  useEffect(() => {
    if (!mounted) return;

    translateY.value = withTiming(offline ? 0 : -60, {
      duration: ANIM_MS,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(
      offline ? 1 : 0,
      { duration: ANIM_MS },
      (finished) => {
        // Stay mounted until the exit animation has actually played out.
        if (finished && !offline) {
          runOnJS(setMounted)(false);
        }
      },
    );
  }, [mounted, offline, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents={offline ? "auto" : "none"}
      style={[
        styles.host,
        { paddingTop: insets.top + spacing.xs },
        animatedStyle,
      ]}
    >
      <View
        style={[styles.banner, { backgroundColor: colors.warningContainer }]}
      >
        <WifiOff
          size={16}
          color={colors.onWarningContainer}
          strokeWidth={2.4}
        />
        <Text style={[styles.text, { color: colors.onWarningContainer }]}>
          You are offline — changes will retry when connection returns
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    zIndex: 9998,
    elevation: 9998,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignSelf: "center",
    maxWidth: 480,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
});
