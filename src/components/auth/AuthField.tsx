import React, { ReactNode, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AlertCircle, Eye, EyeOff } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { NativeTextInput } from '../ui/SafeTextInput';

export type AuthFieldHandle = { focus: () => void; blur: () => void };

type FocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
type BlurEvent = Parameters<NonNullable<TextInputProps['onBlur']>>[0];

type AuthFieldProps = Omit<TextInputProps, 'style'> & {
  /** Small label inside the box, top-left. */
  label: string;
  error?: string;
  /** Adds the show / hide eye to a secureTextEntry field. */
  secureToggleable?: boolean;
  /** Extra content on the right, before the eye (e.g. strength meter). */
  accessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Outlined text field with its label inside the box. The border and label
 * take the brand colour on focus and a soft ring fades in around the box.
 */
export const AuthField = forwardRef<AuthFieldHandle, AuthFieldProps>(function AuthField(
  { label, error, secureToggleable, secureTextEntry, accessory, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors, isDark } = useTheme();
  const inputRef = useRef<RNTextInput | null>(null);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const focus = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
  }));

  const restBorder = isDark ? colors.outline : '#e2e6ef';
  const ringColor = error
    ? isDark
      ? 'rgba(248,113,113,0.22)'
      : 'rgba(239,68,68,0.14)'
    : isDark
      ? 'rgba(129,140,248,0.28)'
      : 'rgba(99,102,241,0.16)';

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? colors.error
      : interpolateColor(focus.value, [0, 1], [restBorder, colors.primary]),
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: error ? Math.max(0.6, focus.value) : focus.value,
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: error
      ? colors.error
      : interpolateColor(focus.value, [0, 1], [colors.onSurfaceVariant, colors.primary]),
  }));

  const handleFocus = (e: FocusEvent) => {
    focus.value = withTiming(1, { duration: 180 });
    onFocus?.(e);
  };
  const handleBlur = (e: BlurEvent) => {
    focus.value = withTiming(0, { duration: 220 });
    onBlur?.(e);
  };

  return (
    <View style={style}>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessible={false}
        style={styles.pressArea}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { borderColor: ringColor }, ringStyle]}
        />
        <Animated.View
          style={[
            styles.box,
            { backgroundColor: isDark ? colors.surfaceElevated : '#ffffff' },
            boxStyle,
          ]}
        >
          <View style={styles.textCol}>
            <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
              {label}
            </Animated.Text>
            <NativeTextInput
              ref={inputRef}
              {...rest}
              accessibilityLabel={rest.accessibilityLabel ?? label}
              secureTextEntry={secureToggleable ? hidden : secureTextEntry}
              placeholderTextColor={isDark ? '#5f7896' : '#a3acbd'}
              selectionColor={colors.primary}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={[styles.input, { color: colors.onSurface }]}
            />
          </View>
          {accessory}
          {secureToggleable ? (
            <Pressable
              onPress={() => setHidden((v) => !v)}
              hitSlop={10}
              style={styles.eye}
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            >
              {hidden ? (
                <Eye size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
              ) : (
                <EyeOff size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
              )}
            </Pressable>
          ) : null}
        </Animated.View>
      </Pressable>
      {error ? (
        <Animated.View entering={FadeIn.duration(180)} style={styles.errorRow}>
          <AlertCircle size={14} color={colors.error} strokeWidth={2.2} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  pressArea: {
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    borderWidth: 4,
  },
  box: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: Platform.OS === 'ios' ? 4 : 1,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: 24,
    includeFontPadding: false,
  },
  eye: {
    padding: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12.5,
    flexShrink: 1,
  },
});
