import React, { useEffect, useId } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

// AccountE hex mark, traced from assets/splash-icon.png (923 × 1054).
const MARK_W = 923;
const MARK_H = 1054;
const UPPER =
  'M461 0L877 240Q922 266 922 300L922 599L461 74L0 598L0 300Q0 266 45 240Z';
const LOWER =
  'M0 647L461 351L922 652L922 760Q922 792 888 812L787 870L461 502L141 880L35 815Q0 794 0 760Z';
const STAR =
  'M466 695Q505.5 840.5 655 880Q504.1 913.4 466 1052Q436.3 905.4 281 876Q436.5 846.5 466 695Z';
// The sparkle sits in its own box so it spins around its own centre.
const STAR_BOX = { x: 281, y: 695, w: 374, h: 357 };

// White "ACCOUNTE" cut from logo-dark.png; letters are 0.817 of the mark's
// height there, with a gap of 0.123 of it.
const WORDMARK = require('../../../assets/logo-wordmark-white.png');
const WORDMARK_RATIO = 1200 / 173;
const LETTER_SCALE = 0.817;
const GAP_SCALE = 0.13;

const INTRO_MS = 1150;
const TWINKLE_MS = 3600;
// Shared beat, so two logos on screen during a cross-fade twinkle together.
const EPOCH = Date.now();

// Soft settle with a touch of overshoot.
const SETTLE = Easing.bezier(0.2, 1.25, 0.4, 1);

type AnimatedLogoProps = {
  /** Height of the hex mark in dp; the wordmark scales with it. */
  height?: number;
  /** Play the entrance. Otherwise the logo starts settled. */
  intro?: boolean;
  /** No entrance and no idle twinkle. */
  reduceMotion?: boolean;
};

/**
 * The AccountE lockup for the auth header: the hex mark builds itself
 * (lower chevron, upper chevron, then the sparkle spins in) while the
 * wordmark wipes in; afterwards the sparkle twinkles every few seconds.
 */
export function AnimatedLogo({
  height = 34,
  intro = true,
  reduceMotion = false,
}: AnimatedLogoProps) {
  const id = `ae${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const markW = (height * MARK_W) / MARK_H;
  const wordH = height * LETTER_SCALE;
  const wordW = wordH * WORDMARK_RATIO;

  const starLeft = (STAR_BOX.x / MARK_W) * markW;
  const starTop = (STAR_BOX.y / MARK_H) * height;
  const starW = (STAR_BOX.w / MARK_W) * markW;
  const starH = (STAR_BOX.h / MARK_H) * height;
  const glowSize = starW * 2.6;

  const animateIn = intro && !reduceMotion;
  const lower = useSharedValue(animateIn ? 0 : 1);
  const upper = useSharedValue(animateIn ? 0 : 1);
  const starIn = useSharedValue(animateIn ? 0 : 1);
  const starSpin = useSharedValue(animateIn ? 0 : 1);
  const word = useSharedValue(animateIn ? 0 : 1);
  const twinkle = useSharedValue(0);

  useEffect(() => {
    const settled = [lower, upper, starIn, starSpin, word];
    if (reduceMotion) {
      settled.forEach((value) => {
        cancelAnimation(value);
        value.value = 1;
      });
      cancelAnimation(twinkle);
      twinkle.value = 0;
      return;
    }

    if (animateIn) {
      lower.value = withDelay(80, withTiming(1, { duration: 560, easing: SETTLE }));
      upper.value = withDelay(210, withTiming(1, { duration: 560, easing: SETTLE }));
      starIn.value = withDelay(
        400,
        withSpring(1, { damping: 9, stiffness: 150, mass: 0.8 }),
      );
      starSpin.value = withDelay(
        400,
        withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) }),
      );
      word.value = withDelay(
        320,
        withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) }),
      );
    }

    // Join the shared beat once the entrance is done.
    const now = Date.now();
    const startAt = now + (animateIn ? INTRO_MS : 0);
    const toBeat = (TWINKLE_MS - ((startAt - EPOCH) % TWINKLE_MS)) % TWINKLE_MS;
    twinkle.value = withDelay(
      startAt - now + toBeat,
      withRepeat(
        withSequence(
          withTiming(1, { duration: TWINKLE_MS, easing: Easing.linear }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );

    return () => {
      settled.forEach((value) => cancelAnimation(value));
      cancelAnimation(twinkle);
    };
    // Shared values are stable; the entrance only runs on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const rise = height * 0.42;
  const lowerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(lower.value, [0, 0.55], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: (1 - lower.value) * rise }],
  }));
  const upperStyle = useAnimatedStyle(() => ({
    opacity: interpolate(upper.value, [0, 0.55], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: (1 - upper.value) * rise }],
  }));
  const starStyle = useAnimatedStyle(() => {
    const t = twinkle.value;
    const pop = interpolate(t, [0, 0.07, 0.18, 1], [1, 1.32, 1, 1], Extrapolation.CLAMP);
    // A four-point star looks the same after 90°, so the loop restarts seamlessly.
    const spin = interpolate(t, [0, 0.22, 1], [0, 90, 90], Extrapolation.CLAMP);
    return {
      opacity: interpolate(starIn.value, [0, 0.35], [0, 1], Extrapolation.CLAMP),
      transform: [
        { rotate: `${(1 - starSpin.value) * -150 + spin}deg` },
        { scale: Math.max(0, starIn.value) * pop },
      ],
    };
  });
  const glowStyle = useAnimatedStyle(() => {
    const t = twinkle.value;
    const flash = interpolate(t, [0, 0.06, 0.3, 1], [0, 0.55, 0, 0], Extrapolation.CLAMP);
    const swell = interpolate(t, [0, 0.08, 0.3, 1], [0, 0.35, 0, 0], Extrapolation.CLAMP);
    return {
      opacity: Math.min(1, Math.max(0, starIn.value)) * (0.4 + flash),
      transform: [{ scale: 0.75 + 0.25 * Math.max(0, starIn.value) + swell }],
    };
  });
  // Transform-only wipe: the window slides right while the letters stay put.
  const wipeWindowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -wordW * (1 - word.value) }],
  }));
  const wipeLettersStyle = useAnimatedStyle(() => ({
    opacity: interpolate(word.value, [0, 0.35], [0.3, 1], Extrapolation.CLAMP),
    transform: [{ translateX: wordW * (1 - word.value) }],
  }));

  const viewBox = `0 0 ${MARK_W} ${MARK_H}`;

  return (
    <View
      style={[styles.lockup, { gap: height * GAP_SCALE }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="AccountE"
    >
      <View style={{ width: markW, height }}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.abs,
            {
              left: starLeft + starW / 2 - glowSize / 2,
              top: starTop + starH / 2 - glowSize / 2,
              width: glowSize,
              height: glowSize,
            },
            glowStyle,
          ]}
        >
          <Svg width={glowSize} height={glowSize}>
            <Defs>
              <RadialGradient id={`${id}glow`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#e0f2fe" stopOpacity={0.95} />
                <Stop offset="0.35" stopColor="#7dd3fc" stopOpacity={0.4} />
                <Stop offset="1" stopColor="#7dd3fc" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle
              cx={glowSize / 2}
              cy={glowSize / 2}
              r={glowSize / 2}
              fill={`url(#${id}glow)`}
            />
          </Svg>
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, lowerStyle]}>
          <Svg width={markW} height={height} viewBox={viewBox}>
            <Defs>
              <LinearGradient id={`${id}lo`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#ffffff" />
                <Stop offset="1" stopColor="#e0e7ff" />
              </LinearGradient>
            </Defs>
            <Path d={LOWER} fill={`url(#${id}lo)`} />
          </Svg>
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, upperStyle]}>
          <Svg width={markW} height={height} viewBox={viewBox}>
            <Defs>
              <LinearGradient id={`${id}up`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#ffffff" />
                <Stop offset="1" stopColor="#eef2ff" />
              </LinearGradient>
            </Defs>
            <Path d={UPPER} fill={`url(#${id}up)`} />
          </Svg>
        </Animated.View>

        <Animated.View
          style={[
            styles.abs,
            { left: starLeft, top: starTop, width: starW, height: starH },
            starStyle,
          ]}
        >
          <Svg
            width={starW}
            height={starH}
            viewBox={`${STAR_BOX.x} ${STAR_BOX.y} ${STAR_BOX.w} ${STAR_BOX.h}`}
          >
            <Defs>
              <LinearGradient id={`${id}star`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#ffffff" />
                <Stop offset="1" stopColor="#bae6fd" />
              </LinearGradient>
            </Defs>
            <Path d={STAR} fill={`url(#${id}star)`} />
          </Svg>
        </Animated.View>
      </View>

      <View style={[styles.wipe, { width: wordW, height: wordH }]}>
        <Animated.View style={[styles.wipe, { width: wordW, height: wordH }, wipeWindowStyle]}>
          <Animated.View style={wipeLettersStyle}>
            <Image
              source={WORDMARK}
              style={{ width: wordW, height: wordH }}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  abs: {
    position: 'absolute',
  },
  wipe: {
    overflow: 'hidden',
  },
});
