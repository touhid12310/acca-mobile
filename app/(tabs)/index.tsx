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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Camera,
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

        {/* Quick Actions */}
        <View style={styles.section}>
          <SectionHeader title="Quick actions" />
          <View style={styles.quickActions}>
            <QuickAction
              icon={ArrowUpRight}
              label="Expense"
              bg={colors.errorContainer}
              fg={colors.error}
              onPress={() =>
                router.push({
                  pathname: "/transaction-modal",
                  params: { type: "expense" },
                })
              }
            />
            <QuickAction
              icon={ArrowDownLeft}
              label="Income"
              bg={colors.tertiaryContainer}
              fg={colors.tertiary}
              onPress={() =>
                router.push({
                  pathname: "/transaction-modal",
                  params: { type: "income" },
                })
              }
            />
            <QuickAction
              icon={ArrowLeftRight}
              label="Transfer"
              bg={colors.primaryContainer}
              fg={colors.primary}
              onPress={() =>
                router.push({
                  pathname: "/transaction-modal",
                  params: { type: "transfer" },
                })
              }
            />
            <QuickAction
              icon={Camera}
              label="Scan"
              bg={colors.infoContainer}
              fg={colors.info}
              onPress={() =>
                router.push({
                  pathname: "/transaction-modal",
                  params: { type: "expense", scan_mode: "camera" },
                })
              }
            />
          </View>
        </View>

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

function QuickAction({
  icon: Icon,
  label,
  bg,
  fg,
  onPress,
}: {
  icon: any;
  label: string;
  bg: string;
  fg: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable style={styles.quickActionWrapper} onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[styles.quickAction, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: bg }]}>
            <Icon size={22} color={fg} strokeWidth={2.3} />
          </View>
          <Text style={[styles.quickActionLabel, { color: colors.onSurface }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

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
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickActionWrapper: {
    flex: 1,
  },
  quickAction: {
    alignItems: "center",
    gap: 8,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 12.5,
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
