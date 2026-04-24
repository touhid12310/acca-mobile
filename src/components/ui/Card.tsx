import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, shadow, spacing } from "../../constants/theme";

export type CardVariant = "flat" | "elevated" | "outlined" | "tinted";

interface CardProps {
  variant?: CardVariant;
  padding?: keyof typeof spacing | 0;
  radiusSize?: keyof typeof radius;
  tint?: string;
  gradient?: readonly [string, string] | readonly [string, string, string];
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Card({
  variant = "elevated",
  padding = "lg",
  radiusSize = "xl",
  tint,
  gradient,
  onPress,
  style,
  children,
}: CardProps) {
  const { colors } = useTheme();

  const variantStyle: ViewStyle = (() => {
    switch (variant) {
      case "flat":
        return { backgroundColor: colors.surface };
      case "elevated":
        return { backgroundColor: colors.surface, ...shadow.sm };
      case "outlined":
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.outline,
        };
      case "tinted":
        return { backgroundColor: tint || colors.surfaceVariant };
      default:
        return { backgroundColor: colors.surface };
    }
  })();

  const container: ViewStyle = {
    borderRadius: radius[radiusSize],
    padding: padding === 0 ? 0 : spacing[padding],
    overflow: "hidden",
    ...variantStyle,
  };

  const content = gradient ? (
    <>
      <LinearGradient
        colors={gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </>
  ) : (
    children
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {({ pressed }) => (
          <View style={[container, { opacity: pressed ? 0.9 : 1 }, style]}>
            {content}
          </View>
        )}
      </Pressable>
    );
  }

  return <View style={[container, style]}>{content}</View>;
}
