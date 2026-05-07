import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
} from "react-native";
import {
  Text,
  ActivityIndicator,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAuth } from "../src/contexts/AuthContext";
import { useTheme } from "../src/contexts/ThemeContext";
import { useCurrency } from "../src/contexts/CurrencyContext";
import onboardingService from "../src/services/onboardingService";
import { detectTimeZone } from "../src/utils/timezone";

type ProfileType = "personal" | "freelancer" | "family" | "business";

const STEPS = [
  { id: 1, label: "Profile basics" },
  { id: 2, label: "Pick a profile" },
  { id: 3, label: "First account" },
  { id: 4, label: "All set" },
];

const PROFILES: { id: ProfileType; icon: string; title: string; description: string }[] = [
  { id: "personal", icon: "account", title: "Personal", description: "Track everyday spending, savings, and goals." },
  { id: "freelancer", icon: "briefcase-outline", title: "Freelancer", description: "Income, expenses, and tax-ready records." },
  { id: "family", icon: "account-group-outline", title: "Family", description: "Joint budgets, shared expenses, savings goals." },
  { id: "business", icon: "store-outline", title: "Small Business", description: "Cash flow, invoicing, and bookkeeping." },
];

const ACCOUNT_TYPES: { id: string; label: string; icon: string }[] = [
  { id: "Cash", label: "Cash Wallet", icon: "wallet-outline" },
  { id: "Bank Account", label: "Bank Account", icon: "bank-outline" },
  { id: "Credit Card", label: "Credit Card", icon: "credit-card-outline" },
  { id: "Mobile Banking/e-Wallet", label: "Mobile Wallet", icon: "cellphone" },
  { id: "Savings Account", label: "Savings", icon: "piggy-bank-outline" },
];

export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const { token, user, checkAuthStatus } = useAuth();
  const { currency, availableCurrencies } = useCurrency();

  const detectedTz = useMemo(() => detectTimeZone(), []);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [displayName, setDisplayName] = useState(user?.name || "");
  const [selectedCurrency, setSelectedCurrency] = useState(user?.currency || currency || "USD");
  const [timezone, setTimezone] = useState(user?.timezone || detectedTz);
  const [monthMode, setMonthMode] = useState<"first" | "custom">("first");
  const [customDay, setCustomDay] = useState("1");
  const [profileType, setProfileType] = useState<ProfileType>("personal");
  const [accountType, setAccountType] = useState("Bank Account");
  const [accountName, setAccountName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [loadSampleData, setLoadSampleData] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState("");

  const filteredCurrencies = useMemo(() => {
    const list = availableCurrencies || [];
    if (!currencyQuery.trim()) return list.slice(0, 60);
    const q = currencyQuery.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        (c.label || "").toLowerCase().includes(q)
    ).slice(0, 60);
  }, [availableCurrencies, currencyQuery]);

  const setField = (key: string, value: any) => {
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    if (key === "displayName") setDisplayName(value);
    if (key === "selectedCurrency") setSelectedCurrency(value);
    if (key === "timezone") setTimezone(value);
    if (key === "monthMode") setMonthMode(value);
    if (key === "customDay") setCustomDay(value);
    if (key === "profileType") setProfileType(value);
    if (key === "accountType") setAccountType(value);
    if (key === "accountName") setAccountName(value);
    if (key === "openingBalance") setOpeningBalance(value);
    if (key === "loadSampleData") setLoadSampleData(value);
  };

  const validateStep = (which: number): boolean => {
    const next: Record<string, string> = {};
    if (which === 1) {
      if (!displayName.trim()) next.displayName = "Display name is required";
      if (!selectedCurrency) next.selectedCurrency = "Pick a currency";
      if (monthMode === "custom") {
        const day = Number(customDay);
        if (!Number.isFinite(day) || day < 1 || day > 28) {
          next.customDay = "Pick a day 1–28";
        }
      }
    }
    if (which === 3 && !accountName.trim()) {
      next.accountName = "Account name is required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(STEPS.length, s + 1));
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const useDefaultAccount = () => {
    setAccountType("Cash");
    setAccountName((prev) => prev || "Cash Wallet");
    setOpeningBalance((prev) => prev || "0");
  };

  const buildPayload = () => {
    const day = monthMode === "custom" ? Math.max(1, Math.min(28, Number(customDay) || 1)) : 1;
    const balance = parseFloat(openingBalance);
    return {
      display_name: displayName.trim(),
      currency: selectedCurrency,
      timezone,
      financial_month_start_day: day,
      profile_type: profileType,
      load_sample_data: loadSampleData,
      account: accountName.trim()
        ? {
            account_name: accountName.trim(),
            type: accountType,
            current_balance: Number.isFinite(balance) ? balance : 0,
          }
        : null,
    };
  };

  const handleFinish = async (destination?: string) => {
    if (!validateStep(1)) {
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      const response = await onboardingService.complete(buildPayload());
      if (!response?.success) {
        return;
      }
      await checkAuthStatus();
      if (destination) {
        router.replace(destination as any);
      } else {
        router.replace("/(tabs)");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipAll = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onboardingService.skip();
      await checkAuthStatus();
      router.replace("/(tabs)");
    } finally {
      setSubmitting(false);
    }
  };

  const surfaceBg = isDark ? "rgba(17, 24, 39, 0.65)" : "#ffffff";
  const cardBorder = isDark ? "rgba(75, 85, 99, 0.55)" : "#e2e8f0";
  const subtle = isDark ? "#94a3b8" : "#64748b";

  const selectedCurrencyMeta = availableCurrencies?.find((c) => c.code === selectedCurrency);

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Stepper */}
        <View style={styles.stepper}>
          {STEPS.map((s, idx) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <View
                  style={[
                    styles.stepDot,
                    { borderColor: cardBorder, backgroundColor: surfaceBg },
                    (active || done) && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  {done ? (
                    <MaterialCommunityIcons name="check" size={14} color="#fff" />
                  ) : (
                    <Text style={[styles.stepNum, { color: active ? "#fff" : subtle }]}>{s.id}</Text>
                  )}
                </View>
                {idx < STEPS.length - 1 && (
                  <View style={[styles.stepConnector, { backgroundColor: done ? colors.primary : cardBorder }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
          <View style={styles.pillWrap}>
            <Text style={[styles.pill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: subtle, borderColor: cardBorder }]}>
              {STEPS[step - 1].label}
            </Text>
          </View>

          {step === 1 && (
            <View style={styles.body}>
              <Text style={[styles.title, { color: colors.onSurface }]}>Let's get to know you</Text>
              <Text style={[styles.subtitle, { color: subtle }]}>
                Just a few quick details so AccountE works the way you do. You can change all of this later in Settings.
              </Text>

              <View style={styles.field}>
                <Text style={[styles.label, { color: subtle }]}>Display name</Text>
                <TextInput
                  value={displayName}
                  onChangeText={(v) => setField("displayName", v)}
                  placeholder="Your name"
                  placeholderTextColor={subtle}
                  style={[
                    styles.input,
                    { color: colors.onSurface, borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" },
                  ]}
                />
                {errors.displayName && <Text style={styles.errorText}>{errors.displayName}</Text>}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: subtle }]}>Default currency</Text>
                <TouchableOpacity
                  onPress={() => setCurrencyModalOpen(true)}
                  style={[
                    styles.select,
                    { borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" },
                  ]}
                >
                  <Text style={{ color: colors.onSurface, fontSize: 14 }}>
                    {selectedCurrencyMeta
                      ? `${selectedCurrencyMeta.code} — ${selectedCurrencyMeta.label}`
                      : "Select currency"}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={18} color={subtle} />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: subtle }]}>Timezone</Text>
                <View
                  style={[
                    styles.input,
                    { borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc", justifyContent: "center" },
                  ]}
                >
                  <Text style={{ color: colors.onSurface, fontSize: 14 }}>
                    Auto-detected · {timezone}
                  </Text>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: subtle }]}>My financial month starts on</Text>
                <View style={styles.radioRow}>
                  <Pressable
                    onPress={() => setField("monthMode", "first")}
                    style={[
                      styles.radioCard,
                      { borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" },
                      monthMode === "first" && { borderColor: colors.primary },
                    ]}
                  >
                    <View style={[styles.radioDot, { borderColor: subtle }, monthMode === "first" && { borderColor: colors.primary, backgroundColor: colors.primary }]} />
                    <Text style={{ color: colors.onSurface, fontSize: 14, fontWeight: "500" }}>1st of the month</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setField("monthMode", "custom")}
                    style={[
                      styles.radioCard,
                      { borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" },
                      monthMode === "custom" && { borderColor: colors.primary },
                    ]}
                  >
                    <View style={[styles.radioDot, { borderColor: subtle }, monthMode === "custom" && { borderColor: colors.primary, backgroundColor: colors.primary }]} />
                    <Text style={{ color: colors.onSurface, fontSize: 14, fontWeight: "500" }}>Custom payday</Text>
                  </Pressable>
                </View>
                {monthMode === "custom" && (
                  <TextInput
                    value={customDay}
                    onChangeText={(v) => setField("customDay", v.replace(/[^0-9]/g, ""))}
                    placeholder="Day of month (1–28)"
                    placeholderTextColor={subtle}
                    keyboardType="number-pad"
                    style={[
                      styles.input,
                      { marginTop: 8, color: colors.onSurface, borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" },
                    ]}
                  />
                )}
                {errors.customDay && <Text style={styles.errorText}>{errors.customDay}</Text>}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.body}>
              <Text style={[styles.title, { color: colors.onSurface }]}>What brings you to AccountE?</Text>
              <Text style={[styles.subtitle, { color: subtle }]}>
                We'll tune your dashboard, categories, and features to match. You can switch profiles or mix-and-match later.
              </Text>

              <View style={styles.profileGrid}>
                {PROFILES.map((opt) => (
                  <Pressable
                    key={opt.id}
                    onPress={() => setField("profileType", opt.id)}
                    style={[
                      styles.profileCard,
                      { borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" },
                      profileType === opt.id && { borderColor: colors.primary },
                    ]}
                  >
                    <View style={[styles.profileIcon, { backgroundColor: isDark ? "rgba(99,102,241,0.18)" : "#eef2ff" }]}>
                      <MaterialCommunityIcons name={opt.icon as any} size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.profileTitle, { color: colors.onSurface }]}>{opt.title}</Text>
                    <Text style={[styles.profileDesc, { color: subtle }]} numberOfLines={2}>{opt.description}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.body}>
              <Text style={[styles.title, { color: colors.onSurface }]}>Where does your money live?</Text>
              <Text style={[styles.subtitle, { color: subtle }]}>
                Every transaction belongs to an account. Add one to start — you can connect more later.
              </Text>

              <View style={styles.field}>
                <Text style={[styles.label, { color: subtle }]}>Account type</Text>
                <View style={styles.typeRow}>
                  {ACCOUNT_TYPES.map((t) => {
                    const selected = accountType === t.id;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => setField("accountType", t.id)}
                        style={[
                          styles.typePill,
                          { borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" },
                          selected && { borderColor: colors.primary, backgroundColor: isDark ? "rgba(99,102,241,0.18)" : "#eef2ff" },
                        ]}
                      >
                        <MaterialCommunityIcons name={t.icon as any} size={16} color={selected ? colors.primary : subtle} />
                        <Text style={{ color: selected ? colors.primary : colors.onSurface, fontSize: 13, fontWeight: "500" }}>
                          {t.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: subtle }]}>Account name</Text>
                <TextInput
                  value={accountName}
                  onChangeText={(v) => setField("accountName", v)}
                  placeholder="e.g. Chase Checking"
                  placeholderTextColor={subtle}
                  style={[
                    styles.input,
                    { color: colors.onSurface, borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" },
                  ]}
                />
                {errors.accountName && <Text style={styles.errorText}>{errors.accountName}</Text>}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: subtle }]}>Opening balance</Text>
                <TextInput
                  value={openingBalance}
                  onChangeText={(v) => setField("openingBalance", v)}
                  placeholder="0.00"
                  placeholderTextColor={subtle}
                  keyboardType="decimal-pad"
                  style={[
                    styles.input,
                    { color: colors.onSurface, borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" },
                  ]}
                />
              </View>

              <View
                style={[
                  styles.banner,
                  { borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" },
                ]}
              >
                <Text style={[styles.bannerText, { color: subtle }]}>
                  ⚡ Just exploring? Start with a Cash Wallet at zero balance.
                </Text>
                <TouchableOpacity onPress={useDefaultAccount} style={[styles.pillAction, { borderColor: cardBorder }]}>
                  <Text style={{ color: colors.onSurface, fontSize: 13, fontWeight: "500" }}>Use default</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.body}>
              <Text style={[styles.title, { color: colors.onSurface }]}>You're set up</Text>
              <Text style={[styles.subtitle, { color: subtle }]}>
                Your dashboard is ready. Pick where you'd like to go first — or jump straight in.
              </Text>

              <View style={styles.finishGrid}>
                <Pressable
                  onPress={() => handleFinish("/transaction-modal")}
                  style={[styles.finishCard, { borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" }]}
                  disabled={submitting}
                >
                  <View style={[styles.finishIcon, { backgroundColor: isDark ? "rgba(99,102,241,0.18)" : "#eef2ff" }]}>
                    <MaterialCommunityIcons name="plus" size={22} color={colors.primary} />
                  </View>
                  <Text style={[styles.finishTitle, { color: colors.onSurface }]}>Add a transaction</Text>
                  <Text style={[styles.finishDesc, { color: subtle }]}>Log income or an expense.</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleFinish("/categories")}
                  style={[styles.finishCard, { borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" }]}
                  disabled={submitting}
                >
                  <View style={[styles.finishIcon, { backgroundColor: isDark ? "rgba(99,102,241,0.18)" : "#eef2ff" }]}>
                    <MaterialCommunityIcons name="format-list-checks" size={22} color={colors.primary} />
                  </View>
                  <Text style={[styles.finishTitle, { color: colors.onSurface }]}>Review categories</Text>
                  <Text style={[styles.finishDesc, { color: subtle }]}>Tweak your chart of accounts.</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleFinish("/budgets")}
                  style={[styles.finishCard, { borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" }]}
                  disabled={submitting}
                >
                  <View style={[styles.finishIcon, { backgroundColor: isDark ? "rgba(99,102,241,0.18)" : "#eef2ff" }]}>
                    <MaterialCommunityIcons name="target" size={22} color={colors.primary} />
                  </View>
                  <Text style={[styles.finishTitle, { color: colors.onSurface }]}>Set a budget</Text>
                  <Text style={[styles.finishDesc, { color: subtle }]}>Get spend alerts that matter.</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => setLoadSampleData((v) => !v)}
                style={[styles.toggleRow, { borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" }]}
              >
                <View
                  style={[
                    styles.toggleTrack,
                    { backgroundColor: loadSampleData ? colors.primary : isDark ? "#475569" : "#cbd5e1" },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      loadSampleData && { transform: [{ translateX: 16 }] },
                    ]}
                  />
                </View>
                <Text style={[styles.toggleText, { color: subtle }]}>
                  Load sample data so I can explore — clearable anytime from Settings.
                </Text>
              </Pressable>
            </View>
          )}

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: cardBorder }]}>
            {step < 4 ? (
              <>
                <TouchableOpacity onPress={handleSkipAll} disabled={submitting}>
                  <Text style={[styles.ghost, { color: subtle, borderColor: cardBorder }]}>Skip for now</Text>
                </TouchableOpacity>
                <View style={styles.footerActions}>
                  <TouchableOpacity onPress={goBack} disabled={step === 1 || submitting}>
                    <Text
                      style={[
                        styles.secondary,
                        { color: colors.onSurface, borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc", opacity: step === 1 ? 0.5 : 1 },
                      ]}
                    >
                      Back
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (step === 3) {
                        if (validateStep(3)) setStep(4);
                      } else {
                        goNext();
                      }
                    }}
                    disabled={submitting}
                  >
                    <Text style={[styles.primary, { backgroundColor: colors.primary }]}>
                      {submitting ? "…" : step === 3 ? "Add account" : "Continue"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={handleSkipAll} disabled={submitting}>
                  <Text style={[styles.ghost, { color: subtle, borderColor: cardBorder }]}>Maybe later</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleFinish()} disabled={submitting}>
                  <Text style={[styles.primary, { backgroundColor: colors.primary }]}>
                    {submitting ? "Saving…" : "Go to dashboard →"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {step === 3 && (
            <Text style={[styles.requiredNote, { color: subtle }]}>Required to continue</Text>
          )}
        </View>
      </ScrollView>

      {/* Currency picker modal */}
      <Modal
        visible={currencyModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCurrencyModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCurrencyModalOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Select currency</Text>
            <TextInput
              value={currencyQuery}
              onChangeText={setCurrencyQuery}
              placeholder="Search currencies"
              placeholderTextColor={subtle}
              style={[
                styles.input,
                { color: colors.onSurface, borderColor: cardBorder, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#f8fafc" },
              ]}
              autoFocus
            />
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {filteredCurrencies.map((c) => {
                const selected = c.code === selectedCurrency;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => {
                      setField("selectedCurrency", c.code);
                      setCurrencyModalOpen(false);
                      setCurrencyQuery("");
                    }}
                    style={[
                      styles.modalRow,
                      selected && { backgroundColor: isDark ? "rgba(99,102,241,0.18)" : "#eef2ff" },
                    ]}
                  >
                    <Text style={[styles.modalRowSymbol, { color: subtle }]}>{c.symbol}</Text>
                    <Text style={[styles.modalRowCode, { color: colors.onSurface }]}>{c.code}</Text>
                    <Text style={[styles.modalRowLabel, { color: subtle }]} numberOfLines={1}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {submitting && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 4,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { fontSize: 12, fontWeight: "600" },
  stepConnector: {
    width: 28,
    height: 2,
    marginHorizontal: 4,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  pillWrap: { marginBottom: 8 },
  pill: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "600",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
  },
  body: { gap: 14 },
  title: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  subtitle: { fontSize: 13.5, lineHeight: 19, marginTop: -4 },
  field: { gap: 6 },
  label: { fontSize: 12.5, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  select: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 2 },
  radioRow: { flexDirection: "row", gap: 10 },
  radioCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
  },
  profileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  profileCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  profileTitle: { fontSize: 15, fontWeight: "600", marginTop: 4 },
  profileDesc: { fontSize: 12, lineHeight: 16 },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 10,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexWrap: "wrap",
  },
  bannerText: { flex: 1, fontSize: 12.5 },
  pillAction: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  finishGrid: { flexDirection: "row", gap: 8 },
  finishCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  finishIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  finishTitle: { fontSize: 12.5, fontWeight: "600", textAlign: "center" },
  finishDesc: { fontSize: 11, textAlign: "center", lineHeight: 14 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  toggleTrack: {
    width: 36,
    height: 20,
    borderRadius: 999,
    padding: 2,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  toggleText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 1,
  },
  footerActions: { flexDirection: "row", gap: 8 },
  ghost: {
    fontSize: 13.5,
    fontWeight: "600",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondary: {
    fontSize: 13.5,
    fontWeight: "600",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  primary: {
    color: "#fff",
    fontSize: 13.5,
    fontWeight: "600",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    overflow: "hidden",
  },
  requiredNote: { fontSize: 12, marginTop: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    maxHeight: "70%",
    borderWidth: 1,
    gap: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalList: { marginTop: 8 },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  modalRowSymbol: { width: 24, textAlign: "center", fontSize: 13, fontWeight: "600" },
  modalRowCode: { width: 50, fontSize: 14, fontWeight: "600" },
  modalRowLabel: { flex: 1, fontSize: 13 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
});
