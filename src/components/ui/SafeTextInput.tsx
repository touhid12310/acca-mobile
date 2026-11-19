import React, {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
} from "react-native";
import { TextInput as PaperTextInputBase } from "react-native-paper";

/**
 * Drop-in replacements for react-native / react-native-paper TextInput.
 *
 * Why: on Android, some keyboards (Xiaomi/Redmi and others) hold the current
 * word as an underlined "composing" region. When a controlled input writes
 * its value back to the native view mid-word, the keyboard loses that region
 * and commits the word a second time ("fr" → "FrFrom").
 *
 * These wrappers keep the native input uncontrolled (defaultValue only), so
 * nothing is written back while the user types. When the parent changes
 * `value` to something the user did not type (form reset, edit prefill, AI
 * fill, input sanitising), the input is remounted with the new text and
 * focus is restored.
 *
 * Sanitising that lands on the value the field already had ("7.99" + "S" →
 * "7.99", QA AE-17) leaves `value` unchanged, so it is caught separately:
 * right after a keystroke, if the parent answered in the same update with its
 * old value, the input is rewritten to that value. Typed text is only ever
 * dropped then — when the parent visibly refused the extra characters — never
 * because a parent is slow to store it (QA AE-123).
 */

type Focusable = { focus?: () => void; setSelection?: (s: number, e: number) => void };

type SyncProps = {
  value?: string;
  defaultValue?: string;
  onChangeText?: (text: string) => void;
  onFocus?: (...args: any[]) => void;
  onBlur?: (...args: any[]) => void;
  keyboardType?: string;
};

// Number pads have no composing region (no "FrFrom" risk), and every amount
// field cleans its input synchronously.
const NUMERIC_KEYBOARDS = new Set(["decimal-pad", "numeric", "number-pad", "phone-pad"]);

/** `typed` is `kept` with extra characters inserted (a refused insertion). */
const isInsertionInto = (kept: string, typed: string): boolean => {
  if (typed.length <= kept.length) return false;
  let k = 0;
  for (let t = 0; t < typed.length && k < kept.length; t += 1) {
    if (typed[t] === kept[k]) k += 1;
  }
  return k === kept.length;
};

function useUncontrolledSync<P extends SyncProps>(
  props: P,
  forwardedRef: React.ForwardedRef<any>,
) {
  const { value, defaultValue, onChangeText, onFocus, onBlur, ...rest } = props;
  const controlled = value !== undefined;

  // Last text we know the native view holds (typed by the user or seeded).
  const nativeText = useRef<string | undefined>(value);
  const focused = useRef(false);
  const restoreFocus = useRef(false);
  const inner = useRef<Focusable | null>(null);
  const [seed, setSeed] = useState<string | undefined>(value);
  const [epoch, setEpoch] = useState(0);

  // What the parent passed at the last render, and the props object itself:
  // a parent that re-renders hands over a new object, one that doesn't (or
  // bails out on an unchanged state) leaves the old one in place.
  const latestValue = useRef<string | undefined>(value);
  const latestProps = useRef<P>(props);
  const keystroke = useRef<{ valueBefore: string | undefined; propsBefore: P } | null>(null);
  const [keystrokeTick, setKeystrokeTick] = useState(0);

  const remountWith = (next: string | undefined) => {
    nativeText.current = next;
    restoreFocus.current = focused.current;
    setSeed(next);
    setEpoch((e) => e + 1);
  };

  // Parent set a value the user didn't type → remount with it.
  useLayoutEffect(() => {
    if (!controlled || value === nativeText.current) return;
    remountWith(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlled, value]);

  // Right after a keystroke: did the parent keep its old value although the
  // field now shows something else? Then it refused the new characters
  // (sanitising), so show what it kept.
  useLayoutEffect(() => {
    const pending = keystroke.current;
    keystroke.current = null;
    if (!pending || !controlled) return;
    const typed = nativeText.current ?? "";
    if (value === typed) return; // taken as typed
    if (value !== pending.valueBefore) return; // changed → handled above
    const parentAnswered = props !== pending.propsBefore;
    const numeric = NUMERIC_KEYBOARDS.has(String(props.keyboardType ?? ""));
    // No answer at all could just be a slower parent: keep the typed text.
    if (!parentAnswered && !numeric) return;
    if (!isInsertionInto(value ?? "", typed)) return;
    remountWith(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keystrokeTick]);

  useLayoutEffect(() => {
    latestValue.current = value;
    latestProps.current = props;
  });

  useLayoutEffect(() => {
    if (epoch === 0 || !restoreFocus.current) return;
    restoreFocus.current = false;
    inner.current?.focus?.();
    const end = seed?.length ?? 0;
    inner.current?.setSelection?.(end, end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epoch]);

  const setRef = useCallback(
    (instance: any) => {
      inner.current = instance;
      if (typeof forwardedRef === "function") forwardedRef(instance);
      else if (forwardedRef) forwardedRef.current = instance;
    },
    [forwardedRef],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      nativeText.current = text;
      // Remember what the parent held before the first of a burst of
      // keystrokes; the check runs once the parent's answer has rendered
      // (its state update and this one land in the same render).
      if (!keystroke.current) {
        keystroke.current = {
          valueBefore: latestValue.current,
          propsBefore: latestProps.current,
        };
      }
      onChangeText?.(text);
      setKeystrokeTick((n) => n + 1);
    },
    [onChangeText],
  );

  const handleFocus = useCallback(
    (...args: any[]) => {
      focused.current = true;
      onFocus?.(...args);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (...args: any[]) => {
      focused.current = false;
      onBlur?.(...args);
    },
    [onBlur],
  );

  return {
    key: epoch,
    ...rest,
    ref: setRef,
    defaultValue: controlled ? seed : defaultValue,
    onChangeText: handleChangeText,
    onFocus: handleFocus,
    onBlur: handleBlur,
  };
}

export const NativeTextInput = forwardRef<RNTextInput, RNTextInputProps>(
  function NativeTextInput(props, ref) {
    const { key, ...inputProps } = useUncontrolledSync(props, ref);
    return <RNTextInput key={key} {...(inputProps as RNTextInputProps)} />;
  },
);

type PaperProps = React.ComponentProps<typeof PaperTextInputBase>;

const PaperTextInputInner = forwardRef<any, PaperProps>(
  function PaperTextInput(props, ref) {
    const { key, ...inputProps } = useUncontrolledSync(props, ref);
    return <PaperTextInputBase key={key} {...(inputProps as PaperProps)} />;
  },
);

export const PaperTextInput = Object.assign(PaperTextInputInner, {
  Icon: PaperTextInputBase.Icon,
  Affix: PaperTextInputBase.Affix,
});
