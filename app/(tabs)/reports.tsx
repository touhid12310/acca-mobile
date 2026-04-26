import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowUpRight,
  BarChart3,
  Calendar,
  ChartLine,
  ChartPie,
  CreditCard,
  FileText,
  Landmark,
  Minus,
  Receipt,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useCurrency } from "../../src/contexts/CurrencyContext";
import {
  ScreenHeader,
  Card,
  IconBadge,
  EmptyState,
  Badge,
  ThemedDatePicker,
  HeroCard,
} from "../../src/components/ui";
import reportService from "../../src/services/reportService";
import { MonthlySummary, CategoryBreakdown } from "../../src/types";
import { radius, shadow, spacing } from "../../src/constants/theme";

type ReportType = "summary" | "category" | "networth" | "income" | "balance";
type CategoryTypeFilter = "all" | "income" | "expense" | "asset" | "liability";
type PeriodFilter = "monthly" | "quarterly" | "yearly" | "custom";

interface ReportTypeOption {
  value: ReportType;
  label: string;
  icon: LucideIcon;
}

const REPORT_TYPES: ReportTypeOption[] = [
  { value: "summary", label: "Summary", icon: ChartLine },
  { value: "category", label: "Category", icon: ChartPie },
  { value: "networth", label: "Net Worth", icon: TrendingUp },
  { value: "income", label: "P&L", icon: FileText },
  { value: "balance", label: "Balance", icon: Scale },
];

const CATEGORY_PALETTE = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#F97316",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#6366F1",
];

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();

  const [reportType, setReportType] = useState<ReportType>("summary");
  const [months] = useState(6);

  const [categoryTypeFilter, setCategoryTypeFilter] =
    useState<CategoryTypeFilter>("expense");

  const [incomeStatementPeriod, setIncomeStatementPeriod] =
    useState<PeriodFilter>("monthly");
  const [incomeStartDate, setIncomeStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  const [incomeEndDate, setIncomeEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [balanceSheetDate, setBalanceSheetDate] = useState(new Date());
  const [showBalanceDatePicker, setShowBalanceDatePicker] = useState(false);

  const categoryTypeOptions: { value: CategoryTypeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "income", label: "Income" },
    { value: "expense", label: "Expense" },
    { value: "asset", label: "Asset" },
    { value: "liability", label: "Liability" },
  ];

  const periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: "monthly", label: "This Month" },
    { value: "quarterly", label: "This Quarter" },
    { value: "yearly", label: "This Year" },
    { value: "custom", label: "Custom" },
  ];

  const handlePeriodChange = (period: PeriodFilter) => {
    setIncomeStatementPeriod(period);
    const today = new Date();
    if (period === "monthly") {
      setIncomeStartDate(new Date(today.getFullYear(), today.getMonth(), 1));
      setIncomeEndDate(today);
    } else if (period === "quarterly") {
      const quarter = Math.floor(today.getMonth() / 3);
      setIncomeStartDate(new Date(today.getFullYear(), quarter * 3, 1));
      setIncomeEndDate(today);
    } else if (period === "yearly") {
      setIncomeStartDate(new Date(today.getFullYear(), 0, 1));
      setIncomeEndDate(today);
    }
  };

  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
    isRefetching: isRefetchingSummary,
  } = useQuery({
    queryKey: ["reports", "monthly-summary", months],
    queryFn: async () => {
      const result = await reportService.getMonthlySummary(months);
      if (result.success && result.data) {
        const responseData = result.data as any;
        const data = responseData?.data || responseData;
        if (data && data.labels && Array.isArray(data.labels)) {
          const tableData: MonthlySummary[] = data.labels.map(
            (label: string, index: number) => ({
              month: label,
              income: data.income?.[index] || 0,
              expenses: data.expenses?.[index] || 0,
              net: (data.income?.[index] || 0) - (data.expenses?.[index] || 0),
            }),
          );
          return tableData;
        }
        return Array.isArray(data) ? data : [];
      }
      return [];
    },
    enabled: reportType === "summary",
  });

  const { data: summaryStatsData } = useQuery({
    queryKey: ["reports", "summary-stats", months],
    queryFn: async () => {
      const result = await reportService.getSummaryStats(months);
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData;
      }
      return null;
    },
    enabled: reportType === "summary",
  });

  const {
    data: categoryData,
    isLoading: isLoadingCategory,
    refetch: refetchCategory,
    isRefetching: isRefetchingCategory,
  } = useQuery({
    queryKey: ["reports", "category-breakdown", categoryTypeFilter],
    queryFn: async () => {
      const params =
        categoryTypeFilter !== "all"
          ? { type: categoryTypeFilter as "income" | "expense" }
          : {};
      const result = await reportService.getCategoryBreakdown(params);
      if (result.success && result.data) {
        const responseData = result.data as any;
        const data = responseData?.data || responseData;
        if (data && data.labels && Array.isArray(data.labels)) {
          const tableData: CategoryBreakdown[] = data.labels.map(
            (label: string, index: number) => ({
              category_id: index,
              category_name: label,
              amount: data.values?.[index] || 0,
              color:
                data.colors?.[index] ||
                CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
            }),
          );
          return tableData;
        }
        return Array.isArray(data) ? data : [];
      }
      return [];
    },
    enabled: reportType === "category",
  });

  const {
    data: netWorthData,
    isLoading: isLoadingNetWorth,
    refetch: refetchNetWorth,
    isRefetching: isRefetchingNetWorth,
  } = useQuery({
    queryKey: ["reports", "net-worth-timeline", months],
    queryFn: async () => {
      const result = await reportService.getNetWorthTimeline(months);
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData;
      }
      return null;
    },
    enabled: reportType === "networth",
  });

  const {
    data: incomeStatementData,
    isLoading: isLoadingIncome,
    refetch: refetchIncome,
    isRefetching: isRefetchingIncome,
  } = useQuery({
    queryKey: [
      "reports",
      "income-statement",
      incomeStartDate.toISOString(),
      incomeEndDate.toISOString(),
    ],
    queryFn: async () => {
      const result = await reportService.getIncomeStatement({
        start_date: incomeStartDate.toISOString().split("T")[0],
        end_date: incomeEndDate.toISOString().split("T")[0],
      });
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData;
      }
      return null;
    },
    enabled: reportType === "income",
  });

  const {
    data: balanceSheetData,
    isLoading: isLoadingBalance,
    refetch: refetchBalance,
    isRefetching: isRefetchingBalance,
  } = useQuery({
    queryKey: ["reports", "balance-sheet", balanceSheetDate.toISOString()],
    queryFn: async () => {
      const result = await reportService.getBalanceSheet({
        as_of_date: balanceSheetDate.toISOString().split("T")[0],
      });
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData;
      }
      return null;
    },
    enabled: reportType === "balance",
  });

  const isLoading =
    (reportType === "summary" && isLoadingSummary) ||
    (reportType === "category" && isLoadingCategory) ||
    (reportType === "networth" && isLoadingNetWorth) ||
    (reportType === "income" && isLoadingIncome) ||
    (reportType === "balance" && isLoadingBalance);

  const isRefetching =
    isRefetchingSummary ||
    isRefetchingCategory ||
    isRefetchingNetWorth ||
    isRefetchingIncome ||
    isRefetchingBalance;

  const handleRefresh = () => {
    switch (reportType) {
      case "summary":
        refetchSummary();
        break;
      case "category":
        refetchCategory();
        break;
      case "networth":
        refetchNetWorth();
        break;
      case "income":
        refetchIncome();
        break;
      case "balance":
        refetchBalance();
        break;
    }
  };

  const summaryTotals = useMemo(() => {
    if (!summaryData || summaryData.length === 0) {
      return { income: 0, expenses: 0, net: 0 };
    }
    return summaryData.reduce(
      (acc, month) => ({
        income: acc.income + (month.income || 0),
        expenses: acc.expenses + (month.expenses || 0),
        net: acc.net + (month.net || 0),
      }),
      { income: 0, expenses: 0, net: 0 },
    );
  }, [summaryData]);

  const renderHero = (
    label: string,
    value: number,
    icon: LucideIcon,
    deltaLabel?: string,
    deltaPositive?: boolean,
  ) => {
    const Icon = icon;
    const Delta =
      deltaLabel === undefined
        ? null
        : deltaPositive
          ? TrendingUp
          : TrendingDown;
    return (
      <HeroCard style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <Icon size={22} color="#ffffff" strokeWidth={2.2} />
          </View>
          <View style={styles.heroTopText}>
            <Text style={styles.heroLabel}>{label}</Text>
            <Text style={styles.heroValue} numberOfLines={1}>
              {formatAmount(value)}
            </Text>
            {deltaLabel !== undefined && Delta && (
              <View style={styles.heroDeltaRow}>
                <Delta size={14} color="#ffffff" strokeWidth={2.4} />
                <Text style={styles.heroDeltaText}>{deltaLabel}</Text>
              </View>
            )}
          </View>
        </View>
      </HeroCard>
    );
  };

  const renderFilterPills = <T extends string>(
    value: T,
    options: { value: T; label: string }[],
    onChange: (v: T) => void,
  ) => (
    <View style={styles.pillShell}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
        keyboardShouldPersistTaps="handled"
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[
                styles.pill,
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
                  styles.pillLabel,
                  {
                    color: active ? colors.onPrimary : colors.onSurfaceVariant,
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
  );

  const renderDateButton = (date: Date, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={[styles.dateChip, { backgroundColor: colors.surfaceVariant }]}
    >
      <Calendar size={14} color={colors.onSurfaceVariant} strokeWidth={2.2} />
      <Text style={[styles.dateChipText, { color: colors.onSurface }]}>
        {date.toLocaleDateString()}
      </Text>
    </Pressable>
  );

  const renderStatPair = (
    leftLabel: string,
    leftValue: number,
    leftIcon: LucideIcon,
    leftColor: string,
    rightLabel: string,
    rightValue: number,
    rightIcon: LucideIcon,
    rightColor: string,
  ) => {
    const LeftIcon = leftIcon;
    const RightIcon = rightIcon;
    return (
      <View style={styles.statRow}>
        <Card variant="elevated" padding="lg" radiusSize="xl" style={styles.statCard}>
          <View style={styles.statTopRow}>
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: leftColor + "22" },
              ]}
            >
              <LeftIcon size={18} color={leftColor} strokeWidth={2.4} />
            </View>
          </View>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
            {leftLabel}
          </Text>
          <Text
            style={[styles.statValue, { color: leftColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatAmount(leftValue)}
          </Text>
        </Card>
        <Card variant="elevated" padding="lg" radiusSize="xl" style={styles.statCard}>
          <View style={styles.statTopRow}>
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: rightColor + "22" },
              ]}
            >
              <RightIcon size={18} color={rightColor} strokeWidth={2.4} />
            </View>
          </View>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
            {rightLabel}
          </Text>
          <Text
            style={[styles.statValue, { color: rightColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatAmount(rightValue)}
          </Text>
        </Card>
      </View>
    );
  };

  const renderSectionTitle = (text: string) => (
    <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
      {text}
    </Text>
  );

  const renderMonthlySummary = () => {
    if (!summaryData || summaryData.length === 0) {
      return (
        <EmptyState
          icon={ChartLine}
          title="No data yet"
          message="Add transactions to see monthly trends here."
          compact
        />
      );
    }

    const maxAbs = Math.max(
      1,
      ...summaryData.map((m) =>
        Math.max(m.income || 0, m.expenses || 0, Math.abs(m.net || 0)),
      ),
    );

    return (
      <>
        {renderHero(
          `Net Savings · ${months} mo`,
          summaryTotals.net,
          Wallet,
          summaryTotals.net >= 0 ? "Positive trend" : "Negative trend",
          summaryTotals.net >= 0,
        )}

        {renderStatPair(
          "Total Income",
          summaryTotals.income,
          ArrowDownLeft,
          colors.tertiary,
          "Total Expenses",
          summaryTotals.expenses,
          ArrowUpRight,
          colors.error,
        )}

        {renderSectionTitle("Monthly Breakdown")}
        <Card variant="elevated" padding={0} radiusSize="xl">
          {summaryData.map((m, idx) => {
            const incomeRatio = (m.income || 0) / maxAbs;
            const expenseRatio = (m.expenses || 0) / maxAbs;
            const netPositive = (m.net || 0) >= 0;
            return (
              <View
                key={m.month}
                style={[
                  styles.monthRow,
                  idx < summaryData.length - 1 && {
                    borderBottomColor: colors.outlineVariant,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.monthHeader}>
                  <Text
                    style={[styles.monthLabel, { color: colors.onSurface }]}
                  >
                    {m.month}
                  </Text>
                  <Text
                    style={[
                      styles.monthNet,
                      {
                        color: netPositive ? colors.tertiary : colors.error,
                      },
                    ]}
                  >
                    {netPositive ? "+" : ""}
                    {formatAmount(m.net || 0)}
                  </Text>
                </View>
                <View style={styles.barRow}>
                  <ArrowDownLeft
                    size={12}
                    color={colors.tertiary}
                    strokeWidth={2.4}
                  />
                  <View
                    style={[
                      styles.barTrack,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: colors.tertiary,
                          width: `${Math.max(incomeRatio * 100, 2)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.barValue, { color: colors.onSurfaceVariant }]}
                  >
                    {formatAmount(m.income || 0)}
                  </Text>
                </View>
                <View style={styles.barRow}>
                  <ArrowUpRight
                    size={12}
                    color={colors.error}
                    strokeWidth={2.4}
                  />
                  <View
                    style={[
                      styles.barTrack,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: colors.error,
                          width: `${Math.max(expenseRatio * 100, 2)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.barValue, { color: colors.onSurfaceVariant }]}
                  >
                    {formatAmount(m.expenses || 0)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>

        {summaryStatsData && (
          <>
            {renderSectionTitle(`Statistics · ${months} mo`)}
            <View style={styles.statsGrid}>
              {renderMiniStat(
                "Net Savings",
                formatAmount(summaryStatsData.net_savings || 0),
                colors.primary,
              )}
              {renderMiniStat(
                "Savings Rate",
                `${summaryStatsData.savings_rate || 0}%`,
                colors.primary,
              )}
              {renderMiniStat(
                "Total Assets",
                formatAmount(summaryStatsData.total_assets || 0),
                colors.tertiary,
              )}
              {renderMiniStat(
                "Total Liabilities",
                formatAmount(summaryStatsData.total_liabilities || 0),
                colors.error,
              )}
            </View>
          </>
        )}
      </>
    );
  };

  const renderMiniStat = (label: string, value: string, color: string) => (
    <Card
      key={label}
      variant="elevated"
      padding="md"
      radiusSize="lg"
      style={styles.miniStatCard}
    >
      <Text style={[styles.miniStatLabel, { color: colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text
        style={[styles.miniStatValue, { color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
    </Card>
  );

  const renderCategoryBreakdown = () => {
    const filterRow = renderFilterPills(
      categoryTypeFilter,
      categoryTypeOptions,
      setCategoryTypeFilter,
    );

    if (!categoryData || categoryData.length === 0) {
      return (
        <>
          {filterRow}
          <EmptyState
            icon={ChartPie}
            title="Nothing to chart"
            message="No data available for this category type."
            compact
          />
        </>
      );
    }

    const total = categoryData.reduce(
      (sum, cat) => sum + (cat.amount || 0),
      0,
    );
    const heroIcon =
      categoryTypeFilter === "income"
        ? ArrowDownLeft
        : categoryTypeFilter === "asset"
          ? Landmark
          : categoryTypeFilter === "liability"
            ? CreditCard
            : ArrowUpRight;

    return (
      <>
        {filterRow}
        {renderHero(
          `Total ${
            categoryTypeFilter === "all" ? "Amount" : capitalize(categoryTypeFilter)
          }`,
          total,
          heroIcon,
        )}

        {renderSectionTitle("Breakdown")}
        <Card variant="elevated" padding="lg" radiusSize="xl">
          {categoryData.map((cat, index) => {
            const pct = total > 0 ? ((cat.amount || 0) / total) * 100 : 0;
            const dotColor = cat.color || CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
            return (
              <View
                key={cat.category_id ?? index}
                style={[
                  styles.categoryItem,
                  index < categoryData.length - 1 && {
                    borderBottomColor: colors.outlineVariant,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.categoryHeader}>
                  <View
                    style={[styles.categoryDot, { backgroundColor: dotColor }]}
                  />
                  <Text
                    style={[styles.categoryName, { color: colors.onSurface }]}
                    numberOfLines={1}
                  >
                    {cat.category_name || "Unknown"}
                  </Text>
                  <Text
                    style={[
                      styles.categoryAmount,
                      { color: colors.onSurface },
                    ]}
                  >
                    {formatAmount(cat.amount || 0)}
                  </Text>
                </View>
                <View style={styles.categoryBarRow}>
                  <View
                    style={[
                      styles.barTrack,
                      { backgroundColor: colors.surfaceVariant, flex: 1 },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: dotColor,
                          width: `${Math.max(pct, 2)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.categoryPct, { color: colors.onSurfaceVariant }]}
                  >
                    {pct.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      </>
    );
  };

  const renderNetWorthTimeline = () => {
    const data = netWorthData as {
      labels?: string[];
      netWorth?: number[];
    } | null;

    if (!data || !data.labels || data.labels.length === 0) {
      return (
        <EmptyState
          icon={TrendingUp}
          title="No timeline yet"
          message="Add accounts and transactions to track your net worth over time."
          compact
        />
      );
    }

    const current = data.netWorth?.[data.netWorth.length - 1] || 0;
    const previous = data.netWorth?.[0] || 0;
    const change = current - previous;
    const changePct =
      previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;

    const maxAbs = Math.max(
      1,
      ...(data.netWorth || []).map((v) => Math.abs(v)),
    );

    return (
      <>
        {renderHero(
          "Current Net Worth",
          current,
          Wallet,
          `${change >= 0 ? "+" : ""}${formatAmount(change)} (${changePct.toFixed(1)}%)`,
          change >= 0,
        )}

        {renderSectionTitle("Timeline")}
        <Card variant="elevated" padding="lg" radiusSize="xl">
          {data.labels.map((label, index) => {
            const v = data.netWorth?.[index] || 0;
            const ratio = Math.abs(v) / maxAbs;
            const positive = v >= 0;
            return (
              <View
                key={label}
                style={[
                  styles.timelineRow,
                  index < (data.labels?.length || 0) - 1 && {
                    borderBottomColor: colors.outlineVariant,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.timelineHeader}>
                  <Text
                    style={[styles.timelineLabel, { color: colors.onSurface }]}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[
                      styles.timelineValue,
                      { color: positive ? colors.tertiary : colors.error },
                    ]}
                  >
                    {formatAmount(v)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.barTrack,
                    { backgroundColor: colors.surfaceVariant, marginTop: 8 },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: positive ? colors.tertiary : colors.error,
                        width: `${Math.max(ratio * 100, 2)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </Card>
      </>
    );
  };

  const renderIncomeStatement = () => {
    const filterRow = renderFilterPills(
      incomeStatementPeriod,
      periodOptions,
      handlePeriodChange,
    );

    const data = incomeStatementData as {
      income?: { items?: { category: string; amount: number }[]; total?: number };
      expenses?: { items?: { category: string; amount: number }[]; total?: number };
      net_income?: number;
      profit_margin?: number;
      period?: { start_date: string; end_date: string };
    } | null;

    return (
      <>
        {filterRow}

        {incomeStatementPeriod === "custom" && (
          <View style={styles.customRangeRow}>
            {renderDateButton(incomeStartDate, () => setShowStartPicker(true))}
            <Text style={{ color: colors.onSurfaceVariant }}>to</Text>
            {renderDateButton(incomeEndDate, () => setShowEndPicker(true))}
          </View>
        )}

        {!data ? (
          <EmptyState
            icon={FileText}
            title="No statement"
            message="No data available for the selected period."
            compact
          />
        ) : (
          <>
            {renderHero(
              "Net Income",
              data.net_income || 0,
              Receipt,
              data.profit_margin !== undefined
                ? `Profit margin ${data.profit_margin}%`
                : undefined,
              (data.net_income || 0) >= 0,
            )}

            {renderStatementSection(
              "Revenue / Income",
              ArrowDownLeft,
              colors.tertiary,
              data.income?.items || [],
              data.income?.total || 0,
              "category",
            )}

            {renderStatementSection(
              "Expenses",
              ArrowUpRight,
              colors.error,
              data.expenses?.items || [],
              data.expenses?.total || 0,
              "category",
              true,
            )}
          </>
        )}
      </>
    );
  };

  const renderStatementSection = (
    title: string,
    icon: LucideIcon,
    color: string,
    items: { category?: string; name?: string; amount: number; type?: string }[],
    total: number,
    nameField: "category" | "name",
    parenthesize = false,
  ) => {
    const Icon = icon;
    return (
      <Card variant="elevated" padding="lg" radiusSize="xl" style={{ marginTop: spacing.sm }}>
        <View style={styles.statementHeader}>
          <IconBadge icon={icon} tone={color === colors.error ? "danger" : "success"} size="md" />
          <Text style={[styles.statementTitle, { color: colors.onSurface }]}>
            {title}
          </Text>
          <Text style={[styles.statementTotal, { color }]}>
            {parenthesize ? `(${formatAmount(total)})` : formatAmount(total)}
          </Text>
        </View>
        <View
          style={[
            styles.statementDivider,
            { backgroundColor: colors.outlineVariant },
          ]}
        />
        {items.length === 0 ? (
          <Text style={[styles.statementEmpty, { color: colors.onSurfaceVariant }]}>
            None recorded
          </Text>
        ) : (
          items.map((item, idx) => (
            <View key={idx} style={styles.statementRow}>
              <Text
                style={[styles.statementItemName, { color: colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {item[nameField] || "Unknown"}
              </Text>
              <Text style={[styles.statementItemAmount, { color: colors.onSurface }]}>
                {parenthesize
                  ? `(${formatAmount(item.amount)})`
                  : formatAmount(item.amount)}
              </Text>
            </View>
          ))
        )}
      </Card>
    );
  };

  const renderBalanceSheet = () => {
    const data = balanceSheetData as {
      assets?: {
        total?: number;
        cash_and_bank?: { items: { name: string; type: string; amount: number }[]; total: number };
        other_assets?: { items: { category: string; amount: number }[]; total: number };
        loans_receivable?: { items: { name: string; amount: number }[]; total: number };
      };
      liabilities?: {
        total?: number;
        other_liabilities?: { items: { category: string; amount: number }[]; total: number };
        loans_payable?: { items: { name: string; amount: number }[]; total: number };
      };
      net_worth?: number;
      as_of_date?: string;
    } | null;

    return (
      <>
        <View style={styles.balanceDateRow}>
          <Text style={[styles.balanceDateLabel, { color: colors.onSurfaceVariant }]}>
            As of
          </Text>
          {renderDateButton(balanceSheetDate, () => setShowBalanceDatePicker(true))}
        </View>

        {!data ? (
          <EmptyState
            icon={Scale}
            title="No balance sheet"
            message="No data available for the selected date."
            compact
          />
        ) : (
          <>
            {renderHero("Net Worth", data.net_worth || 0, Wallet)}

            {renderStatPair(
              "Total Assets",
              data.assets?.total || 0,
              Landmark,
              colors.tertiary,
              "Total Liabilities",
              data.liabilities?.total || 0,
              CreditCard,
              colors.error,
            )}

            {renderSectionTitle("Assets")}
            {renderBalanceSubsection(
              "Cash & Bank",
              data.assets?.cash_and_bank?.items.map((i) => ({
                name: i.name,
                meta: i.type,
                amount: i.amount,
              })) || [],
              data.assets?.cash_and_bank?.total || 0,
              colors.tertiary,
            )}
            {renderBalanceSubsection(
              "Other Assets",
              data.assets?.other_assets?.items.map((i) => ({
                name: i.category,
                amount: i.amount,
              })) || [],
              data.assets?.other_assets?.total || 0,
              colors.tertiary,
            )}
            {renderBalanceSubsection(
              "Loans Receivable",
              data.assets?.loans_receivable?.items.map((i) => ({
                name: i.name,
                amount: i.amount,
              })) || [],
              data.assets?.loans_receivable?.total || 0,
              colors.tertiary,
            )}

            {renderSectionTitle("Liabilities")}
            {renderBalanceSubsection(
              "Other Liabilities",
              data.liabilities?.other_liabilities?.items.map((i) => ({
                name: i.category,
                amount: i.amount,
              })) || [],
              data.liabilities?.other_liabilities?.total || 0,
              colors.error,
            )}
            {renderBalanceSubsection(
              "Loans Payable",
              data.liabilities?.loans_payable?.items.map((i) => ({
                name: i.name,
                amount: i.amount,
              })) || [],
              data.liabilities?.loans_payable?.total || 0,
              colors.error,
            )}
          </>
        )}
      </>
    );
  };

  const renderBalanceSubsection = (
    title: string,
    items: { name: string; meta?: string; amount: number }[],
    total: number,
    color: string,
  ) => {
    if (items.length === 0) return null;
    return (
      <Card
        variant="elevated"
        padding="lg"
        radiusSize="xl"
        style={{ marginBottom: spacing.sm }}
      >
        <View style={styles.subsectionHeader}>
          <Text style={[styles.subsectionTitle, { color: colors.onSurface }]}>
            {title}
          </Text>
          <Badge label={formatAmount(total)} tone="neutral" size="sm" />
        </View>
        <View
          style={[
            styles.statementDivider,
            { backgroundColor: colors.outlineVariant },
          ]}
        />
        {items.map((item, idx) => (
          <View key={idx} style={styles.statementRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.statementItemName, { color: colors.onSurface }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {item.meta && (
                <Text
                  style={[
                    styles.statementItemMeta,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {item.meta}
                </Text>
              )}
            </View>
            <Text style={[styles.statementItemAmount, { color }]}>
              {formatAmount(item.amount)}
            </Text>
          </View>
        ))}
      </Card>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    switch (reportType) {
      case "summary":
        return renderMonthlySummary();
      case "category":
        return renderCategoryBreakdown();
      case "networth":
        return renderNetWorthTimeline();
      case "income":
        return renderIncomeStatement();
      case "balance":
        return renderBalanceSheet();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.headerWrap}>
        <ScreenHeader title="Reports" subtitle="Trends and statements" />
      </View>

      {/* Report type pills */}
      <View style={styles.pillShell}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {REPORT_TYPES.map((rt) => {
            const active = reportType === rt.value;
            const Icon = rt.icon;
            return (
              <Pressable
                key={rt.value}
                onPress={() => setReportType(rt.value)}
                style={[
                  styles.reportPill,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : colors.surfaceVariant,
                  },
                ]}
                hitSlop={6}
              >
                <Icon
                  size={14}
                  color={active ? colors.onPrimary : colors.onSurfaceVariant}
                  strokeWidth={2.4}
                />
                <Text
                  style={[
                    styles.pillLabel,
                    {
                      color: active
                        ? colors.onPrimary
                        : colors.onSurfaceVariant,
                    },
                  ]}
                  numberOfLines={1}
                  allowFontScaling={false}
                >
                  {rt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>

      <ThemedDatePicker
        visible={showStartPicker}
        value={incomeStartDate}
        title="Start date"
        onCancel={() => setShowStartPicker(false)}
        onConfirm={(date) => {
          setShowStartPicker(false);
          setIncomeStartDate(date);
        }}
      />
      <ThemedDatePicker
        visible={showEndPicker}
        value={incomeEndDate}
        title="End date"
        onCancel={() => setShowEndPicker(false)}
        onConfirm={(date) => {
          setShowEndPicker(false);
          setIncomeEndDate(date);
        }}
      />
      <ThemedDatePicker
        visible={showBalanceDatePicker}
        value={balanceSheetDate}
        title="As of date"
        onCancel={() => setShowBalanceDatePicker(false)}
        onConfirm={(date) => {
          setShowBalanceDatePicker(false);
          setBalanceSheetDate(date);
        }}
      />
    </SafeAreaView>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { paddingHorizontal: spacing.lg },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 120,
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },

  pillShell: {
    height: 54,
    justifyContent: "center",
  },
  pillRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
  },
  pill: {
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  reportPill: {
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  // Hero
  hero: {
    padding: spacing.lg,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTopText: {
    flexShrink: 1,
    minWidth: 0,
    alignItems: "flex-end",
    gap: 2,
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
  heroDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  heroDeltaText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Stat pair
  statRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minHeight: 96,
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 2,
  },

  // Section title
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: spacing.sm,
  },

  // Month rows
  monthRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: 6,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  monthNet: {
    fontSize: 14,
    fontWeight: "800",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  barValue: {
    fontSize: 11,
    fontWeight: "600",
    minWidth: 80,
    textAlign: "right",
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  miniStatCard: {
    flexBasis: "48%",
    flexGrow: 1,
    gap: 4,
  },
  miniStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  // Category list
  categoryItem: {
    paddingVertical: spacing.md,
    gap: 8,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "800",
  },
  categoryBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryPct: {
    fontSize: 11,
    fontWeight: "700",
    minWidth: 44,
    textAlign: "right",
  },

  // Timeline
  timelineRow: {
    paddingVertical: spacing.md,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: "800",
  },

  // Custom range
  customRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  balanceDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  balanceDateLabel: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Statement section
  statementHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statementTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  statementTotal: {
    fontSize: 15,
    fontWeight: "800",
  },
  statementDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  statementRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: spacing.sm,
  },
  statementItemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  statementItemMeta: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  statementItemAmount: {
    fontSize: 13,
    fontWeight: "700",
  },
  statementEmpty: {
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 4,
  },

  // Subsection
  subsectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
});
