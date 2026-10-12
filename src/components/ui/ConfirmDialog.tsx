import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LucideIcon } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, shadow, spacing } from "../../constants/theme";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  icon: LucideIcon;
  cancelLabel?: string;
  confirmLabel: string;
  loading?: boolean;
  /** "danger" (default) for deletes / archives; "primary" for neutral prompts. */
  tone?: "danger" | "primary";
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  icon: Icon,
  cancelLabel = "Cancel",
  confirmLabel,
  loading,
  tone = "danger",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const isDanger = tone === "danger";
  const accent = isDanger ? colors.error : colors.primary;
  const accentContainer = isDanger
    ? colors.errorContainer
    : colors.primaryContainer;
  const confirmBackground = isDanger ? "#ef4444" : "#6366f1";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface }, shadow.lg]}
          onPress={(event) => event.stopPropagation()}
        >
          <View
            style={[styles.iconWrap, { backgroundColor: accentContainer }]}
          >
            <Icon size={28} color={accent} strokeWidth={2.2} />
          </View>

          <Text style={[styles.title, { color: colors.onSurface }]}>
            {title}
          </Text>
          <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>
            {message}
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              style={({ pressed }) => [
                styles.actionPressable,
                {
                  opacity: loading ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.confirmButtonSurface,
                  { backgroundColor: confirmBackground },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.confirmButtonLabel} numberOfLines={1}>
                    {confirmLabel}
                  </Text>
                )}
              </View>
            </Pressable>

            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.actionPressable,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <View pointerEvents="none" style={styles.cancelButtonSurface}>
                <Text style={styles.cancelButtonLabel} numberOfLines={1}>
                  {cancelLabel}
                </Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 390,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    alignItems: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  actions: {
    width: "100%",
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  actionPressable: {
    width: "100%",
  },
  confirmButtonSurface: {
    width: "100%",
    height: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    overflow: "hidden",
  },
  confirmButtonLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
  },
  cancelButtonSurface: {
    width: "100%",
    height: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  cancelButtonLabel: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
  },
});
