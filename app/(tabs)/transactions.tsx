import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Text,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowUpDown,
  CreditCard,
  Edit3,
  MoreVertical,
  Plus,
  Receipt,
  Search,
  Trash2,
  TriangleAlert,
  Wallet,
  X,
  LucideIcon,
} from "lucide-react-native";

import { useTheme } from "../../src/contexts/ThemeContext";
import { useCurrency } from "../../src/contexts/CurrencyContext";
import {
  ScreenHeader,
  Chip,
  IconBadge,
  EmptyState,
  Card,
  Button,
  AlertBar,
  Badge,
} from "../../src/components/ui";
import transactionService from "../../src/services/transactionService";
import accountService from "../../src/services/accountService";
import { formatDate } from "../../src/utils/date";
import {
  Transaction,
  TransactionType,
  AccountType,
  Account,
} from "../../src/types";
import { gradients, radius, shadow, spacing } from "../../src/constants/theme";

type FilterType = "all" | TransactionType;

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "income", label: "Income" },
  { key: "expense", label: "Expenses" },
  { key: "transfer", label: "Transfers" },
  { key: "asset", label: "Assets" },
  { key: "liability", label: "Liabilities" },
];

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await transactionService.delete(id);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete transaction");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const result = await accountService.getAll();
      if (result.success && result.data) {
        const payload = result.data as any;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.data?.data)) return payload.data.data;
      }
      return [];
    },
  });

  const accounts: Account[] = accountsData || [];
  const accountsMap = useMemo(() => {
    const map = new Map<number, Account>();
    accounts.forEach((acc) => map.set(acc.id, acc));
    return map;
  }, [accounts]);

  const {
    data: transactionsData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["transactions", filterType],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (
        filterType !== "all" &&
        filterType !== "asset" &&
        filterType !== "liability"
      ) {
        params.type = filterType;
      }
      const result = await transactionService.getAll(params);
      if (result.success && result.data) {
        const laravelResponse = result.data as any;
        let data: Transaction[] = [];
        if (laravelResponse.data?.data && Array.isArray(laravelResponse.data.data)) {
          data = laravelResponse.data.data;
        } else if (Array.isArray(laravelResponse.data)) {
          data = laravelResponse.data;
        } else if (Array.isArray(laravelResponse)) {
          data = laravelResponse;
        }
        return data;
      }
      throw new Error(result.error || "Failed to load transactions");
    },
  });

  const transactions = transactionsData || [];

  const filteredTransactions = useCallback(() => {
    let filtered = [...transactions];
    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.merchant_name?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.category?.name?.toLowerCase().includes(q),
      );
    }
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        const dA = new Date(a.date).getTime();
        const dB = new Date(b.date).getTime();
        return sortOrder === "desc" ? dB - dA : dA - dB;
      }
      const aA = parseFloat(String(a.amount)) || 0;
      const aB = parseFloat(String(b.amount)) || 0;
      return sortOrder === "desc" ? aB - aA : aA - aB;
    });
    return filtered;
  }, [transactions, searchQuery, sortBy, sortOrder, filterType]);

  const handleSort = () => {
    if (sortBy === "date") setSortBy("amount");
    else setSortBy("date");
    setSortOrder("desc");
  };

  const getIcon = (type: TransactionType): LucideIcon => {
    switch (type) {
      case "income": return ArrowDownLeft;
      case "expense": return ArrowUpRight;
      case "transfer": return ArrowLeftRight;
      case "asset": return Wallet;
      case "liability": return CreditCard;
      default: return Receipt;
    }
  };

  const getTone = (type: TransactionType) => {
    switch (type) {
      case "income": return "success" as const;
      case "expense": return "danger" as const;
      case "transfer": return "primary" as const;
      case "asset": return "success" as const;
      case "liability": return "warning" as const;
      default: return "neutral" as const;
    }
  };

  const getAmountColor = (type: TransactionType) => {
    switch (type) {
      case "income": return colors.tertiary;
      case "expense": return colors.error;
      default: return colors.onSurface;
    }
  };

  const handleEditTransaction = (item: Transaction) => {
    let categoryId: number | undefined = item.category_id || item.category?.id;
    let subcategoryId: number | undefined =
      item.subcategory_id || item.subcategory?.id;

    if (item.transaction_categories && item.transaction_categories.length > 0) {
      const primary = item.transaction_categories[0];
      categoryId = primary.category_id;
      subcategoryId = primary.subcategory_id;
    }

    const accountId =
      item.payment_method || item.account_id || item.account?.id;

    router.push({
      pathname: "/transaction-modal",
      params: {
        id: item.id.toString(),
        type: item.type,
        amount: item.amount.toString(),
        merchant_name: item.merchant_name || "",
        description: item.description || "",
        category_id: categoryId?.toString() || "",
        subcategory_id: subcategoryId?.toString() || "",
        account_id: accountId?.toString() || "",
        notes: item.notes || "",
        date: item.date,
      },
    });
  };

  const groupedTransactions = useMemo(() => {
    const filtered = filteredTransactions();
    const groups: { date: string; data: Transaction[] }[] = [];
    let currentDate = "";
    filtered.forEach((t) => {
      const date = t.date.split("T")[0];
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, data: [] });
      }
      groups[groups.length - 1].data.push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const totalExpense = useMemo(() => {
    return filteredTransactions()
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + (parseFloat(String(t.amount)) || 0), 0);
  }, [filteredTransactions]);

  const totalIncome = useMemo(() => {
    return filteredTransactions()
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (parseFloat(String(t.amount)) || 0), 0);
  }, [filteredTransactions]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Activity"
          subtitle="Transactions"
          right={
            <Pressable
              onPress={handleSort}
              style={[
                styles.sortBtn,
                { backgroundColor: colors.surfaceVariant },
              ]}
              hitSlop={6}
            >
              <ArrowUpDown size={18} color={colors.onSurface} strokeWidth={2.2} />
            </Pressable>
          }
        />
      </View>

      {/* Totals summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.tertiaryContainer }]}>
          <Text style={[styles.summaryLabel, { color: colors.onTertiaryContainer }]}>
            Income
          </Text>
          <Text style={[styles.summaryValue, { color: colors.onTertiaryContainer }]}>
            {formatAmount(totalIncome)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.errorContainer }]}>
          <Text style={[styles.summaryLabel, { color: colors.onErrorContainer }]}>
            Expense
          </Text>
          <Text style={[styles.summaryValue, { color: colors.onErrorContainer }]}>
            {formatAmount(totalExpense)}
          </Text>
        </View>
      </View>

      {errorMessage && (
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
          <AlertBar
            tone="error"
            message={errorMessage}
            onClose={() => setErrorMessage(null)}
          />
        </View>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <View
          style={[styles.searchBox, { backgroundColor: colors.surfaceVariant }]}
        >
          <Search size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
          <TextInput
            placeholder="Search transactions"
            placeholderTextColor={colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.onSurface }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <X size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            selected={filterType === f.key}
            onPress={() => setFilterType(f.key)}
          />
        ))}
      </ScrollView>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredTransactions().length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions yet"
          message={
            searchQuery
              ? "Try a different search term"
              : "Add your first transaction to get started."
          }
          action={
            !searchQuery
              ? {
                  label: "Add transaction",
                  onPress: () => router.push("/transaction-modal"),
                }
              : undefined
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 120,
            gap: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {groupedTransactions.map((group) => (
            <View key={group.date} style={{ gap: spacing.sm }}>
              <Text
                style={[styles.dateHeader, { color: colors.onSurfaceVariant }]}
              >
                {formatDate(group.date, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
              <Card variant="elevated" padding={0} radiusSize="xl">
                {group.data.map((t, idx) => {
                  const Icon = getIcon(t.type);
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => handleEditTransaction(t)}
                      onLongPress={() => {
                        setSelectedTransaction(t);
                        setShowActionSheet(true);
                      }}
                    >
                      {({ pressed }) => (
                        <View
                          style={[
                            styles.txnRow,
                            {
                              borderBottomColor: colors.outlineVariant,
                              borderBottomWidth:
                                idx < group.data.length - 1
                                  ? StyleSheet.hairlineWidth
                                  : 0,
                              opacity: pressed ? 0.6 : 1,
                            },
                          ]}
                        >
                          <IconBadge icon={Icon} tone={getTone(t.type)} size="md" />
                          <View style={styles.txnTextBlock}>
                            <Text
                              style={[styles.txnTitle, { color: colors.onSurface }]}
                              numberOfLines={1}
                            >
                              {t.merchant_name || t.description || "Transaction"}
                            </Text>
                            <View style={styles.txnMetaRow}>
                              <Text
                                style={[
                                  styles.txnSub,
                                  { color: colors.onSurfaceVariant },
                                ]}
                              >
                                {formatDate(t.date)}
                              </Text>
                              {t.category && (
                                <Badge
                                  label={t.category.name}
                                  tone="neutral"
                                  size="sm"
                                />
                              )}
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.txnAmount,
                              { color: getAmountColor(t.type) },
                            ]}
                            numberOfLines={1}
                          >
                            {t.type === "expense"
                              ? "−"
                              : t.type === "income"
                                ? "+"
                                : ""}
                            {formatAmount(parseFloat(String(t.amount)) || 0)}
                          </Text>
                          <Pressable
                            onPress={() => {
                              setSelectedTransaction(t);
                              setShowActionSheet(true);
                            }}
                            hitSlop={6}
                          >
                            <MoreVertical
                              size={18}
                              color={colors.onSurfaceVariant}
                              strokeWidth={2}
                            />
                          </Pressable>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </Card>
            </View>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <View
        style={[
          styles.fab,
          { bottom: 20 + insets.bottom },
          shadow.lg,
        ]}
      >
        <Pressable
          onPress={() => router.push("/transaction-modal")}
          style={styles.fabPressable}
        >
          <LinearGradient
            colors={gradients.primary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Plus size={24} color="#ffffff" strokeWidth={2.4} />
        </Pressable>
      </View>

      {/* Action Sheet Modal */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowActionSheet(false)}
        >
          <Pressable
            style={[
              styles.actionSheet,
              { backgroundColor: colors.surface },
              shadow.lg,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedTransaction && (
              <>
                <View style={styles.actionSheetHeader}>
                  <IconBadge
                    icon={getIcon(selectedTransaction.type)}
                    tone={getTone(selectedTransaction.type)}
                    size="lg"
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={[
                        styles.actionTitle,
                        { color: colors.onSurface },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedTransaction.merchant_name ||
                        selectedTransaction.description ||
                        "Transaction"}
                    </Text>
                    <Text
                      style={[
                        styles.actionAmount,
                        { color: getAmountColor(selectedTransaction.type) },
                      ]}
                    >
                      {selectedTransaction.type === "expense"
                        ? "−"
                        : selectedTransaction.type === "income"
                          ? "+"
                          : ""}
                      {formatAmount(
                        parseFloat(String(selectedTransaction.amount)) || 0,
                      )}
                    </Text>
                    <Text
                      style={[styles.actionDate, { color: colors.onSurfaceVariant }]}
                    >
                      {formatDate(selectedTransaction.date, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

                <Pressable
                  onPress={() => {
                    handleEditTransaction(selectedTransaction);
                    setShowActionSheet(false);
                  }}
                  style={({ pressed }) => [
                    styles.actionSheetButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <IconBadge icon={Edit3} tone="primary" size="sm" />
                  <Text
                    style={[styles.actionBtnText, { color: colors.onSurface }]}
                  >
                    Edit transaction
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowActionSheet(false);
                    setTimeout(() => setShowDeleteConfirm(true), 150);
                  }}
                  style={({ pressed }) => [
                    styles.actionSheetButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <IconBadge icon={Trash2} tone="danger" size="sm" />
                  <Text
                    style={[styles.actionBtnText, { color: colors.error }]}
                  >
                    Delete transaction
                  </Text>
                </Pressable>

                <Button
                  label="Cancel"
                  variant="secondary"
                  fullWidth
                  onPress={() => setShowActionSheet(false)}
                  style={{ marginTop: spacing.md }}
                />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowDeleteConfirm(false)}
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
              Delete transaction?
            </Text>
            <Text style={[styles.confirmText, { color: colors.onSurfaceVariant }]}>
              This action cannot be undone. The transaction will be permanently
              removed.
            </Text>
            <View style={styles.confirmButtons}>
              <Button
                label="Cancel"
                variant="secondary"
                fullWidth
                onPress={() => setShowDeleteConfirm(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Delete"
                variant="destructive"
                fullWidth
                loading={deleteMutation.isPending}
                onPress={() => {
                  if (selectedTransaction) {
                    deleteMutation.mutate(selectedTransaction.id);
                  }
                  setShowDeleteConfirm(false);
                  setSelectedTransaction(null);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrap: {
    paddingHorizontal: spacing.lg,
  },
  sortBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    height: 46,
    borderRadius: radius.pill,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  filters: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dateHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: spacing.xs,
  },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  txnTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  txnTitle: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  txnMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  txnSub: {
    fontSize: 12,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: "700",
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
    justifyContent: "flex-end",
  },
  actionSheet: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.xxl,
    gap: spacing.md,
  },
  actionSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  actionAmount: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  actionDate: {
    fontSize: 12,
    fontWeight: "500",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  actionSheetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  confirmCard: {
    margin: spacing.xl,
    padding: spacing.xxl,
    borderRadius: radius.xxl,
    alignItems: "center",
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: "auto",
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
  confirmButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    alignSelf: "stretch",
  },
});
