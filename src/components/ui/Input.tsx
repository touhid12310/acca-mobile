import React, { useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Eye, EyeOff, LucideIcon } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, spacing } from "../../constants/theme";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
  style?: StyleProp<ViewStyle>;
  secureToggleable?: boolean;
}

export function Input({
  label,
  error,
  helper,
  icon: Icon,
  rightIcon: RightIcon,
  onRightIconPress,
  secureToggleable,
  secureTextEntry,
  style,
  ...rest
}: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  const borderColor = error
    ? colors.error
    : focused
      ? colors.primary
      : colors.outline;

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surfaceVariant,
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
          },
        ]}
      >
        {Icon && (
          <Icon size={18} color={focused ? colors.primary : colors.onSurfaceVariant} strokeWidth={2} />
        )}
        <TextInput
          {...rest}
          secureTextEntry={secureToggleable ? hidden : secureTextEntry}
          placeholderTextColor={colors.onSurfaceVariant}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, { color: colors.onSurface }]}
        />
        {secureToggleable ? (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={8}>
            {hidden ? (
              <Eye size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
            ) : (
              <EyeOff size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
            )}
          </Pressable>
        ) : RightIcon ? (
          <Pressable onPress={onRightIconPress} hitSlop={8}>
            <RightIcon size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
      {(error || helper) && (
        <Text
          style={[
            styles.helper,
            { color: error ? colors.error : colors.onSurfaceVariant },
          ]}
        >
          {error || helper}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    height: 52,
    borderRadius: radius.lg,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    fontWeight: "500",
  },
  helper: {
    fontSize: 12,
    marginLeft: 4,
  },
});
