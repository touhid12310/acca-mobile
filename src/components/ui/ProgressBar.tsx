import React from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../../contexts/ThemeContext";
import { radius } from "../../constants/theme";
import { gradients } from "../../constants/theme";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  gradient?: readonly [string, string];
  track?: string;
  height?: number;
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  value,
  max = 100,
  color,
  gradient,
  track,
  height = 8,
  rounded = true,
  style,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const fillColor = color || colors.primary;

  const defaultGradient = gradient || (gradients.primary as unknown as readonly [string, string]);

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: track || colors.surfaceVariant,
          height,
          borderRadius: rounded ? radius.pill : 0,
        },
        style,
      ]}
    >
      {gradient ? (
        <View style={[styles.fill, { width: `${pct}%`, borderRadius: rounded ? radius.pill : 0 }]}>
          <LinearGradient
            colors={defaultGradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : (
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              backgroundColor: fillColor,
              borderRadius: rounded ? radius.pill : 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    overflow: "hidden",
  },
});
