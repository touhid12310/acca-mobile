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
    <View style={styles.inner}>
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

  const baseStyle: ViewStyle = {
    height: sizeStyles.height,
    minHeight: sizeStyles.height,
    minWidth: fullWidth ? undefined : 88,
    width: fullWidth ? "100%" : undefined,
    paddingHorizontal: sizeStyles.paddingHorizontal,
    borderColor,
    borderWidth,
    opacity: disabled ? 0.5 : 1,
    alignSelf: fullWidth ? "stretch" : "flex-start",
    overflow: "hidden",
  };

  if (isGradient) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.container,
          baseStyle,
          shadow.sm,
          { overflow: "hidden", transform: [{ scale: pressed ? 0.97 : 1 }] },
          style,
        ]}
      >
        <LinearGradient
          colors={(isDark ? gradients.primaryDark : gradients.primary) as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.container,
        baseStyle,
        variant === "destructive" || variant === "success"
          ? shadow.sm
          : undefined,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: bgColor,
            borderColor,
            borderWidth,
            borderRadius: radius.pill,
          },
        ]}
      />
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
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
