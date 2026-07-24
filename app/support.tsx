import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, LifeBuoy, Send } from "lucide-react-native";

import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import { notifyToast } from "../src/contexts/NotificationContext";
import API_CONFIG, { apiRequest } from "../src/config/api";
import { Button, Input, Chip } from "../src/components/ui";
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
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
          <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
            <LifeBuoy size={26} color="#ffffff" />
          </View>
          <Text style={[styles.intro, { color: colors.onSurfaceVariant }]}>
            Tell us what&apos;s going on and our team will get back to you
            {user?.email ? ` at ${user.email}` : ""}.
          </Text>

          <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>
            What is this about?
          </Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                selected={category === c.key}
                onPress={() => setCategory(c.key)}
                style={{ marginRight: 8, marginBottom: 8 }}
              />
            ))}
          </View>

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
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  fieldLabel: { fontSize: 14, fontWeight: "600", marginBottom: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap" },
});
