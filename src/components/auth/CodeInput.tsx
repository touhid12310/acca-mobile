import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput as RNTextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../contexts/ThemeContext';
import { NativeTextInput } from '../ui/SafeTextInput';

type CodeInputProps = {
  value: string;
  /** Receives digits only, at most `length` of them. */
  onChangeText: (digits: string) => void;
  length?: number;
  autoFocus?: boolean;
  error?: boolean;
  accessibilityLabel: string;
  onSubmitEditing?: () => void;
  /**
   * Called once when the last digit goes in (typed, pasted or autofilled).
   * The iOS number pad has no return key, so this is how the code submits.
   */
  onComplete?: (digits: string) => void;
};

/**
 * One box per digit over a single real text field, so typing, pasting
 * "123 456" and the keyboard's one-time-code suggestion all just work.
 */
export function CodeInput({
  value,
  onChangeText,
  length = 6,
  autoFocus,
  error,
  accessibilityLabel,
  onSubmitEditing,
  onComplete,
}: CodeInputProps) {
  const { colors, isDark } = useTheme();
  const inputRef = useRef<RNTextInput | null>(null);
  const [focused, setFocused] = useState(false);
  const caret = useSharedValue(1);

  useEffect(() => {
    if (!focused) {
      cancelAnimation(caret);
      return;
    }
    caret.value = withRepeat(
      withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })),
      -1,
      false,
    );
    return () => cancelAnimation(caret);
  }, [focused, caret]);

  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  const digits = value.split('');
  const activeIndex = Math.min(digits.length, length - 1);
  const restBorder = isDark ? colors.outline : '#e2e6ef';

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessible={false} style={styles.row}>
      {Array.from({ length }, (_, i) => {
        const char = digits[i] ?? '';
        const isActive = focused && i === activeIndex && digits.length < length + 1;
        const borderColor = error
          ? colors.error
          : isActive
            ? colors.primary
            : char
              ? isDark
                ? 'rgba(129,140,248,0.55)'
                : 'rgba(99,102,241,0.45)'
              : restBorder;
        return (
          <View
            key={i}
            style={[
              styles.box,
              {
                borderColor,
                backgroundColor: char
                  ? isDark
                    ? 'rgba(129,140,248,0.12)'
                    : '#f5f5ff'
                  : isDark
                    ? colors.surfaceElevated
                    : '#ffffff',
              },
              isActive && {
                boxShadow: isDark
                  ? '0px 0px 0px 4px rgba(129,140,248,0.25)'
                  : '0px 0px 0px 4px rgba(99,102,241,0.14)',
              },
            ]}
          >
            {char ? (
              <Text style={[styles.digit, { color: colors.onSurface }]}>{char}</Text>
            ) : isActive ? (
              <Animated.View
                style={[styles.caret, { backgroundColor: colors.primary }, caretStyle]}
              />
            ) : null}
          </View>
        );
      })}

      <NativeTextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          const cleaned = text.replace(/\D/g, '').slice(0, length);
          onChangeText(cleaned);
          if (onComplete && cleaned.length === length && value.length < length) {
            onComplete(cleaned);
          }
        }}
        // Room for a pasted "123 456" before it is cleaned up.
        maxLength={length + 6}
        keyboardType="number-pad"
        // iOS: adds a Done bar above the number pad, which has no return key.
        returnKeyType={Platform.OS === 'ios' ? 'done' : undefined}
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        autoFocus={autoFocus}
        caretHidden
        contextMenuHidden={false}
        selectionColor="transparent"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmitEditing ? () => onSubmitEditing() : undefined}
        accessibilityLabel={accessibilityLabel}
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  box: {
    flex: 1,
    maxWidth: 56,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: 24,
    fontWeight: '700',
    includeFontPadding: false,
  },
  caret: {
    width: 2,
    height: 26,
    borderRadius: 1,
  },
  // The real input covers the boxes, invisible but still tappable and
  // long-pressable for paste.
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    color: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 1,
    opacity: Platform.OS === 'web' ? 0 : 0.02,
  },
});
