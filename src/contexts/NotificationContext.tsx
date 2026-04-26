import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Toast, ToastItem } from "../components/ui/Toast";
import { spacing } from "../constants/theme";
import type { AlertTone } from "../components/ui/AlertBar";

const MAX_VISIBLE = 3;

type ToastInput = Omit<ToastItem, "id"> & { id?: string };

interface NotificationContextValue {
  show: (input: ToastInput) => string;
  success: (message: string, opts?: Partial<ToastInput>) => string;
  error: (message: string, opts?: Partial<ToastInput>) => string;
  warning: (message: string, opts?: Partial<ToastInput>) => string;
  info: (message: string, opts?: Partial<ToastInput>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Imperative handle so providers that sit above NotificationProvider in the
// tree (e.g. AuthContext) can still surface toasts without using the hook.
let externalHandle: NotificationContextValue | null = null;
export const notifyToast = {
  show: (input: ToastInput) => externalHandle?.show(input),
  success: (message: string, opts?: Partial<ToastInput>) =>
    externalHandle?.success(message, opts),
  error: (message: string, opts?: Partial<ToastInput>) =>
    externalHandle?.error(message, opts),
  warning: (message: string, opts?: Partial<ToastInput>) =>
    externalHandle?.warning(message, opts),
  info: (message: string, opts?: Partial<ToastInput>) =>
    externalHandle?.info(message, opts),
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((t) => t.id === id);
      target?.onDismiss?.();
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const dismissAll = useCallback(() => {
    setItems([]);
  }, []);

  const show = useCallback((input: ToastInput) => {
    counterRef.current += 1;
    const id = input.id ?? `toast-${Date.now()}-${counterRef.current}`;
    const toast: ToastItem = { tone: "info", ...input, id };
    setItems((prev) => {
      const next = [...prev, toast];
      return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
    });
    return id;
  }, []);

  const helper =
    (tone: AlertTone) =>
    (message: string, opts: Partial<ToastInput> = {}) =>
      show({ ...opts, tone, message });

  const value = useMemo<NotificationContextValue>(
    () => ({
      show,
      success: helper("success"),
      error: helper("error"),
      warning: helper("warning"),
      info: helper("info"),
      dismiss,
      dismissAll,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [show, dismiss, dismissAll],
  );

  useEffect(() => {
    externalHandle = value;
    return () => {
      if (externalHandle === value) externalHandle = null;
    };
  }, [value]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={[
          styles.host,
          { paddingTop: insets.top + spacing.sm },
        ]}
      >
        {items.map((item) => (
          <Toast key={item.id} item={item} onClose={dismiss} />
        ))}
      </View>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}

export const useToast = useNotifications;

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    zIndex: 9999,
    elevation: 9999,
  },
});
