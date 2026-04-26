import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Text,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Banknote,
  BanknoteArrowUp,
  BadgePlus,
  Building2,
  ChartLine,
  ChevronRight,
  CreditCard,
  HandCoins,
  PiggyBank,
  Plus,
  Smartphone,
  Sparkles,
  Star,
  TriangleAlert,
  Wallet,
  LucideIcon,
} from "lucide-react-native";

import { useTheme } from "../src/contexts/ThemeContext";
import { useCurrency } from "../src/contexts/CurrencyContext";
import {
  ScreenHeader,
  Card,
  IconBadge,
  Button,
  EmptyState,
  Badge,
  Input,
  AlertBar,
} from "../src/components/ui";
import accountService from "../src/services/accountService";
import { Account } from "../src/types";
import { gradients, radius, shadow, spacing } from "../src/constants/theme";

const formatApiError = (result: any): string => {
  const errorData = result.data;
  let errorMsg = errorData?.message || result.error || "Request failed";
  const validationErrors = errorData?.errors;
  if (validationErrors && typeof validationErrors === "object") {
    const details = Object.entries(validationErrors)
      .map(
        ([f, m]) =>
          `${f}: ${Array.isArray(m) ? m.join(", ") : m}`,
      )
      .join("\n");
    if (details) errorMsg = `${errorMsg}\n\n${details}`;
  }
  return errorMsg;
};

const accountTypeOptions = [
  { value: "Cash", label: "Cash" },
  { value: "Bank Account", label: "Bank Account" },
  { value: "Savings Account", label: "Savings" },
  { value: "Credit Card", label: "Credit Card" },
  { value: "Mobile Banking/e-Wallet", label: "e-Wallet" },
  { value: "Loan Account", label: "Loan" },
  { value: "Investment Account", label: "Investment" },
  { value: "Digital Bank Account", label: "Digital Bank" },
  { value: "Prepaid Card", label: "Prepaid" },
  { value: "Other", label: "Other" },
];

const getAccountIcon = (type: string = ""): LucideIcon => {
  const n = type.toLowerCase();
  if (n.includes("cash")) return Banknote;
  if (n.includes("credit") || n.includes("card")) return CreditCard;
  if (n.includes("wallet") || n.includes("mobile")) return Smartphone;
  if (n.includes("savings") || n.includes("piggy")) return PiggyBank;
  if (n.includes("investment")) return ChartLine;
  if (n.includes("loan")) return HandCoins;
  return Building2;
};

export default function AccountsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: "", message: "" });
  const [formData, setFormData] = useState({
    account_name: "",
    account_type: "Bank Account" as string,
    balance: "",
  });

  const {
    data: accounts,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const result = await accountService.getAll();
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData || [];
      }
      return [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await accountService.create({
        account_name: data.account_name,
        type: data.account_type,
        current_balance: parseFloat(data.balance) || 0,
      });
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      closeModal();
    },
    onError: (error: Error) =>
      setErrorDialog({
        visible: true,
        title: "Unable to Save",
        message: error.message,
      }),
  });

  const openAddModal = () => {
    setFormData({ account_name: "", account_type: "Bank Account", balance: "" });
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  const handleSave = () => {
    if (!formData.account_name.trim()) {
      setErrorDialog({
        visible: true,
        title: "Missing information",
        message: "Please enter an account name",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleAccountPress = (account: Account) =>
    router.push(`/account-detail?id=${account.id}`);

  const viewAccounts = accounts || [];
  const totalBalance = viewAccounts.reduce((sum: number, acc: Account) => {
    const balance = parseFloat(String(acc.current_balance ?? acc.balance ?? 0));
    return sum + balance;
  }, 0);
  const accountsCount = viewAccounts.length;
  const uniqueTypes = new Set(
    viewAccounts.map((acc: Account) => acc.type || acc.account_type || "Other"),
  ).size;
  const topAccount =
    viewAccounts.length > 0
      ? viewAccounts.reduce((prev: Account, curr: Account) => {
          const pB = parseFloat(String(prev.current_balance ?? prev.balance ?? 0));
          const cB = parseFloat(String(curr.current_balance ?? curr.balance ?? 0));
          return cB > pB ? curr : prev;
        }, viewAccounts[0])
      : null;

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={{ paddingHorizontal: spacing.lg }}>
        <ScreenHeader
          title="Accounts"
          subtitle="Balances & sources"
          showBack
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Total Balance Hero */}
        <View style={[styles.hero, shadow.lg]}>
          <View style={styles.heroGlowA} pointerEvents="none" />
          <View style={styles.heroGlowB} pointerEvents="none" />
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <Wallet size={22} color="#ffffff" strokeWidth={2.2} />
            </View>
            <View style={styles.heroTopText}>
              <Text style={styles.heroLabel}>Total balance</Text>
              <Text style={styles.heroValue}>
                {formatAmount(totalBalance)}
              </Text>
            </View>
          </View>
          <View style={styles.heroMeta}>
            <View style={styles.heroMetaItem}>
              <Text style={styles.heroMetaValue}>{accountsCount}</Text>
              <Text style={styles.heroMetaLabel}>Accounts</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroMetaItem}>
              <Text style={styles.heroMetaValue}>{uniqueTypes}</Text>
              <Text style={styles.heroMetaLabel}>Types</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroMetaItem}>
              <Text
                style={styles.heroMetaValueSmall}
                numberOfLines={1}
              >
                {topAccount?.account_name || "—"}
              </Text>
              <Text style={styles.heroMetaLabel}>Top account</Text>
            </View>
          </View>
        </View>

        {viewAccounts.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <Text
              style={[styles.sectionTitle, { color: colors.onSurface }]}
            >
              All accounts
            </Text>

            {viewAccounts.map((account: Account) => {
              const type = account.type || account.account_type || "Other";
              const balance = parseFloat(
                String(account.current_balance ?? account.balance ?? 0),
              );
              const Icon = getAccountIcon(type);
              const positive = balance >= 0;

              return (
                <Card
                  key={account.id}
                  variant="elevated"
                  padding="lg"
                  radiusSize="xl"
                >
                  <Pressable
                    onPress={() => handleAccountPress(account)}
                    style={styles.accountInner}
                  >
                    <IconBadge icon={Icon} tone="primary" size="lg" shape="rounded" />
                    <View style={styles.accountInfo}>
                      <Text
                        style={[
                          styles.accountName,
                          { color: colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {account.account_name || "Unnamed Account"}
                      </Text>
                      <Badge label={type} tone="neutral" size="sm" />
                    </View>
                    <View style={styles.balanceBlock}>
                      <Text
                        style={[
                          styles.balanceLabel,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        Balance
                      </Text>
                      <Text
                        style={[
                          styles.balanceValue,
                          {
                            color: positive ? colors.tertiary : colors.error,
                          },
                        ]}
                      >
                        {formatAmount(balance)}
                      </Text>
                    </View>
                    <ChevronRight
                      size={18}
                      color={colors.onSurfaceVariant}
                      strokeWidth={2}
                    />
                  </Pressable>
                </Card>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon={Building2}
            title="No accounts yet"
            message="Tap the + button to add your first account"
            action={{ label: "Add account", onPress: openAddModal }}
          />
        )}
      </ScrollView>

      {/* FAB */}
      <View
        style={[
          styles.fab,
          { bottom: 20 + insets.bottom },
          shadow.lg,
        ]}
      >
        <Pressable onPress={openAddModal} style={styles.fabPressable}>
          <LinearGradient
            colors={gradients.primary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Plus size={24} color="#ffffff" strokeWidth={2.4} />
        </Pressable>
      </View>

      {/* Add Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable style={styles.modalBackdropTouchable} onPress={closeModal}>
            <Pressable
              style={[
                styles.sheet,
                { backgroundColor: colors.surface },
                shadow.lg,
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={[styles.sheetTitle, { color: colors.onSurface }]}>
                  Add account
                </Text>

                <Input
                  label="Account name"
                  placeholder="e.g. Main checking"
                  value={formData.account_name}
                  onChangeText={(t) =>
                    setFormData({ ...formData, account_name: t })
                  }
                />
                <Input
                  label="Initial balance"
                  placeholder="0.00"
                  value={formData.balance}
                  onChangeText={(t) => setFormData({ ...formData, balance: t })}
                  keyboardType="decimal-pad"
                />

                <Text
                  style={[
                    styles.fieldLabel,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Account type
                </Text>
                <View style={styles.typeChipsShell}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.typeChips}
                    keyboardShouldPersistTaps="handled"
                  >
                    {accountTypeOptions.map((opt) => {
                      const active = formData.account_type === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() =>
                            setFormData({
                              ...formData,
                              account_type: opt.value,
                            })
                          }
                          style={[
                            styles.typeChipPill,
                            {
                              backgroundColor: active
                                ? colors.primary
                                : colors.surfaceVariant,
                            },
                          ]}
                          hitSlop={6}
                        >
                          <Text
                            style={[
                              styles.typeChipLabel,
                              {
                                color: active
                                  ? colors.onPrimary
                                  : colors.onSurfaceVariant,
                              },
                            ]}
                            numberOfLines={1}
                            allowFontScaling={false}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.sheetButtons}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Cancel"
                      variant="secondary"
                      onPress={closeModal}
                      fullWidth
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Add"
                      variant="primary"
                      onPress={handleSave}
                      loading={createMutation.isPending}
                      icon={BadgePlus}
                      fullWidth
                    />
                  </View>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={errorDialog.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setErrorDialog({ visible: false, title: "", message: "" })
        }
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() =>
            setErrorDialog({ visible: false, title: "", message: "" })
          }
        >
          <Pressable
            style={[
              styles.confirmCard,
              { backgroundColor: colors.surface },
              shadow.lg,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.confirmIcon,
                { backgroundColor: colors.errorContainer },
              ]}
            >
              <TriangleAlert
                size={28}
                color={colors.error}
                strokeWidth={2.2}
              />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.onSurface }]}>
              {errorDialog.title}
            </Text>
            <Text
              style={[styles.confirmText, { color: colors.onSurfaceVariant }]}
            >
              {errorDialog.message}
            </Text>
            <Button
              label="Got it"
              variant="primary"
              fullWidth
              onPress={() =>
                setErrorDialog({ visible: false, title: "", message: "" })
              }
              style={{ alignSelf: "stretch", marginTop: spacing.md }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  hero: {
    padding: spacing.lg,
    borderRadius: radius.xxl,
    gap: spacing.xs,
    overflow: "hidden",
    backgroundColor: "#0f213d",
  },
  heroGlowA: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#6366f1",
    opacity: 0.22,
    top: -80,
    right: -60,
  },
  heroGlowB: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#a855f7",
    opacity: 0.18,
    bottom: -40,
    left: -30,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroTopText: {
    flexShrink: 1,
    minWidth: 0,
    alignItems: "flex-end",
    gap: 2,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  heroValue: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  heroMetaItem: {
    flex: 1,
    alignItems: "center",
    gap: 1,
  },
  heroMetaValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  heroMetaValueSmall: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "700",
    maxWidth: 90,
  },
  heroMetaLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroDivider: {
    width: 1,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  accountInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "700",
  },
  balanceBlock: {
    alignItems: "flex-end",
    gap: 2,
  },
  balanceLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  fabPressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  modalBackdropTouchable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    padding: spacing.xl,
    borderRadius: radius.xxl,
    gap: spacing.md,
    maxHeight: "85%",
    maxWidth: 520,
    alignSelf: "stretch",
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  typeChipsShell: {
    height: 54,
    justifyContent: "center",
    marginHorizontal: -spacing.xl,
  },
  typeChips: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    alignItems: "center",
  },
  typeChipPill: {
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  typeChipLabel: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  sheetButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  confirmCard: {
    margin: spacing.xl,
    padding: spacing.xxl,
    borderRadius: radius.xxl,
    alignItems: "center",
    gap: spacing.md,
    maxWidth: 400,
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  confirmText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
});
