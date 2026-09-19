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
 */

type Focusable = { focus?: () => void; setSelection?: (s: number, e: number) => void };

type SyncProps = {
  value?: string;
  defaultValue?: string;
  onChangeText?: (text: string) => void;
  onFocus?: (...args: any[]) => void;
  onBlur?: (...args: any[]) => void;
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

  // Parent set a value the user didn't type → remount with it.
  useLayoutEffect(() => {
    if (!controlled || value === nativeText.current) return;
    nativeText.current = value;
    restoreFocus.current = focused.current;
    setSeed(value);
    setEpoch((e) => e + 1);
  }, [controlled, value]);

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
      onChangeText?.(text);
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
