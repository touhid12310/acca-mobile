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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ArrowLeftRight,
  BarChart3,
  CalendarClock,
  Check,
  ChevronDown,
  CreditCard,
  FileSpreadsheet,
  HandCoins,
  HelpCircle,
  KeyRound,
  LayoutGrid,
  LifeBuoy,
  LucideIcon,
  PiggyBank,
  Send,
  Sparkles,
  Tags,
  Target,
  Wallet,
} from "lucide-react-native";

import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import { notifyToast } from "../src/contexts/NotificationContext";
import API_CONFIG, { apiRequest } from "../src/config/api";
import { BrandedHeader } from "../src/components";
import { Button, HeroCard, Input } from "../src/components/ui";
import { spacing, radius } from "../src/constants/theme";

// Keep in sync with SupportTicket::CATEGORIES on the backend.
const CATEGORIES: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { key: "accounts", label: "Accounts", icon: Wallet },
  { key: "budgets", label: "Budgets", icon: PiggyBank },
  { key: "goals", label: "Goals", icon: Target },
  { key: "loans", label: "Loans", icon: HandCoins },
  { key: "schedules", label: "Schedules", icon: CalendarClock },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "categories", label: "Categories", icon: Tags },
  { key: "ai_chat", label: "AI Chat", icon: Sparkles },
  { key: "csv_import", label: "CSV Import", icon: FileSpreadsheet },
  { key: "account_login", label: "Account & Login", icon: KeyRound },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "other", label: "Other", icon: HelpCircle },
];

export default function SupportScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [category, setCategory] = useState<string>("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedCategory = CATEGORIES.find((c) => c.key === category);
  const SelectedIcon = selectedCategory?.icon ?? LayoutGrid;

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
      {/* Brand strip + standard page header, same as every other screen —
          this page used to render a bespoke centered title with no wordmark. */}
      <BrandedHeader title="Contact Support" subtitle="Help & support" showBack />

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

          {/* Mirrors the web's <select> (Support.jsx) — 13 topics as a wrapped
              chip row filled the screen and read as run-together text. Label,
              box and border match the <Input> fields below. */}
          <View style={styles.fieldWrapper}>
            <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
              What is this about?
            </Text>
            <Pressable
              onPress={() => setShowCategoryPicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`Topic: ${selectedCategory?.label ?? "not chosen"}`}
              style={[
                styles.selectField,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: showCategoryPicker ? colors.primary : colors.outline,
                  borderWidth: showCategoryPicker ? 1.5 : 1,
                },
              ]}
            >
              <SelectedIcon
                size={18}
                color={selectedCategory ? colors.primary : colors.onSurfaceVariant}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.selectValue,
                  { color: selectedCategory ? colors.onSurface : colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                {selectedCategory ? selectedCategory.label : "Choose a topic"}
              </Text>
              <ChevronDown size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Input
              label="Subject (optional)"
              value={subject}
              onChangeText={setSubject}
              placeholder="Short summary"
              maxLength={150}
            />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Input
              label="Describe your issue"
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us what happened and what you expected…"
              multiline
              numberOfLines={7}
              maxLength={5000}
              helper={message.length > 4500 ? `${message.length} / 5000` : undefined}
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

      {/* Bottom sheet, like the onboarding currency picker. */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCategoryPicker(false)}
        >
          {/* Swallow taps inside the sheet so only the backdrop dismisses. */}
          <Pressable
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
                paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.outlineVariant }]} />
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              What is this about?
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
              Pick the topic closest to your issue.
            </Text>
            <ScrollView
              bounces={false}
              style={styles.optionList}
              contentContainerStyle={styles.optionListContent}
            >
              {CATEGORIES.map((c) => {
                const isSelected = c.key === category;
                const Icon = c.icon;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => {
                      setCategory(c.key);
                      setShowCategoryPicker(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    android_ripple={{ color: `${colors.primary}1F` }}
                    // A plain style array, not a ({ pressed }) => [...] function:
                    // the function form was dropped on device and every row
                    // fell back to a vertical stack (icon / label / check).
                    style={[
                      styles.optionRow,
                      isSelected && { backgroundColor: `${colors.primary}1F` },
                    ]}
                  >
                    <View
                      style={[
                        styles.optionIcon,
                        { backgroundColor: `${colors.primary}${isSelected ? "2E" : "14"}` },
                      ]}
                    >
                      <Icon size={18} color={colors.primary} strokeWidth={2} />
                    </View>
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: isSelected ? colors.primary : colors.onSurface },
                        isSelected && { fontWeight: "700" },
                      ]}
                      numberOfLines={1}
                    >
                      {c.label}
                    </Text>
                    {isSelected && <Check size={20} color={colors.primary} strokeWidth={2.4} />}
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
  // Same label / box as the shared <Input> (src/components/ui/Input.tsx).
  fieldWrapper: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginLeft: 4 },
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  selectValue: { flex: 1, fontSize: 15, fontWeight: "500" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  modalSheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: spacing.sm,
    maxHeight: "80%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: spacing.xl,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
    paddingHorizontal: spacing.xl,
  },
  optionList: { marginTop: spacing.md },
  optionListContent: { paddingHorizontal: spacing.sm, gap: 2 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
});
