import React from 'react';
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../hooks/useReduceMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 16, stiffness: 320, mass: 0.6 };

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Scale while held down. */
  scaleTo?: number;
};

/**
 * Pressable that dips a little while held and springs back on release.
 * With reduce motion on it dims instead of scaling.
 */
export function PressableScale({
  scaleTo = 0.97,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReduceMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - pressed.value * 0.25 }
      : { transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }] },
  );

  const handlePressIn = (event: GestureResponderEvent) => {
    pressed.value = reduceMotion
      ? withTiming(1, { duration: 80 })
      : withSpring(1, SPRING);
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    pressed.value = reduceMotion
      ? withTiming(0, { duration: 120 })
      : withSpring(0, SPRING);
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    />
  );
}
