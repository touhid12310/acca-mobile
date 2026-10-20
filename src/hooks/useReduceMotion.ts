import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * True when the user turned on "Reduce motion" (iOS) / "Remove animations"
 * (Android). Starts from Reanimated's synchronous snapshot so the first frame
 * is already right, then follows the setting while the app runs.
 */
export function useReduceMotion(): boolean {
  const initial = useReducedMotion();
  const [reduce, setReduce] = useState(initial);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduce(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduce,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduce;
}
