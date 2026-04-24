import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
  ActivityIndicator,
  Text,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { LineChart, PieChart } from "react-native-gifted-charts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Receipt,
  Sparkles,
  SlidersHorizontal,
  User2,
  Wallet,
} from "lucide-react-native";

import { useAuth } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useCurrency } from "../../src/contexts/CurrencyContext";
import {
  Card,
  SectionHeader,
  IconBadge,
  EmptyState,
  ProgressBar,
  Badge,
  PeriodModal,
  computePeriodRange,
  PeriodRange,
} from "../../src/components/ui";
import dashboardService, {
  DashboardData,
} from "../../src/services/dashboardService";
import transactionService from "../../src/services/transactionService";
import { formatRelativeTime } from "../../src/utils/date";
import { gradients, radius, shadow, spacing } from "../../src/constants/theme";

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { formatAmount } = useCurrency();
  const [balanceHidden, setBalanceHidden] = React.useState(false);

  const {
    data: dashboardData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<DashboardData> => {
      const result = await dashboardService.getDashboardData();
      if (result.success && result.data) {
        const data = result.data as DashboardData | { data: DashboardData };
        if ("totalBalance" in data) return data;
        return (data as { data: DashboardData }).data;
      }
      throw new Error(result.error || "Failed to load dashboard");
    },
  });

  const stats = dashboardData || null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const maskAmount = (value: number) =>
    balanceHidden ? "••••••" : formatAmount(value);

  // Period filter state + modal
  const [periodModalVisible, setPeriodModalVisible] = React.useState(false);
  const [period, setPeriod] = React.useState<PeriodRange>(() =>
    computePeriodRange("this_month"),
  );

  const toApiDate = (d: Date) => d.toISOString().split("T")[0];

  // Fetch period-specific transactions to compute income/expense totals
  const { data: periodTotals } = useQuery<{
    income: number;
    expenses: number;
  }>({
    queryKey: [
      "dashboard-period",
      period.preset,
      toApiDate(period.start),
      toApiDate(period.end),
    ],
    queryFn: async () => {
      const result = await transactionService.getAll({
        start_date: toApiDate(period.start),
        end_date: toApiDate(period.end),
        per_page: 1000,
      });
      let rows: any[] = [];
      if (result.success && result.data) {
        const payload: any = result.data;
        if (Array.isArray(payload?.data?.data)) rows = payload.data.data;
        else if (Array.isArray(payload?.data)) rows = payload.data;
        else if (Array.isArray(payload)) rows = payload;
      }
      let income = 0;
      let expenses = 0;
      for (const t of rows) {
        const amount = parseFloat(String(t.amount)) || 0;
        if (t.type === "income") income += amount;
        else if (t.type === "expense") expenses += amount;
      }
      return { income, expenses };
    },
  });

  const displayedIncome =
    period.preset === "this_month"
      ? stats?.monthlyIncome || 0
      : periodTotals?.income || 0;
  const displayedExpenses =
    period.preset === "this_month"
      ? stats?.monthlyExpenses || 0
      : periodTotals?.expenses || 0;

  // Last month totals — for trend comparison
  const lastMonthRange = React.useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { start, end };
  }, []);

  const { data: lastMonthTotals } = useQuery<{
    income: number;
    expenses: number;
  }>({
    queryKey: [
      "dashboard-last-month",
      toApiDate(lastMonthRange.start),
      toApiDate(lastMonthRange.end),
    ],
    queryFn: async () => {
      const result = await transactionService.getAll({
        start_date: toApiDate(lastMonthRange.start),
        end_date: toApiDate(lastMonthRange.end),
        per_page: 1000,
      });
      let rows: any[] = [];
      if (result.success && result.data) {
        const payload: any = result.data;
        if (Array.isArray(payload?.data?.data)) rows = payload.data.data;
        else if (Array.isArray(payload?.data)) rows = payload.data;
        else if (Array.isArray(payload)) rows = payload;
      }
      let income = 0;
      let expenses = 0;
      for (const t of rows) {
        const amount = parseFloat(String(t.amount)) || 0;
        if (t.type === "income") income += amount;
        else if (t.type === "expense") expenses += amount;
      }
      return { income, expenses };
    },
  });

  const trend = React.useMemo(() => {
    const prevNet =
      (lastMonthTotals?.income || 0) - (lastMonthTotals?.expenses || 0);
    const currNet = displayedIncome - displayedExpenses;
    if (prevNet === 0) return null;
    const change = ((currNet - prevNet) / Math.abs(prevNet)) * 100;
    return {
      pct: Math.abs(change).toFixed(1),
      up: change >= 0,
    };
  }, [displayedIncome, displayedExpenses, lastMonthTotals]);

  // Cashflow trend (weekly / monthly / yearly)
  type Granularity = "weekly" | "monthly" | "yearly";
  const [granularity, setGranularity] = React.useState<Granularity>("monthly");

  type SeriesKey = "income" | "expense" | "asset" | "liability";
  const [activeSeries, setActiveSeries] = React.useState<Set<SeriesKey>>(
    new Set(["income", "expense", "asset", "liability"]),
  );
  const toggleSeries = (k: SeriesKey) => {
    setActiveSeries((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const cashFlowRange = React.useMemo(() => {
    const now = new Date();
    if (granularity === "weekly") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7 * 6 + 1);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    if (granularity === "yearly") {
      const start = new Date(now.getFullYear() - 5, 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      return { start, end };
    }
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }, [granularity]);

  const { data: cashFlow } = useQuery<
    { label: string; income: number; expense: number; asset: number; liability: number }[]
  >({
    queryKey: [
      "dashboard-cashflow",
      granularity,
      toApiDate(cashFlowRange.start),
      toApiDate(cashFlowRange.end),
    ],
    queryFn: async () => {
      const result = await transactionService.getAll({
        start_date: toApiDate(cashFlowRange.start),
        end_date: toApiDate(cashFlowRange.end),
        per_page: 5000,
      });
      let rows: any[] = [];
      if (result.success && result.data) {
        const payload: any = result.data;
        if (Array.isArray(payload?.data?.data)) rows = payload.data.data;
        else if (Array.isArray(payload?.data)) rows = payload.data;
        else if (Array.isArray(payload)) rows = payload;
      }

      const MONTHS = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const now = new Date();
      const buckets: Array<{
        label: string;
        start: Date;
        end: Date;
        income: number;
        expense: number;
        asset: number;
        liability: number;
      }> = [];

      if (granularity === "weekly") {
        for (let i = 5; i >= 0; i--) {
          const end = new Date(now);
          end.setDate(end.getDate() - 7 * i);
          const start = new Date(end);
          start.setDate(start.getDate() - 6);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59);
          buckets.push({
            label: `${MONTHS[start.getMonth()]} ${start.getDate()}`,
            start,
            end,
            income: 0,
            expense: 0,
            asset: 0,
            liability: 0,
          });
        }
      } else if (granularity === "yearly") {
        for (let i = 5; i >= 0; i--) {
          const year = now.getFullYear() - i;
          const start = new Date(year, 0, 1);
          const end = new Date(year, 11, 31, 23, 59, 59);
          buckets.push({
            label: String(year),
            start,
            end,
            income: 0,
            expense: 0,
            asset: 0,
            liability: 0,
          });
        }
      } else {
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const start = new Date(d.getFullYear(), d.getMonth(), 1);
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
          buckets.push({
            label: MONTHS[d.getMonth()],
            start,
            end,
            income: 0,
            expense: 0,
            asset: 0,
            liability: 0,
          });
        }
      }

      for (const t of rows) {
        const d = new Date(t.date);
        const amount = parseFloat(String(t.amount)) || 0;
        const bucket = buckets.find((b) => d >= b.start && d <= b.end);
        if (!bucket) continue;
        if (t.type === "income") bucket.income += amount;
        else if (t.type === "expense") bucket.expense += amount;
        else if (t.type === "asset") bucket.asset += amount;
        else if (t.type === "liability") bucket.liability += amount;
      }

      return buckets.map(({ label, income, expense, asset, liability }) => ({
        label,
        income,
        expense,
        asset,
        liability,
      }));
    },
  });

  const makeLineData = React.useCallback(
    (key: SeriesKey) => {
      if (!cashFlow) return [];
      return cashFlow.map((b) => ({
        value: b[key],
        label: b.label,
        labelTextStyle: {
          color: colors.onSurfaceVariant,
          fontSize: 10,
        },
      }));
    },
    [cashFlow, colors.onSurfaceVariant],
  );

  const chartMaxValue = React.useMemo(() => {
    if (!cashFlow || cashFlow.length === 0) return 100;
    let max = 0;
    cashFlow.forEach((b) => {
      if (activeSeries.has("income")) max = Math.max(max, b.income);
      if (activeSeries.has("expense")) max = Math.max(max, b.expense);
      if (activeSeries.has("asset")) max = Math.max(max, b.asset);
      if (activeSeries.has("liability")) max = Math.max(max, b.liability);
    });
    return max === 0 ? 100 : Math.ceil((max * 1.2) / 100) * 100;
  }, [cashFlow, activeSeries]);

  const mtdNetCashflow = React.useMemo(() => {
    if (!cashFlow || cashFlow.length === 0) return 0;
    const last = cashFlow[cashFlow.length - 1];
    return last.income - last.expense;
  }, [cashFlow]);

  // Expense breakdown granularity — independent of cashflow
  const [breakdownGranularity, setBreakdownGranularity] =
    React.useState<Granularity>("monthly");

  const breakdownRange = React.useMemo(() => {
    const now = new Date();
    if (breakdownGranularity === "weekly") {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    if (breakdownGranularity === "yearly") {
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      };
    }
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }, [breakdownGranularity]);

  const breakdownLabel = React.useMemo(() => {
    const MONTHS = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const now = new Date();
    if (breakdownGranularity === "weekly") return "this week";
    if (breakdownGranularity === "yearly") return String(now.getFullYear());
    return MONTHS[now.getMonth()];
  }, [breakdownGranularity]);

  const { data: expenseByCategory } = useQuery<
    { name: string; amount: number }[]
  >({
    queryKey: [
      "dashboard-expense-breakdown",
      breakdownGranularity,
      toApiDate(breakdownRange.start),
      toApiDate(breakdownRange.end),
    ],
    queryFn: async () => {
      const result = await transactionService.getAll({
        start_date: toApiDate(breakdownRange.start),
        end_date: toApiDate(breakdownRange.end),
        type: "expense",
        per_page: 2000,
      });
      let rows: any[] = [];
      if (result.success && result.data) {
        const payload: any = result.data;
        if (Array.isArray(payload?.data?.data)) rows = payload.data.data;
        else if (Array.isArray(payload?.data)) rows = payload.data;
        else if (Array.isArray(payload)) rows = payload;
      }
      const totals = new Map<string, number>();
      for (const t of rows) {
        if (t.type !== "expense") continue;
        let categoryName = t.category?.name;
        if (!categoryName && t.transaction_categories?.length > 0) {
          categoryName = t.transaction_categories[0].category?.name;
        }
        categoryName = categoryName || "Uncategorized";
        const amount = parseFloat(String(t.amount)) || 0;
        totals.set(categoryName, (totals.get(categoryName) || 0) + amount);
      }
      return Array.from(totals.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);
    },
  });

  const categoryPalette = [
    "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9",
    "#8b5cf6", "#f43f5e", "#fb923c", "#14b8a6", "#a855f7",
  ];

  const pieData = React.useMemo(() => {
    if (!expenseByCategory || expenseByCategory.length === 0) return [];
    const top = expenseByCategory.slice(0, 6);
    const rest = expenseByCategory.slice(6);
    const restTotal = rest.reduce((sum, c) => sum + c.amount, 0);
    const final = restTotal > 0
      ? [...top, { name: "Other", amount: restTotal }]
      : top;
    return final.map((c, idx) => ({
      value: c.amount,
      color: categoryPalette[idx % categoryPalette.length],
      gradientCenterColor: categoryPalette[idx % categoryPalette.length],
      text: c.name,
    }));
  }, [expenseByCategory]);

  const totalExpenseForPie = React.useMemo(
    () => (expenseByCategory || []).reduce((s, c) => s + c.amount, 0),
    [expenseByCategory],
  );

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
        {/* Greeting Row */}
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.greetingLabel, { color: colors.onSurfaceVariant }]}
            >
              {getGreeting()}
            </Text>
            <Text style={[styles.greetingName, { color: colors.onSurface }]}>
              {user?.name?.split(" ")[0] || "there"} 👋
            </Text>
          </View>
          <Pressable
            style={[
              styles.avatarContainer,
              { backgroundColor: colors.surfaceVariant },
            ]}
            onPress={() => router.push("/(tabs)/more")}
          >
            {user?.profile_picture_url ? (
              <Image
                source={{ uri: user.profile_picture_url }}
                style={styles.avatarImage}
              />
            ) : (
              <User2 size={22} color={colors.onSurface} strokeWidth={2} />
            )}
          </Pressable>
        </View>

        {/* Hero Balance Card — Premium card design */}
        <View style={[styles.hero, shadow.lg]}>
          {/* Decorative soft glow blobs */}
          <View style={styles.heroGlowA} pointerEvents="none" />
          <View style={styles.heroGlowB} pointerEvents="none" />

          {/* Top row */}
          <View style={styles.heroTop}>
            <View style={styles.heroLabelCluster}>
              <Text style={styles.heroLabel}>Total balance</Text>
              <Pressable
                onPress={() => setBalanceHidden((v) => !v)}
                hitSlop={6}
              >
                {balanceHidden ? (
                  <EyeOff
                    size={15}
                    color="rgba(255,255,255,0.7)"
                    strokeWidth={2.2}
                  />
                ) : (
                  <Eye
                    size={15}
                    color="rgba(255,255,255,0.7)"
                    strokeWidth={2.2}
                  />
                )}
              </Pressable>
            </View>
            <Pressable
              onPress={() => setPeriodModalVisible(true)}
              hitSlop={6}
              style={styles.heroPeriodBtn}
            >
              <Text style={styles.heroPeriodText} numberOfLines={1}>
                {period.label}
              </Text>
              <ChevronDown
                size={13}
                color="rgba(255,255,255,0.9)"
                strokeWidth={2.4}
              />
            </Pressable>
          </View>

          {/* Big balance */}
          <Text style={styles.heroValue}>
            {maskAmount(stats?.netWorth || 0)}
          </Text>

          {/* Trend */}
          {trend && (
            <View style={styles.heroTrend}>
              <Text
                style={[
                  styles.heroTrendPct,
                  { color: trend.up ? "#34d399" : "#f87171" },
                ]}
              >
                {trend.up ? "↑" : "↓"} {trend.pct}%
              </Text>
              <Text style={styles.heroTrendText}>vs last month</Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.heroSeparator} />

          {/* Bottom row: income/expense + view accounts */}
          <View style={styles.heroBottom}>
            <View style={styles.heroTotals}>
              <View>
                <Text style={styles.heroTotalLabel}>Income</Text>
                <Text
                  style={[styles.heroTotalValue, { color: "#34d399" }]}
                  numberOfLines={1}
                >
                  {maskAmount(displayedIncome)}
                </Text>
              </View>
              <View style={styles.heroTotalsSpacer} />
              <View>
                <Text style={styles.heroTotalLabel}>Expenses</Text>
                <Text
                  style={[styles.heroTotalValue, { color: "#fb923c" }]}
                  numberOfLines={1}
                >
                  {maskAmount(displayedExpenses)}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push("/accounts")}
              hitSlop={4}
              style={styles.viewAccountsBtn}
            >
              <Text style={styles.viewAccountsText}>Accounts</Text>
              <ChevronRight
                size={14}
                color="#ffffff"
                strokeWidth={2.4}
              />
            </Pressable>
          </View>
        </View>

        <PeriodModal
          visible={periodModalVisible}
          onClose={() => setPeriodModalVisible(false)}
          current={period}
          onSelect={(range) => {
            setPeriod(range);
          }}
        />

        {/* Cashflow Trend */}
        {cashFlow && cashFlow.length > 0 && (
          <View style={styles.section}>
            <View
              style={[
                styles.chartCard,
                { backgroundColor: colors.surface },
                shadow.sm,
              ]}
            >
              {/* Header: title + granularity toggle */}
              <View style={styles.chartHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[styles.chartTitle, { color: colors.onSurface }]}
                  >
                    Cashflow Trend
                  </Text>
                  <Text
                    style={[
                      styles.chartSubtitle,
                      { color: colors.onSurfaceVariant },
                    ]}
                    numberOfLines={2}
                  >
                    Income, expenses, assets & liabilities across last 6{" "}
                    {granularity === "weekly"
                      ? "weeks"
                      : granularity === "yearly"
                        ? "years"
                        : "months"}
                  </Text>
                </View>
                <GranularityToggle
                  value={granularity}
                  onChange={setGranularity}
                />
              </View>

              {/* Series filter chips */}
              <View style={styles.seriesChipsRow}>
                {SERIES_DEFS.map((s) => {
                  const active = activeSeries.has(s.key);
                  return (
                    <Pressable
                      key={s.key}
                      onPress={() => toggleSeries(s.key)}
                      style={[
                        styles.seriesChip,
                        {
                          backgroundColor: active
                            ? colors.surfaceVariant
                            : "transparent",
                          borderColor: active
                            ? "transparent"
                            : colors.outlineVariant,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.seriesChipDot,
                          {
                            backgroundColor: active ? s.color : "transparent",
                            borderColor: s.color,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.seriesChipText,
                          {
                            color: active
                              ? colors.onSurface
                              : colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Line chart */}
              <View style={styles.lineChartWrap}>
                <LineChart
                  data={
                    activeSeries.has("income") ? makeLineData("income") : []
                  }
                  data2={
                    activeSeries.has("expense") ? makeLineData("expense") : []
                  }
                  data3={
                    activeSeries.has("asset") ? makeLineData("asset") : []
                  }
                  data4={
                    activeSeries.has("liability")
                      ? makeLineData("liability")
                      : []
                  }
                  color1="#10b981"
                  color2="#f43f5e"
                  color3="#3b82f6"
                  color4="#14b8a6"
                  thickness={2.5}
                  curved
                  areaChart
                  startFillColor1="#10b981"
                  endFillColor1="#10b981"
                  startOpacity1={0.25}
                  endOpacity1={0.02}
                  startFillColor2="#f43f5e"
                  endFillColor2="#f43f5e"
                  startOpacity2={0.22}
                  endOpacity2={0.02}
                  startFillColor3="#3b82f6"
                  endFillColor3="#3b82f6"
                  startOpacity3={0.2}
                  endOpacity3={0.02}
                  startFillColor4="#14b8a6"
                  endFillColor4="#14b8a6"
                  startOpacity4={0.2}
                  endOpacity4={0.02}
                  hideDataPoints={false}
                  dataPointsRadius={3}
                  dataPointsColor1="#10b981"
                  dataPointsColor2="#f43f5e"
                  dataPointsColor3="#3b82f6"
                  dataPointsColor4="#14b8a6"
                  maxValue={chartMaxValue}
                  noOfSections={4}
                  yAxisThickness={0}
                  xAxisThickness={0}
                  yAxisTextStyle={{
                    color: colors.onSurfaceVariant,
                    fontSize: 10,
                  }}
                  xAxisLabelTextStyle={{
                    color: colors.onSurfaceVariant,
                    fontSize: 10,
                  }}
                  rulesType="solid"
                  rulesColor={colors.outlineVariant}
                  height={160}
                  width={Dimensions.get("window").width - spacing.lg * 4}
                  initialSpacing={10}
                  endSpacing={10}
                  spacing={
                    (Dimensions.get("window").width - spacing.lg * 4 - 20) /
                    Math.max((cashFlow?.length || 1) - 1, 1)
                  }
                  isAnimated
                  animationDuration={700}
                  disableScroll
                />
              </View>

              {/* Summary footer */}
              <View
                style={[
                  styles.cashflowFooter,
                  {
                    backgroundColor:
                      mtdNetCashflow >= 0
                        ? colors.tertiaryContainer
                        : colors.errorContainer,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cashflowFooterAmount,
                    {
                      color:
                        mtdNetCashflow >= 0 ? colors.tertiary : colors.error,
                    },
                  ]}
                >
                  {mtdNetCashflow < 0 ? "− " : ""}
                  {formatAmount(Math.abs(mtdNetCashflow))}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.cashflowFooterTitle,
                      { color: colors.onSurface },
                    ]}
                  >
                    {mtdNetCashflow >= 0 ? "Positive" : "Negative"} period
                    cashflow
                  </Text>
                  <Text
                    style={[
                      styles.cashflowFooterSub,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Net cashflow for latest {granularity === "weekly"
                      ? "week"
                      : granularity === "yearly"
                        ? "year"
                        : "month"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Expense Breakdown */}
        {pieData.length > 0 && (
          <View style={styles.section}>
            <View
              style={[
                styles.chartCard,
                { backgroundColor: colors.surface },
                shadow.sm,
              ]}
            >
              {/* Header: title row + granularity toggle */}
              <View style={styles.breakdownHeaderRow}>
                <Text
                  style={[styles.chartTitle, { color: colors.onSurface }]}
                >
                  Expense Breakdown
                </Text>
                <GranularityToggle
                  value={breakdownGranularity}
                  onChange={setBreakdownGranularity}
                />
              </View>
              <Text
                style={[
                  styles.chartSubtitle,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Top categories for {breakdownLabel}
              </Text>

              {/* Donut - centered */}
              <View style={styles.donutWrap}>
                <PieChart
                  data={pieData}
                  donut
                  radius={90}
                  innerRadius={62}
                  showGradient
                  focusOnPress
                  strokeColor={colors.surface}
                  strokeWidth={2}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: "center" }}>
                      <Text
                        style={[
                          styles.pieCenterLabel,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        Total
                      </Text>
                      <Text
                        style={[
                          styles.pieCenterValue,
                          { color: colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {maskAmount(totalExpenseForPie)}
                      </Text>
                      <Text
                        style={[
                          styles.pieCenterPeriod,
                          { color: colors.onSurfaceVariant },
                        ]}
                        numberOfLines={1}
                      >
                        {breakdownLabel}
                      </Text>
                    </View>
                  )}
                />
              </View>

              {/* Legend — full width below the donut */}
              <View style={styles.pieLegendGrid}>
                {pieData.map((slice, idx) => {
                  const pct =
                    totalExpenseForPie > 0
                      ? ((slice.value / totalExpenseForPie) * 100).toFixed(1)
                      : "0";
                  return (
                    <View key={idx} style={styles.pieLegendItem}>
                      <View
                        style={[
                          styles.pieLegendDot,
                          { backgroundColor: slice.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.pieLegendName,
                          { color: colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {slice.text}
                      </Text>
                      <Text
                        style={[
                          styles.pieLegendPct,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {maskAmount(slice.value)} · {pct}%
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Leading category insight */}
              {pieData[0] && (
                <View
                  style={[
                    styles.insightFooter,
                    { backgroundColor: colors.surfaceVariant },
                  ]}
                >
                  <View
                    style={[
                      styles.insightDot,
                      { backgroundColor: pieData[0].color },
                    ]}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        styles.insightTitleText,
                        { color: colors.onSurface },
                      ]}
                      numberOfLines={1}
                    >
                      {pieData[0].text} is leading this period
                    </Text>
                    <Text
                      style={[
                        styles.insightSubText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {totalExpenseForPie > 0
                        ? (
                            (pieData[0].value / totalExpenseForPie) *
                            100
                          ).toFixed(1)
                        : "0"}
                      % of total expenses
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Budget Summary */}
        {stats?.budgetSummary && (
          <View style={styles.section}>
            <SectionHeader
              title="Budget overview"
              actionLabel="Details"
              onActionPress={() => router.push("/budgets")}
            />
            <Card variant="elevated" padding="lg" radiusSize="xl">
              <View style={styles.budgetHeader}>
                <View>
                  <Text
                    style={[styles.budgetLabel, { color: colors.onSurfaceVariant }]}
                  >
                    Spent this month
                  </Text>
                  <Text style={[styles.budgetSpent, { color: colors.onSurface }]}>
                    {maskAmount(stats.budgetSummary.total_spent)}
                  </Text>
                </View>
                <Badge
                  label={`${Math.round(
                    (stats.budgetSummary.total_spent /
                      Math.max(stats.budgetSummary.total_budgeted, 1)) *
                      100,
                  )}% used`}
                  tone={
                    stats.budgetSummary.total_spent >
                    stats.budgetSummary.total_budgeted
                      ? "danger"
                      : "primary"
                  }
                  size="md"
                />
              </View>
              <ProgressBar
                value={stats.budgetSummary.total_spent}
                max={Math.max(stats.budgetSummary.total_budgeted, 1)}
                gradient={gradients.primary as unknown as readonly [string, string]}
                height={10}
              />
              <View style={styles.budgetFooter}>
                <Text
                  style={[
                    styles.budgetFooterText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Budget {maskAmount(stats.budgetSummary.total_budgeted)}
                </Text>
                <Text
                  style={[styles.budgetFooterText, { color: colors.tertiary }]}
                >
                  {maskAmount(stats.budgetSummary.remaining)} left
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <SectionHeader
            title="Recent activity"
            actionLabel="See all"
            onActionPress={() => router.push("/(tabs)/transactions")}
          />
          <Card variant="elevated" padding={0} radiusSize="xl">
            {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
              stats.recentTransactions.slice(0, 5).map((t, idx) => {
                const isIncome = t.type === "income";
                return (
                  <Pressable
                    key={t.id}
                    onPress={() =>
                      router.push(`/(tabs)/transactions?id=${t.id}`)
                    }
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.txnRow,
                          {
                            borderBottomColor: colors.outlineVariant,
                            borderBottomWidth:
                              idx < (stats.recentTransactions?.length || 0) - 1
                                ? StyleSheet.hairlineWidth
                                : 0,
                            opacity: pressed ? 0.6 : 1,
                          },
                        ]}
                      >
                        <IconBadge
                          icon={isIncome ? ArrowDownLeft : ArrowUpRight}
                          tone={isIncome ? "success" : "danger"}
                          size="md"
                        />
                        <View style={styles.txnTextBlock}>
                          <Text
                            style={[styles.txnTitle, { color: colors.onSurface }]}
                            numberOfLines={1}
                          >
                            {t.merchant_name || t.description || "Transaction"}
                          </Text>
                          <Text
                            style={[
                              styles.txnSub,
                              { color: colors.onSurfaceVariant },
                            ]}
                          >
                            {formatRelativeTime(t.date)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.txnAmount,
                            {
                              color: isIncome ? colors.tertiary : colors.onSurface,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {isIncome ? "+" : "−"}
                          {maskAmount(t.amount)}
                        </Text>
                        <ChevronRight
                          size={16}
                          color={colors.onSurfaceVariant}
                          strokeWidth={2}
                        />
                      </View>
                    )}
                  </Pressable>
                );
              })
            ) : (
              <EmptyState
                icon={Receipt}
                title="No transactions yet"
                message="Start tracking by adding your first expense or income."
                compact
              />
            )}
          </Card>
        </View>

        {/* AI Insights Teaser */}
        <Pressable onPress={() => router.push("/(tabs)/chat")}>
          <LinearGradient
            colors={gradients.ocean as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.insightCard, shadow.md]}
          >
            <View style={styles.insightIcon}>
              <Sparkles size={20} color="#ffffff" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightTitle}>Ask the AI assistant</Text>
              <Text style={styles.insightSub}>
                Get instant insights about your spending
              </Text>
            </View>
            <ChevronRight size={20} color="#ffffff" strokeWidth={2.2} />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type SeriesKeyInternal = "income" | "expense" | "asset" | "liability";
type GranularityInternal = "weekly" | "monthly" | "yearly";

const SERIES_DEFS: {
  key: SeriesKeyInternal;
  label: string;
  color: string;
}[] = [
  { key: "income", label: "Income", color: "#10b981" },
  { key: "expense", label: "Expenses", color: "#f43f5e" },
  { key: "asset", label: "Assets", color: "#3b82f6" },
  { key: "liability", label: "Liabilities", color: "#14b8a6" },
];

function GranularityToggle({
  value,
  onChange,
}: {
  value: GranularityInternal;
  onChange: (v: GranularityInternal) => void;
}) {
  const { colors } = useTheme();
  const options: { key: GranularityInternal; label: string }[] = [
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "yearly", label: "Yearly" },
  ];
  return (
    <View
      style={[
        granularityStyles.container,
        { backgroundColor: colors.surfaceVariant },
      ]}
    >
      {options.map((o) => {
        const active = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              granularityStyles.segment,
              active && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                granularityStyles.segmentText,
                {
                  color: active ? colors.onPrimary : colors.onSurfaceVariant,
                  fontWeight: active ? "700" : "600",
                },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const granularityStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 999,
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  segmentText: {
    fontSize: 11,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  greetingLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  greetingName: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
  },
  hero: {
    backgroundColor: "#0f172a",
    borderRadius: radius.xxl,
    padding: spacing.xl,
    overflow: "hidden",
    gap: 4,
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
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 6,
  },
  heroLabelCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13.5,
    fontWeight: "500",
  },
  heroPeriodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    maxWidth: 140,
  },
  heroPeriodText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "700",
  },
  heroValue: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: 2,
  },
  heroTrend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  heroTrendPct: {
    fontSize: 13,
    fontWeight: "700",
  },
  heroTrendText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12.5,
  },
  heroSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: spacing.md,
  },
  heroBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroTotals: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroTotalsSpacer: {
    width: spacing.xl,
  },
  heroTotalLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11.5,
    fontWeight: "500",
  },
  heroTotalValue: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 2,
  },
  viewAccountsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  viewAccountsText: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "600",
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: radius.md,
    padding: 10,
    gap: spacing.sm,
    marginTop: 4,
  },
  heroFooterItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  heroIconCircle: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  heroDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  heroFooterLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  heroFooterValue: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: "700",
    marginTop: 1,
  },
  section: {
    gap: spacing.md,
  },
  chartCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  chartSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  seriesChipsRow: {
    flexDirection: "row",
    gap: 5,
  },
  seriesChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  seriesChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  seriesChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  lineChartWrap: {
    overflow: "hidden",
    marginLeft: -spacing.sm,
  },
  cashflowFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  cashflowFooterAmount: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  cashflowFooterTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  cashflowFooterSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  insightFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  insightDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  insightTitleText: {
    fontSize: 13,
    fontWeight: "700",
  },
  insightSubText: {
    fontSize: 11.5,
    marginTop: 2,
  },
  breakdownHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  donutWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  pieCenterLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  pieCenterValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 3,
  },
  pieCenterPeriod: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
    textTransform: "capitalize",
  },
  pieLegendGrid: {
    gap: 8,
  },
  pieLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pieLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pieLegendName: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
  },
  pieLegendPct: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  budgetLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  budgetSpent: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  budgetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  budgetFooterText: {
    fontSize: 12.5,
    fontWeight: "600",
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
    gap: 2,
  },
  txnTitle: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  txnSub: {
    fontSize: 12,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  insightSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12.5,
    marginTop: 2,
  },
});
