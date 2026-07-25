import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Check, ChevronDown, ChevronLeft, LifeBuoy, Send } from "lucide-react-native";

import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import { notifyToast } from "../src/contexts/NotificationContext";
import API_CONFIG, { apiRequest } from "../src/config/api";
import { Button, HeroCard, Input } from "../src/components/ui";
import { spacing, radius } from "../src/constants/theme";

// Keep in sync with SupportTicket::CATEGORIES on the backend.
const CATEGORIES: { key: string; label: string }[] = [
  { key: "transactions", label: "Transactions" },
  { key: "accounts", label: "Accounts" },
  { key: "budgets", label: "Budgets" },
  { key: "goals", label: "Goals" },
  { key: "loans", label: "Loans" },
  { key: "schedules", label: "Schedules" },
  { key: "reports", label: "Reports" },
  { key: "categories", label: "Categories" },
  { key: "ai_chat", label: "AI Chat" },
  { key: "csv_import", label: "CSV Import" },
  { key: "account_login", label: "Account & Login" },
  { key: "billing", label: "Billing" },
  { key: "other", label: "Other" },
];

export default function SupportScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();

  const [category, setCategory] = useState<string>("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedCategory = CATEGORIES.find((c) => c.key === category);

  const handleSubmit = async () => {
    if (!category) {
      notifyToast.error("Please choose what your request is about.");
      return;
    }
    if (message.trim().length < 5) {
      notifyToast.error("Please describe your issue (at least 5 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest(API_CONFIG.ENDPOINTS.SUPPORT_TICKETS, {
        method: "POST",
        body: {
          category,
          subject: subject.trim() || undefined,
          message: message.trim(),
          platform: "mobile",
        },
        token,
      });

      if (res.success) {
        notifyToast.success(
          res.message || "Your support request has been submitted.",
          { title: "Thanks!" },
        );
        router.back();
      } else {
        notifyToast.error(res.error || "Failed to submit your request.");
      }
    } catch {
      notifyToast.error("Failed to submit your request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={[styles.backBtn, { backgroundColor: colors.surfaceVariant }]}
        >
          <ChevronLeft size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
          Contact Support
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Gradient hero matching the web's .support-hero — icon tile beside
              the copy, rather than a bare badge stacked above muted text. */}
          <HeroCard style={styles.hero}>
            <View style={styles.heroRow}>
              <View style={styles.heroIcon}>
                <LifeBuoy size={24} color={colors.primary} strokeWidth={2.4} />
              </View>
              <View style={styles.heroText}>
                <Text style={styles.heroTitle}>We&apos;re here to help</Text>
                <Text style={styles.heroSubtitle}>
                  Tell us what&apos;s going on and our team will get back to you
                  {user?.email ? ` at ${user.email}` : ""}.
                </Text>
              </View>
            </View>
          </HeroCard>

          <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>
            What is this about?
          </Text>
          {/* Mirrors the web's <select> (Support.jsx) — 13 topics as a wrapped
              chip row filled the screen and read as run-together text. */}
          <Pressable
            onPress={() => setShowCategoryPicker(true)}
            style={[
              styles.selectField,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <Text
              style={[
                styles.selectValue,
                { color: selectedCategory ? colors.onSurface : colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              {selectedCategory ? selectedCategory.label : "Select a topic…"}
            </Text>
            <ChevronDown size={20} color={colors.onSurfaceVariant} />
          </Pressable>

          <View style={{ marginTop: spacing.md }}>
            <Input
              label="Subject (optional)"
              value={subject}
              onChangeText={setSubject}
              placeholder="Short summary"
              maxLength={150}
            />
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Input
              label="Describe your issue"
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us what happened and what you expected…"
              multiline
              numberOfLines={6}
              maxLength={5000}
              textAlignVertical="top"
              style={{ minHeight: 120 }}
            />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Button
              label={submitting ? "Submitting…" : "Submit request"}
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              icon={Send}
              loading={submitting}
              disabled={submitting}
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCategoryPicker(false)}
        >
          {/* Swallow taps inside the sheet so only the backdrop dismisses. */}
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              What is this about?
            </Text>
            <ScrollView bounces={false}>
              {CATEGORIES.map((c) => {
                const isSelected = c.key === category;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => {
                      setCategory(c.key);
                      setShowCategoryPicker(false);
                    }}
                    style={[
                      styles.optionRow,
                      isSelected && { backgroundColor: `${colors.primary}1F` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: isSelected ? colors.primary : colors.onSurface },
                        isSelected && { fontWeight: "700" },
                      ]}
                    >
                      {c.label}
                    </Text>
                    {isSelected && <Check size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  hero: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  // Solid white on the gradient — a translucent tile left the white icon with
  // almost no contrast against the light end of the ocean gradient.
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { flex: 1, minWidth: 0, gap: 4 },
  heroTitle: { color: "#ffffff", fontSize: 18, fontWeight: "700" },
  heroSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    lineHeight: 18,
  },
  fieldLabel: { fontSize: 14, fontWeight: "600", marginBottom: spacing.sm },
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  selectValue: { flex: 1, fontSize: 15 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalSheet: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  optionLabel: { flex: 1, fontSize: 15 },
});
