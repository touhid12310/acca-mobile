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
  ChevronDown,
  CreditCard,
  Edit3,
  MoreVertical,
  Plus,
  Receipt,
  Search,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  Wallet,
  X,
  LucideIcon,
} from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

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
  PeriodModal,
  computePeriodRange,
  PeriodRange,
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
  const { colors, isDark } = useTheme();
  // Soft translucent tint for dark mode, full container colors for light mode.
  const incomeBg = isDark ? `${colors.tertiary}26` : colors.tertiaryContainer;
  const expenseBg = isDark ? `${colors.error}26` : colors.errorContainer;
  const incomeFg = isDark ? colors.tertiary : colors.onTertiaryContainer;
  const expenseFg = isDark ? colors.error : colors.onErrorContainer;
  const summaryIconBg = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(255,255,255,0.55)";
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterChanging, setFilterChanging] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [period, setPeriod] = useState<PeriodRange>(() =>
    computePeriodRange("all"),
  );
  const [pendingPeriod, setPendingPeriod] = useState<PeriodRange | null>(null);

  const handleOpenPeriodModal = useCallback(() => {
    setPendingPeriod(period);
    setPeriodModalVisible(true);
  }, [period]);

  const handleClosePeriodModal = useCallback(() => {
    setPeriodModalVisible(false);
    if (pendingPeriod && pendingPeriod !== period) {
      setPeriod(pendingPeriod);
    }
    setPendingPeriod(null);
  }, [pendingPeriod, period]);

  const handleFilterPress = useCallback(
    (key: FilterType) => {
      if (key === filterType) return;
      setFilterChanging(true);
      setFilterType(key);
      setTimeout(() => setFilterChanging(false), 300);
    },
    [filterType],
  );

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
    queryKey: ["transactions", "all"],
    queryFn: async () => {
      const result = await transactionService.getAll({ per_page: 5000 });
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

  const periodPool = useMemo(() => {
    if (period.preset === "all") return transactions;
    const start = period.start.getTime();
    const end = period.end.getTime();
    return transactions.filter((t) => {
      const d = new Date(t.date).getTime();
      return d >= start && d <= end;
    });
  }, [transactions, period]);

  const filteredTransactions = useCallback(() => {
    let filtered = [...periodPool];
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
  }, [periodPool, searchQuery, sortBy, sortOrder, filterType]);

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

  const totalIncome = useMemo(() => {
    return periodPool
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (parseFloat(String(t.amount)) || 0), 0);
  }, [periodPool]);

  const totalExpense = useMemo(() => {
    return periodPool
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + (parseFloat(String(t.amount)) || 0), 0);
  }, [periodPool]);

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
              onPress={handleOpenPeriodModal}
              style={[
                styles.periodBtn,
                { backgroundColor: colors.surfaceVariant },
              ]}
              hitSlop={6}
            >
              <SlidersHorizontal
                size={14}
                color={colors.onSurface}
                strokeWidth={2.4}
              />
              <Text
                style={[styles.periodBtnLabel, { color: colors.onSurface }]}
                numberOfLines={1}
              >
                {period.label}
              </Text>
              <ChevronDown
                size={14}
                color={colors.onSurfaceVariant}
                strokeWidth={2.4}
              />
            </Pressable>
          }
        />
      </View>

      <PeriodModal
        visible={periodModalVisible}
        onClose={handleClosePeriodModal}
        current={pendingPeriod ?? period}
        onSelect={(range) => setPendingPeriod(range)}
      />

      {/* Totals summary */}
      <View style={styles.summaryRow}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: incomeBg },
          ]}
        >
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryLead}>
              <View
                style={[
                  styles.summaryIconWrap,
                  { backgroundColor: summaryIconBg },
                ]}
              >
                <ArrowDownLeft
                  size={18}
                  color={colors.tertiary}
                  strokeWidth={2.4}
                />
              </View>
              <Text style={[styles.summaryLabel, { color: incomeFg }]}>
                Total Income
              </Text>
            </View>
          </View>
          <Text
            style={[styles.summaryValue, { color: incomeFg }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {formatAmount(totalIncome)}
          </Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: expenseBg },
          ]}
        >
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryLead}>
              <View
                style={[
                  styles.summaryIconWrap,
                  { backgroundColor: summaryIconBg },
                ]}
              >
                <ArrowUpRight size={18} color={colors.error} strokeWidth={2.4} />
              </View>
              <Text style={[styles.summaryLabel, { color: expenseFg }]}>
                Total Expenses
              </Text>
            </View>
          </View>
          <Text
            style={[styles.summaryValue, { color: expenseFg }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
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
      <View style={styles.filterShell}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          keyboardShouldPersistTaps="handled"
        >
          {FILTERS.map((f) => {
            const active = filterType === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => handleFilterPress(f.key)}
                style={[
                  styles.filterPill,
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
                    styles.filterPillLabel,
                    {
                      color: active
                        ? colors.onPrimary
                        : colors.onSurfaceVariant,
                    },
                  ]}
                  numberOfLines={1}
                  allowFontScaling={false}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading || filterChanging ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredTransactions().length === 0 ? (
        <View style={styles.emptyStateWrap}>
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            message={
              searchQuery
                ? "Try a different search term"
                : "Tap the + button to add your first transaction."
            }
            compact
          />
        </View>
      ) : (
        <ScrollView
          style={{ backgroundColor: "transparent" }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 120,
            gap: spacing.sm,
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
            <View key={group.date} style={{ gap: spacing.xs }}>
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
                {group.data.map((t, idx) => (
                  <TransactionRow
                    key={t.id}
                    t={t}
                    isLast={idx === group.data.length - 1}
                    expanded={expandedRowId === t.id}
                    onToggleExpand={() =>
                      setExpandedRowId((prev) => (prev === t.id ? null : t.id))
                    }
                    onPressRow={() => handleEditTransaction(t)}
                    onLongPress={() => {
                      setExpandedRowId(null);
                      setSelectedTransaction(t);
                      setShowActionSheet(true);
                    }}
                    onEdit={() => {
                      setExpandedRowId(null);
                      handleEditTransaction(t);
                    }}
                    onDelete={() => {
                      setExpandedRowId(null);
                      setSelectedTransaction(t);
                      setShowDeleteConfirm(true);
                    }}
                    icon={getIcon(t.type)}
                    tone={getTone(t.type)}
                    amountColor={getAmountColor(t.type)}
                    formatAmount={formatAmount}
                    colors={colors}
                  />
                ))}
              </Card>
            </View>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <View
        style={[
          styles.fab,
          {
            bottom: 20 + insets.bottom,
            backgroundColor: colors.primary,
          },
          shadow.lg,
        ]}
      >
        <Pressable
          onPress={() => router.push("/transaction-modal")}
          style={styles.fabPressable}
          android_ripple={{
            color: "rgba(255,255,255,0.25)",
            borderless: true,
            radius: 28,
          }}
        >
          <LinearGradient
            colors={gradients.primary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
          />
          <Plus size={26} color="#ffffff" strokeWidth={2.6} />
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
                  <Pressable
                    onPress={() => setShowActionSheet(false)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.actionSheetClose,
                      {
                        backgroundColor: colors.surfaceVariant,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <X
                      size={18}
                      color={colors.onSurface}
                      strokeWidth={2.4}
                    />
                  </Pressable>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

                <Pressable
                  onPress={() => {
                    handleEditTransaction(selectedTransaction);
                    setShowActionSheet(false);
                  }}
                  style={({ pressed }) => [
                    styles.actionSheetButton,
                    {
                      backgroundColor: pressed
                        ? colors.surfaceVariant
                        : "transparent",
                    },
                  ]}
                >
                  <IconBadge icon={Edit3} tone="primary" size="sm" />
                  <Text
                    style={[styles.actionBtnText, { color: colors.onSurface }]}
                    numberOfLines={1}
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
                    {
                      backgroundColor: pressed
                        ? colors.surfaceVariant
                        : "transparent",
                    },
                  ]}
                >
                  <IconBadge icon={Trash2} tone="danger" size="sm" />
                  <Text
                    style={[styles.actionBtnText, { color: colors.error }]}
                    numberOfLines={1}
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

const ACTION_WIDTH = 132;

interface TransactionRowProps {
  t: Transaction;
  isLast: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onPressRow: () => void;
  onLongPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  icon: LucideIcon;
  tone: "primary" | "success" | "danger" | "warning" | "info" | "neutral";
  amountColor: string;
  formatAmount: (n: number) => string;
  colors: ReturnType<typeof useTheme>["colors"];
}

function TransactionRow({
  t,
  isLast,
  expanded,
  onToggleExpand,
  onPressRow,
  onLongPress,
  onEdit,
  onDelete,
  icon,
  tone,
  amountColor,
  formatAmount,
  colors,
}: TransactionRowProps) {
  const translateX = useSharedValue(0);

  React.useEffect(() => {
    translateX.value = withTiming(expanded ? -ACTION_WIDTH : 0, {
      duration: 220,
    });
  }, [expanded, translateX]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        styles.txnRowOuter,
        {
          borderBottomColor: colors.outlineVariant,
          borderBottomWidth: !isLast ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      {/* Action panel revealed by sliding the row left */}
      <View style={[styles.slideActions, { width: ACTION_WIDTH }]}>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            styles.slideAction,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Edit3 size={18} color="#ffffff" strokeWidth={2.4} />
          <Text style={styles.slideActionLabel}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.slideAction,
            {
              backgroundColor: colors.error,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Trash2 size={18} color="#ffffff" strokeWidth={2.4} />
          <Text style={styles.slideActionLabel}>Delete</Text>
        </Pressable>
      </View>

      {/* Foreground row that slides */}
      <Animated.View style={[{ backgroundColor: colors.surface }, slideStyle]}>
        <Pressable
          onPress={expanded ? onToggleExpand : onPressRow}
          onLongPress={onLongPress}
        >
          {({ pressed }) => (
            <View style={[styles.txnRow, { opacity: pressed ? 0.6 : 1 }]}>
              <IconBadge icon={icon} tone={tone} size="md" />
              <View style={styles.txnTextBlock}>
                <Text
                  style={[styles.txnTitle, { color: colors.onSurface }]}
                  numberOfLines={1}
                >
                  {t.merchant_name || t.description || "Transaction"}
                </Text>
                <View style={styles.txnMetaRow}>
                  <Text
                    style={[styles.txnSub, { color: colors.onSurfaceVariant }]}
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
                style={[styles.txnAmount, { color: amountColor }]}
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
                onPress={onToggleExpand}
                hitSlop={8}
                style={styles.moreBtn}
              >
                {expanded ? (
                  <X
                    size={18}
                    color={colors.onSurfaceVariant}
                    strokeWidth={2}
                  />
                ) : (
                  <MoreVertical
                    size={18}
                    color={colors.onSurfaceVariant}
                    strokeWidth={2}
                  />
                )}
              </Pressable>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
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
  periodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    maxWidth: 180,
    minHeight: 36,
  },
  periodBtnLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    flexShrink: 1,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingBottom: 5,
  },
  summaryCard: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.lg,
    gap: 1,
    minHeight: 72,
    justifyContent: "flex-start",
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  summaryLead: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: spacing.xs,
  },
  summaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    flexShrink: 1,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: 2,
    width: "100%",
    textAlign: "center",
  },
  summaryHint: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: 0,
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
  filterShell: {
    height: 54,
    marginBottom: 4,
    justifyContent: "center",
  },
  filters: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
  },
  filterPill: {
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  filterPillLabel: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateWrap: {
    minHeight: 320,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  emptyActionButton: {
    marginTop: spacing.lg,
    minWidth: 170,
    height: 50,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  emptyActionGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyActionLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  dateHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: spacing.xs,
  },
  txnRowOuter: {
    position: "relative",
    overflow: "hidden",
  },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  moreBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  slideActions: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "stretch",
  },
  slideAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  slideActionLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
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
    borderRadius: 28,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fabPressable: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
  actionSheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
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
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
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
