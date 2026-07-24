import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LucideIcon } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, spacing, shadow, gradients } from "../../constants/theme";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "destructive"
  | "success";

export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  loading,
  disabled,
  fullWidth,
  style,
  textStyle,
}: ButtonProps) {
  const { colors, isDark } = useTheme();

  const sizeStyles = {
    sm: {
      height: 36,
      paddingHorizontal: spacing.md,
      fontSize: 13,
      iconSize: 16,
    },
    md: {
      height: 46,
      paddingHorizontal: spacing.lg,
      fontSize: 15,
      iconSize: 18,
    },
    lg: {
      height: 54,
      paddingHorizontal: spacing.xl,
      fontSize: 16,
      iconSize: 20,
    },
  }[size];

  const isGradient = variant === "primary";
  const bgColor = {
    primary: "transparent",
    secondary: colors.surfaceVariant,
    ghost: "transparent",
    outline: "transparent",
    destructive: colors.error,
    success: colors.tertiary,
  }[variant];

  const fgColor = {
    primary: "#ffffff",
    secondary: colors.onSurface,
    ghost: colors.primary,
    outline: colors.primary,
    destructive: "#ffffff",
    success: "#ffffff",
  }[variant];

  const borderColor = variant === "outline" ? colors.primary : "transparent";
  const borderWidth = variant === "outline" ? 1.5 : 0;

  const content = (
    <View
      style={[
        styles.inner,
        {
          height: sizeStyles.height,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fgColor} />
      ) : (
        <>
          {Icon && (
            <Icon
              size={sizeStyles.iconSize}
              color={fgColor}
              strokeWidth={2.2}
            />
          )}
          <Text
            style={[
              styles.label,
              { color: fgColor, fontSize: sizeStyles.fontSize },
              textStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {IconRight && (
            <IconRight
              size={sizeStyles.iconSize}
              color={fgColor}
              strokeWidth={2.2}
            />
          )}
        </>
      )}
    </View>
  );

  const hasShadow =
    isGradient || variant === "destructive" || variant === "success";

  // Single view, explicit fixed height. NOT `overflow: hidden` — on Android
  // that clips the elevation shadow into a rectangle behind the rounded pill.
  // The gradient/colour fill below carries its own borderRadius, so the corners
  // stay round without clipping the parent (which also kept the height sane).
  const baseStyle: ViewStyle = {
    height: sizeStyles.height,
    minHeight: sizeStyles.height,
    maxHeight: sizeStyles.height,
    minWidth: fullWidth ? undefined : 88,
    width: fullWidth ? "100%" : undefined,
    backgroundColor: isGradient ? colors.primary : bgColor,
    borderColor,
    borderWidth,
    opacity: disabled ? 0.5 : 1,
    alignSelf: fullWidth ? "stretch" : "flex-start",
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.container,
        baseStyle,
        hasShadow ? shadow.sm : null,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}
    >
      {isGradient ? (
        <LinearGradient
          colors={(isDark ? gradients.primaryDark : gradients.primary) as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        />
      ) : (
        <View
          pointerEvents="none"
          style={[
            styles.fill,
            { backgroundColor: bgColor, borderColor, borderWidth },
          ]}
        />
      )}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  inner: {
    // No width:"100%": when the button auto-sizes to its label, a 100% width
    // collapses to the min width and truncates the text (numberOfLines={1}).
    // The container centres this row, so alignment is unaffected.
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  label: {
    fontWeight: "600",
    letterSpacing: 0.1,
    textAlign: "center",
  },
});
