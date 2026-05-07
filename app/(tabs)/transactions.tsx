import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  useQuery,
  useQueryClient,
  useMutation,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronDown,
  CreditCard,
  Edit3,
  Plus,
  Check,
  Clock,
  Mail,
  Receipt,
  Search,
  SlidersHorizontal,
  Trash2,
  Wallet,
  X,
  LucideIcon,
} from "lucide-react-native";
import { RectButton, Swipeable } from "react-native-gesture-handler";

import { useTheme } from "../../src/contexts/ThemeContext";
import { useCurrency } from "../../src/contexts/CurrencyContext";
import { useToast } from "../../src/contexts/NotificationContext";
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
import { BrandStrip } from "../../src/components";
import transactionService from "../../src/services/transactionService";
import accountService from "../../src/services/accountService";
import settingsService from "../../src/services/settingsService";
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
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const routeParams = useLocalSearchParams<{
    dateFrom?: string;
    dateTo?: string;
    type?: string;
    category?: string;
    search?: string;
    amountMin?: string;
    amountMax?: string;
    account?: string;
  }>();

  // Pick up the deep-link's initial values so the first render is already
  // filtered. Subsequent route param changes are handled in a useEffect below.
  const initialSearch = (() => {
    const search = routeParams?.search?.toString().trim();
    if (search) return search;
    const category = routeParams?.category?.toString().trim();
    if (category) return category;
    return "";
  })();
  const initialFilterType: FilterType = (() => {
    const t = routeParams?.type?.toString().trim();
    if (t === "income" || t === "expense" || t === "transfer" || t === "asset" || t === "liability") {
      return t;
    }
    return "all";
  })();

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filterType, setFilterType] = useState<FilterType>(initialFilterType);
  const [filterChanging, setFilterChanging] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set());
  // Status view: 'approved' = ledger (default), 'pending_review' = drafts
  // (email + schedule), 'rejected' = previously dismissed drafts.
  const [statusView, setStatusView] = useState<"approved" | "pending_review" | "rejected">("approved");
  const [sourceView, setSourceView] = useState<"all" | "email" | "schedule">("all");
  const [rejectTarget, setRejectTarget] = useState<Transaction | null>(null);
  const pendingDeleteTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [period, setPeriod] = useState<PeriodRange>(() => {
    const from = routeParams?.dateFrom?.toString();
    const to = routeParams?.dateTo?.toString();
    if (from || to) {
      const start = from ? new Date(from) : new Date(2000, 0, 1);
      const end = to ? new Date(to + "T23:59:59") : new Date();
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return computePeriodRange("custom_range", { start, end });
      }
    }
    return computePeriodRange("this_month");
  });
  const [periodFilterActive, setPeriodFilterActive] = useState(
    Boolean(routeParams?.dateFrom || routeParams?.dateTo)
  );
  const [pendingPeriod, setPendingPeriod] = useState<PeriodRange | null>(null);

  // Re-apply route params when they change (deep-link arriving while the
  // screen is already mounted, e.g. tapping View Transactions on chat).
  useEffect(() => {
    const search = routeParams?.search?.toString().trim();
    const category = routeParams?.category?.toString().trim();
    const t = routeParams?.type?.toString().trim();
    const from = routeParams?.dateFrom?.toString();
    const to = routeParams?.dateTo?.toString();

    if (search || category) {
      setSearchQuery(search || category || "");
    }
    if (t === "income" || t === "expense" || t === "transfer" || t === "asset" || t === "liability") {
      setFilterType(t);
    }
    if (from || to) {
      const start = from ? new Date(from) : new Date(2000, 0, 1);
      const end = to ? new Date(to + "T23:59:59") : new Date();
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        setPeriod(computePeriodRange("custom_range", { start, end }));
        setPeriodFilterActive(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    routeParams?.dateFrom,
    routeParams?.dateTo,
    routeParams?.type,
    routeParams?.category,
    routeParams?.search,
  ]);

  const handleOpenPeriodModal = useCallback(() => {
    setPendingPeriod(period);
    setPeriodModalVisible(true);
  }, [period]);

  const handleClosePeriodModal = useCallback(() => {
    setPeriodModalVisible(false);
    if (pendingPeriod && pendingPeriod !== period) {
      setPeriod(pendingPeriod);
      setPeriodFilterActive(pendingPeriod.preset !== "all");
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
    onError: (error: Error, id) => {
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      pendingDeleteTimers.current.delete(id);
      toast.error(error.message || "Could not delete transaction");
    },
  });

  const UNDO_WINDOW_MS = 4500;

  const handleDeleteWithUndo = useCallback(
    (transaction: Transaction) => {
      const id = transaction.id;
      const existingTimer = pendingDeleteTimers.current.get(id);
      if (existingTimer) clearTimeout(existingTimer);

      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      const timer = setTimeout(() => {
        pendingDeleteTimers.current.delete(id);
        deleteMutation.mutate(id);
      }, UNDO_WINDOW_MS);
      pendingDeleteTimers.current.set(id, timer);

      const label = transaction.merchant_name || transaction.description || "Transaction";
      toast.info(`${label} deleted`, {
        duration: UNDO_WINDOW_MS,
        action: {
          label: "Undo",
          onPress: () => {
            const t = pendingDeleteTimers.current.get(id);
            if (t) clearTimeout(t);
            pendingDeleteTimers.current.delete(id);
            setPendingDeleteIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          },
        },
      });
    },
    [deleteMutation, toast],
  );

  useEffect(() => {
    const timers = pendingDeleteTimers.current;
    return () => {
      timers.forEach((timer, id) => {
        clearTimeout(timer);
        deleteMutation.mutate(id);
      });
      timers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const PAGE_SIZE = 20;
  const apiDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const activeSearch = searchQuery.trim();
  const periodQueryRange = useMemo(() => {
    if (!periodFilterActive || period.preset === "all") {
      return { startDate: undefined, endDate: undefined };
    }

    return {
      startDate: apiDate(period.start),
      endDate: apiDate(period.end),
    };
  }, [period, periodFilterActive]);

  const {
    data: transactionPages,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "transactions",
      "infinite",
      filterType,
      activeSearch,
      periodQueryRange.startDate,
      periodQueryRange.endDate,
      statusView,
      sourceView,
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const filters: Record<string, unknown> = {
        page: pageParam as number,
        per_page: PAGE_SIZE,
        type: filterType !== "all" ? filterType : undefined,
        start_date: periodQueryRange.startDate,
        end_date: periodQueryRange.endDate,
        search: activeSearch || undefined,
        sort_by: "id",
        sort_order: "desc",
        status: statusView,
      };
      if (statusView === "pending_review" && sourceView !== "all") {
        filters.source = sourceView;
      }
      const result = await transactionService.getAll(filters as any);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to load transactions");
      }
      const payload = result.data as any;
      // Handle Laravel-paginated response wrapped in either { data: { data, current_page, ... } } or directly
      const meta =
        payload?.data?.current_page !== undefined
          ? payload.data
          : payload?.current_page !== undefined
            ? payload
            : null;
      let data: Transaction[] = [];
      if (meta && Array.isArray(meta.data)) {
        data = meta.data;
      } else if (Array.isArray(payload?.data)) {
        data = payload.data;
      } else if (Array.isArray(payload)) {
        data = payload;
      }
      return {
        data,
        currentPage: meta?.current_page ?? (pageParam as number),
        lastPage: meta?.last_page ?? (pageParam as number),
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.currentPage < lastPage.lastPage
        ? lastPage.currentPage + 1
        : undefined,
  });

  const transactions = useMemo(() => {
    const seen = new Set<number>();
    return (
      transactionPages?.pages.flatMap((p) =>
        [...p.data]
          .sort((a, b) => {
            const dateDiff =
              new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateDiff !== 0) return dateDiff;
            return Number(b.id) - Number(a.id);
          })
          .filter((transaction) => {
            if (seen.has(transaction.id)) return false;
            seen.add(transaction.id);
            return true;
          }),
      ) ?? []
    );
  }, [transactionPages]);

  const statsRange = useMemo(() => {
    if (period.preset === "all") {
      return { start: undefined, end: undefined };
    }

    return {
      start: apiDate(period.start),
      end: apiDate(period.end),
    };
  }, [period]);

  // Pending-review count for the status pill badge
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["transactions", "pending_review", "count"],
    queryFn: async () => {
      const res = await transactionService.getAll({ status: "pending_review", per_page: 1 } as any);
      const payload = res?.data as any;
      return Number(payload?.data?.total ?? payload?.total ?? 0);
    },
    refetchInterval: 15000,
  });

  // User's inbound email alias — surfaced when viewing pending drafts
  const { data: settingsData } = useQuery({
    queryKey: ["settings", "me"],
    queryFn: async () => {
      const res = await settingsService.get();
      if (!res?.success) return null;
      return (res.data as any)?.data || (res.data as any);
    },
  });
  const inboundAddress = (settingsData as any)?.inbound_email_address as string | undefined;

  // Reject draft mutation
  const rejectDraftMutation = useMutation({
    mutationFn: (id: number) => transactionService.reject(id),
    onSuccess: async (res) => {
      if (!res?.success) {
        toast.error("Could not reject draft");
        return;
      }
      toast.success("Draft rejected");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: () => toast.error("Reject failed"),
  });

  const { data: summaryStats } = useQuery({
    queryKey: [
      "transactions",
      "summary-stats",
      statsRange.start,
      statsRange.end,
    ],
    queryFn: async () => {
      const result = await transactionService.getAll({
        start_date: statsRange.start,
        end_date: statsRange.end,
        per_page: 1,
      });
      if (result.success && result.data) {
        const payload = result.data as any;
        const stats = payload?.stats;
        if (stats) {
          return {
            income: Number(stats.total_income) || 0,
            expenses: Number(stats.total_expenses) || 0,
          };
        }
      }
      return { income: 0, expenses: 0 };
    },
  });

  const periodPool = useMemo(() => {
    if (!periodFilterActive || period.preset === "all") return transactions;
    const start = period.start.getTime();
    const end = period.end.getTime();
    return transactions.filter((t) => {
      const d = new Date(t.date).getTime();
      return d >= start && d <= end;
    });
  }, [transactions, period, periodFilterActive]);

  const filteredTransactions = useCallback(() => {
    let filtered = periodPool.filter((t) => !pendingDeleteIds.has(t.id));
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
    return filtered;
  }, [periodPool, searchQuery, filterType, pendingDeleteIds]);

  const getIcon = (type: TransactionType): LucideIcon => {
    switch (type) {
      case "income":
        return ArrowDownLeft;
      case "expense":
        return ArrowUpRight;
      case "transfer":
        return ArrowLeftRight;
      case "asset":
        return Wallet;
      case "liability":
        return CreditCard;
      default:
        return Receipt;
    }
  };

  const getTone = (type: TransactionType) => {
    switch (type) {
      case "income":
        return "success" as const;
      case "expense":
        return "danger" as const;
      case "transfer":
        return "primary" as const;
      case "asset":
        return "success" as const;
      case "liability":
        return "warning" as const;
      default:
        return "neutral" as const;
    }
  };

  const getAmountColor = (type: TransactionType) => {
    switch (type) {
      case "income":
        return colors.tertiary;
      case "expense":
        return colors.error;
      default:
        return colors.onSurface;
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

  const totalIncome = summaryStats?.income ?? 0;
  const totalExpense = summaryStats?.expenses ?? 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <BrandStrip />
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
        <SummaryCard isDark={isDark}>
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryLead}>
              <View style={styles.summaryIconWrap}>
                <ArrowDownLeft
                  size={16}
                  color="#34d399"
                  strokeWidth={2.4}
                />
              </View>
              <Text style={styles.summaryLabel}>Total Income</Text>
            </View>
          </View>
          <Text
            style={[styles.summaryValue, { color: "#34d399" }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {formatAmount(totalIncome)}
          </Text>
        </SummaryCard>
        <SummaryCard isDark={isDark}>
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryLead}>
              <View style={styles.summaryIconWrap}>
                <ArrowUpRight
                  size={16}
                  color="#fb923c"
                  strokeWidth={2.4}
                />
              </View>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
            </View>
          </View>
          <Text
            style={[styles.summaryValue, { color: "#fb923c" }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {formatAmount(totalExpense)}
          </Text>
        </SummaryCard>
      </View>

      {errorMessage && (
        <View
          style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}
        >
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

      {/* Status pills — Ledger / Pending review / Rejected */}
      <View style={styles.statusPillsRow}>
        <Pressable
          onPress={() => setStatusView("approved")}
          style={[
            styles.statusPill,
            statusView === "approved" && { backgroundColor: colors.primary },
            { borderColor: colors.outlineVariant },
          ]}
          hitSlop={6}
        >
          <Check
            size={13}
            color={statusView === "approved" ? colors.onPrimary : colors.onSurfaceVariant}
            strokeWidth={2.4}
          />
          <Text
            style={[
              styles.statusPillLabel,
              { color: statusView === "approved" ? colors.onPrimary : colors.onSurfaceVariant },
            ]}
          >
            Ledger
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setStatusView("pending_review")}
          style={[
            styles.statusPill,
            statusView === "pending_review" && { backgroundColor: colors.primary },
            { borderColor: colors.outlineVariant },
          ]}
          hitSlop={6}
        >
          <View style={[styles.pendingDot, { backgroundColor: "#f59e0b" }]} />
          <Text
            style={[
              styles.statusPillLabel,
              { color: statusView === "pending_review" ? colors.onPrimary : colors.onSurfaceVariant },
            ]}
          >
            Pending
          </Text>
          {pendingCount > 0 && (
            <View
              style={[
                styles.statusPillBadge,
                {
                  backgroundColor:
                    statusView === "pending_review" ? "rgba(255,255,255,0.25)" : "#ef4444",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillBadgeText,
                  { color: statusView === "pending_review" ? colors.onPrimary : "#fff" },
                ]}
              >
                {pendingCount > 99 ? "99+" : pendingCount}
              </Text>
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={() => setStatusView("rejected")}
          style={[
            styles.statusPill,
            statusView === "rejected" && { backgroundColor: colors.primary },
            { borderColor: colors.outlineVariant },
          ]}
          hitSlop={6}
        >
          <X
            size={13}
            color={statusView === "rejected" ? colors.onPrimary : colors.onSurfaceVariant}
            strokeWidth={2.4}
          />
          <Text
            style={[
              styles.statusPillLabel,
              { color: statusView === "rejected" ? colors.onPrimary : colors.onSurfaceVariant },
            ]}
          >
            Rejected
          </Text>
        </Pressable>
      </View>

      {/* Drafts mode: alias card + source pills */}
      {statusView === "pending_review" && inboundAddress && (
        <View
          style={[
            styles.aliasCard,
            { backgroundColor: isDark ? "rgba(37, 99, 235, 0.18)" : "rgba(59, 130, 246, 0.08)", borderColor: isDark ? "rgba(96, 165, 250, 0.35)" : "rgba(59, 130, 246, 0.25)" },
          ]}
        >
          <View style={styles.aliasIconBox}>
            <Mail size={16} color="#fff" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.aliasLabel, { color: colors.onSurfaceVariant }]}>
              Your AccountE email
            </Text>
            <Text
              selectable
              style={[styles.aliasValue, { color: colors.onSurface }]}
              numberOfLines={1}
            >
              {inboundAddress}
            </Text>
            <Text style={[styles.aliasHelp, { color: colors.onSurfaceVariant }]}>
              Forward receipts here — long-press to copy
            </Text>
          </View>
        </View>
      )}

      {statusView === "pending_review" && (
        <View style={styles.sourceTabsRow}>
          {(["all", "email", "schedule"] as const).map((src) => {
            const active = sourceView === src;
            return (
              <Pressable
                key={src}
                onPress={() => setSourceView(src)}
                style={[
                  styles.sourceTab,
                  active && { backgroundColor: colors.primary },
                ]}
                hitSlop={6}
              >
                <Text
                  style={[
                    styles.sourceTabLabel,
                    { color: active ? colors.onPrimary : colors.onSurfaceVariant },
                  ]}
                >
                  {src === "all" ? "All" : src === "email" ? "Email" : "Schedule"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

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
      ) : groupedTransactions.length === 0 ? (
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
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;
            const distanceFromBottom =
              contentSize.height - (contentOffset.y + layoutMeasurement.height);
            if (
              distanceFromBottom < 600 &&
              hasNextPage &&
              !isFetchingNextPage
            ) {
              fetchNextPage();
            }
          }}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {groupedTransactions.map((group, groupIndex) => (
            <View
              key={`${group.date}-${group.data[0]?.id ?? groupIndex}`}
              style={{ gap: spacing.xs }}
            >
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
                    onOpen={() => setExpandedRowId(t.id)}
                    onClose={() =>
                      setExpandedRowId((prev) => (prev === t.id ? null : prev))
                    }
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
                      // In pending-review mode, swipe-delete becomes "reject"
                      // instead of permanent deletion. Confirms via modal.
                      if (statusView === "pending_review") {
                        setRejectTarget(t);
                      } else {
                        handleDeleteWithUndo(t);
                      }
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
          {isFetchingNextPage && (
            <View style={styles.paginationLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
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
                      style={[styles.actionTitle, { color: colors.onSurface }]}
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
                      style={[
                        styles.actionDate,
                        { color: colors.onSurfaceVariant },
                      ]}
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
                    <X size={18} color={colors.onSurface} strokeWidth={2.4} />
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.outlineVariant },
                  ]}
                />

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
                    if (selectedTransaction) {
                      const t = selectedTransaction;
                      setSelectedTransaction(null);
                      setTimeout(() => handleDeleteWithUndo(t), 150);
                    }
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

      {/* Reject draft confirmation modal */}
      <Modal
        visible={!!rejectTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectTarget(null)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: "rgba(0,0,0,0.55)" }]}
          onPress={() => setRejectTarget(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.rejectModal,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}
          >
            <Text style={{ fontSize: 36, marginBottom: 8 }}>⚠️</Text>
            <Text style={[styles.rejectModalTitle, { color: colors.onSurface }]}>
              Reject draft
            </Text>
            <Text style={[styles.rejectModalText, { color: colors.onSurfaceVariant }]}>
              {rejectTarget?.merchant_name
                ? `Reject the draft for "${rejectTarget.merchant_name}"?`
                : "Reject this draft?"}
            </Text>
            <Text style={[styles.rejectModalNote, { color: colors.onSurfaceVariant }]}>
              It won't be added to your ledger. You can still see rejected drafts under the Rejected tab.
            </Text>
            <View style={styles.rejectModalActions}>
              <Pressable
                onPress={() => setRejectTarget(null)}
                style={[
                  styles.rejectModalBtn,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.outlineVariant,
                  },
                ]}
              >
                <Text style={{ color: colors.onSurface, fontWeight: "600" }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (rejectTarget) {
                    rejectDraftMutation.mutate(rejectTarget.id);
                  }
                  setRejectTarget(null);
                }}
                style={[styles.rejectModalBtn, { backgroundColor: "#dc2626" }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Reject</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const ACTION_WIDTH = 132;
const TRANSACTION_ROW_HEIGHT = 72;

interface TransactionRowProps {
  t: Transaction;
  isLast: boolean;
  expanded: boolean;
  onOpen: () => void;
  onClose: () => void;
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
  onOpen,
  onClose,
  onLongPress,
  onEdit,
  onDelete,
  icon,
  tone,
  amountColor,
  formatAmount,
  colors,
}: TransactionRowProps) {
  const swipeableRef = React.useRef<Swipeable>(null);

  React.useEffect(() => {
    if (!expanded) {
      swipeableRef.current?.close();
    }
  }, [expanded]);

  const handleRowPress = () => {
    if (expanded) {
      swipeableRef.current?.close();
      onClose();
      return;
    }

    swipeableRef.current?.openRight();
    onOpen();
  };

  const renderRightActions = () => (
    <View style={styles.slideActions}>
      <RectButton
        onPress={() => {
          swipeableRef.current?.close();
          onEdit();
        }}
        rippleColor="rgba(255,255,255,0.2)"
        style={[styles.slideAction, { backgroundColor: colors.primary }]}
      >
        <View style={styles.slideActionContent}>
          <Edit3 size={20} color="#ffffff" strokeWidth={2.4} />
          <Text style={styles.slideActionLabel}>Edit</Text>
        </View>
      </RectButton>
      <RectButton
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
        rippleColor="rgba(255,255,255,0.2)"
        style={[styles.slideAction, { backgroundColor: colors.error }]}
      >
        <View style={styles.slideActionContent}>
          <Trash2 size={20} color="#ffffff" strokeWidth={2.4} />
          <Text style={styles.slideActionLabel}>Delete</Text>
        </View>
      </RectButton>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={ACTION_WIDTH * 0.35}
      overshootRight={false}
      friction={1}
      overshootFriction={8}
      dragOffsetFromRightEdge={5}
      onSwipeableWillOpen={onOpen}
      onSwipeableClose={onClose}
      childrenContainerStyle={[
        styles.txnSwipeContent,
        { backgroundColor: colors.surface },
      ]}
      containerStyle={[
        styles.txnRowOuter,
        {
          borderBottomColor: colors.outlineVariant,
          borderBottomWidth: !isLast ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      <Pressable
        onPress={handleRowPress}
        onLongPress={onLongPress}
        style={{ backgroundColor: colors.surface }}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.txnRow,
              {
                backgroundColor: colors.surface,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
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
                  <Badge label={t.category.name} tone="neutral" size="sm" />
                )}
              </View>
            </View>
            <Text
              style={[styles.txnAmount, { color: amountColor }]}
              numberOfLines={1}
            >
              {t.type === "expense" ? "−" : t.type === "income" ? "+" : ""}
              {formatAmount(parseFloat(String(t.amount)) || 0)}
            </Text>
          </View>
        )}
      </Pressable>
    </Swipeable>
  );
}

function SummaryCard({
  isDark,
  children,
}: {
  isDark: boolean;
  children: React.ReactNode;
}) {
  if (isDark) {
    return (
      <View style={[styles.summaryCard, { backgroundColor: "#0f213d" }]}>
        <View
          style={[
            styles.summaryGlowA,
            { backgroundColor: "#6366f1", opacity: 0.22 },
          ]}
          pointerEvents="none"
        />
        {children}
      </View>
    );
  }
  return (
    <LinearGradient
      colors={gradients.ocean as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.summaryCard}
    >
      <View
        style={[
          styles.summaryGlowA,
          { backgroundColor: "#22d3ee", opacity: 0.45 },
        ]}
        pointerEvents="none"
      />
      {children}
    </LinearGradient>
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
    paddingVertical: 8,
    borderRadius: radius.lg,
    gap: 1,
    minHeight: 72,
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  summaryGlowA: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -50,
    right: -40,
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
    width: 26,
    height: 26,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    flexShrink: 1,
    color: "rgba(255,255,255,0.75)",
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: 2,
    width: "100%",
    textAlign: "center",
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
  statusPillsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusPillLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillBadge: {
    minWidth: 18,
    paddingHorizontal: 6,
    height: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  statusPillBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  aliasCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  aliasIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  aliasLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  aliasValue: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  aliasHelp: {
    fontSize: 11,
    marginTop: 1,
  },
  sourceTabsRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sourceTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
  },
  sourceTabLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  rejectModal: {
    width: "100%",
    maxWidth: 360,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
  },
  rejectModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  rejectModalText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 6,
  },
  rejectModalNote: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    marginBottom: 18,
  },
  rejectModalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  rejectModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
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
    minHeight: TRANSACTION_ROW_HEIGHT,
  },
  txnSwipeContent: {
    minHeight: TRANSACTION_ROW_HEIGHT,
  },
  paginationLoader: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: TRANSACTION_ROW_HEIGHT,
    paddingVertical: spacing.sm,
  },
  slideActions: {
    width: ACTION_WIDTH,
    flexDirection: "row",
    height: TRANSACTION_ROW_HEIGHT,
    backgroundColor: "#ef4444",
  },
  slideAction: {
    width: ACTION_WIDTH / 2,
    height: TRANSACTION_ROW_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  slideActionContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  slideActionLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "center",
    includeFontPadding: false,
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
