import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  cancelAnimation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { ChevronLeft } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { gradients } from '../../constants/theme';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { AnimatedLogo } from './AnimatedLogo';
import { PressableScale } from './PressableScale';

/** How far the sheet rides up over the header. */
const SHEET_OVERLAP = 30;
/** How much of the second card shows above the sheet. */
const PEEK = 12;

// Auth screens on screen right now. Only the first one plays the entrance,
// so moving between sign in, sign up and forgot password cross-fades the
// sheet content under a header that stays put.
let mountedShells = 0;

type AuthMotion = { intro: boolean; reduceMotion: boolean };
const AuthMotionContext = createContext<AuthMotion>({
  intro: false,
  reduceMotion: false,
});
export const useAuthMotion = () => useContext(AuthMotionContext);

export type AuthPrompt = {
  /** Short line before the pill, e.g. "Don't have an account?". */
  text: string;
  /** Pill label, e.g. "Get started". */
  action: string;
  onPress: () => void;
};

type AuthShellProps = {
  children: ReactNode;
  /** Header shortcut on the right (sign in ↔ sign up). */
  prompt?: AuthPrompt;
  /** Shows the back chevron. Leave out on the first screen of the stack. */
  onBack?: () => void;
  /** Centre the sheet content vertically (loading / status screens). */
  centered?: boolean;
};

/**
 * Layout for the signed-out screens: brand gradient header with the animated
 * logo, and a rounded sheet (with a second card peeking behind it) that
 * slides up over the header. Children are the sheet content.
 */
export function AuthShell({ children, prompt, onBack, centered }: AuthShellProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [intro] = useState(() => mountedShells === 0);
  // While the sheet is still sliding in, staggered content waits for it;
  // anything that mounts later (a new panel, an error) comes in right away.
  const [introActive, setIntroActive] = useState(intro);

  useEffect(() => {
    mountedShells += 1;
    return () => {
      // Clamped: a Fast Refresh in development resets the counter mid-session.
      mountedShells = Math.max(0, mountedShells - 1);
    };
  }, []);

  useEffect(() => {
    if (!introActive) return;
    const timer = setTimeout(() => setIntroActive(false), 900);
    return () => clearTimeout(timer);
  }, [introActive]);

  const motion = useMemo(
    () => ({ intro: introActive, reduceMotion }),
    [introActive, reduceMotion],
  );

  const animateIn = intro && !reduceMotion;
  const sheet = useSharedValue(animateIn ? 1 : 0);
  const peek = useSharedValue(animateIn ? 1 : 0);

  useEffect(() => {
    if (!animateIn) return;
    peek.value = withTiming(0, { duration: 560, easing: Easing.out(Easing.cubic) });
    sheet.value = withDelay(
      70,
      withTiming(0, { duration: 640, easing: Easing.out(Easing.cubic) }),
    );
    // Entrance only; shared values are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: 1 - sheet.value,
    transform: [{ translateY: sheet.value * 110 }],
  }));
  const peekStyle = useAnimatedStyle(() => ({
    opacity: 1 - peek.value,
    transform: [{ translateY: peek.value * 60 }],
  }));

  // The status bar icons are white. As soon as the page scrolls, a strip in
  // the header colours fades in behind them, so neither the header row nor
  // the white sheet ever sits under the clock.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [6, 42], [0, 1], Extrapolation.CLAMP),
  }));

  const headerColors = isDark ? gradients.authHeaderNight : gradients.authHeader;
  const sheetColor = colors.surface;
  const logoHeight = width < 360 ? 30 : 34;

  return (
    <View style={[styles.root, { backgroundColor: sheetColor }]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {/* Paints the iOS pull-down bounce in the header colour. */}
          <View style={[styles.overscroll, { backgroundColor: headerColors[0] }]} />

          <LinearGradient
            colors={headerColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { paddingTop: insets.top + 6 }]}
          >
            <HeaderGlows isDark={isDark} reduceMotion={reduceMotion} />

            <View style={styles.topRow}>
              {onBack ? (
                <PressableScale
                  onPress={onBack}
                  hitSlop={8}
                  scaleTo={0.9}
                  style={styles.back}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <ChevronLeft size={22} color="#ffffff" strokeWidth={2.4} />
                </PressableScale>
              ) : (
                <View style={styles.backSpacer} />
              )}
              {prompt ? (
                <View style={styles.prompt}>
                  <Text style={styles.promptText} numberOfLines={1}>
                    {prompt.text}
                  </Text>
                  <PressableScale
                    onPress={prompt.onPress}
                    hitSlop={8}
                    scaleTo={0.93}
                    style={styles.pill}
                    accessibilityRole="button"
                  >
                    <Text style={styles.pillText} numberOfLines={1}>
                      {prompt.action}
                    </Text>
                  </PressableScale>
                </View>
              ) : null}
            </View>

            <View style={styles.logoArea}>
              <AnimatedLogo height={logoHeight} intro={intro} reduceMotion={reduceMotion} />
            </View>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.peek,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.09)'
                    : 'rgba(255,255,255,0.3)',
                },
                peekStyle,
              ]}
            />
          </LinearGradient>

          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: sheetColor, paddingBottom: insets.bottom + 28 },
              sheetStyle,
            ]}
          >
            <View style={[styles.content, centered && styles.contentCentered]}>
              <AuthMotionContext.Provider value={motion}>{children}</AuthMotionContext.Provider>
            </View>
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      <Animated.View
        pointerEvents="none"
        style={[styles.scrim, { height: insets.top }, scrimStyle]}
      >
        <LinearGradient
          colors={[headerColors[0], headerColors[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

type RevealProps = {
  /** Position in the stagger; each step waits a little longer. */
  index?: number;
  /** Fixed delay in ms instead of the stagger (e.g. 0 for error banners). */
  delay?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Fades its children up into place when they mount, staggered by index. */
export function Reveal({ index = 0, delay, children, style }: RevealProps) {
  const { intro, reduceMotion } = useAuthMotion();
  const entering = reduceMotion
    ? undefined
    : FadeInDown.duration(delay === 0 ? 260 : 460)
        .delay(delay ?? (intro ? 320 : 50) + index * 60)
        .easing(Easing.out(Easing.cubic))
        .withInitialValues({ opacity: 0, transform: [{ translateY: delay === 0 ? 8 : 18 }] });

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}

/** Two soft lights drifting across the header. */
function HeaderGlows({ isDark, reduceMotion }: { isDark: boolean; reduceMotion: boolean }) {
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(drift);
      drift.value = 0;
      return;
    }
    drift.value = withRepeat(
      withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(drift);
  }, [reduceMotion, drift]);

  const lightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value * -22 }, { translateY: drift.value * 12 }],
  }));
  const blushStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value * 26 }, { translateY: drift.value * -10 }],
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.glowLight, lightStyle]}>
        <Svg width={280} height={280}>
          <Defs>
            <RadialGradient id={`${id}l`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={isDark ? 0.13 : 0.28} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={140} cy={140} r={140} fill={`url(#${id}l)`} />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.glowBlush, blushStyle]}>
        <Svg width={260} height={260}>
          <Defs>
            <RadialGradient id={`${id}b`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#a78bfa" stopOpacity={isDark ? 0.22 : 0.3} />
              <Stop offset="1" stopColor="#a78bfa" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={130} cy={130} r={130} fill={`url(#${id}b)`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  overscroll: {
    position: 'absolute',
    top: -1000,
    left: 0,
    right: 0,
    height: 1000,
  },
  header: {
    overflow: 'hidden',
  },
  topRow: {
    minHeight: 40,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  backSpacer: { width: 40, height: 40 },
  prompt: {
    flexShrink: 1,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promptText: {
    flexShrink: 1,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    fontWeight: '500',
  },
  pill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  pillText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  logoArea: {
    alignItems: 'center',
    paddingTop: 34,
    paddingBottom: 40 + SHEET_OVERLAP + PEEK,
  },
  peek: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    height: SHEET_OVERLAP + PEEK,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  sheet: {
    flexGrow: 1,
    marginTop: -SHEET_OVERLAP,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 16,
  },
  contentCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  glowLight: {
    position: 'absolute',
    top: -120,
    right: -80,
  },
  glowBlush: {
    position: 'absolute',
    bottom: -130,
    left: -100,
  },
});
