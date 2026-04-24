import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle, StyleProp } from "react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { radius } from "../../constants/theme";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  rounded?: keyof typeof radius | number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = "100%",
  height = 16,
  rounded = "md",
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const borderRadius = typeof rounded === "number" ? rounded : radius[rounded];

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceVariant,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {},
});
