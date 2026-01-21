import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Surface,
  ActivityIndicator,
  Divider,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import reportService from '../../src/services/reportService';
import { MonthlySummary, CategoryBreakdown } from '../../src/types';
import { formatPercentage } from '../../src/utils/format';

type ReportType = 'summary' | 'category' | 'networth' | 'income' | 'balance';
type CategoryTypeFilter = 'all' | 'income' | 'expense' | 'asset' | 'liability';
type PeriodFilter = 'monthly' | 'quarterly' | 'yearly' | 'custom';

const { width: screenWidth } = Dimensions.get('window');

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();

  const [reportType, setReportType] = useState<ReportType>('summary');
  const [months, setMonths] = useState(6);

  // Category breakdown filters
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<CategoryTypeFilter>('expense');

  // Income statement filters
  const [incomeStatementPeriod, setIncomeStatementPeriod] = useState<PeriodFilter>('monthly');
  const [incomeStartDate, setIncomeStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  const [incomeEndDate, setIncomeEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Balance sheet filters
  const [balanceSheetDate, setBalanceSheetDate] = useState(new Date());
  const [showBalanceDatePicker, setShowBalanceDatePicker] = useState(false);

  const categoryTypeOptions: { value: CategoryTypeFilter; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
    { value: 'asset', label: 'Asset' },
    { value: 'liability', label: 'Liability' },
  ];

  const periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: 'monthly', label: 'This Month' },
    { value: 'quarterly', label: 'This Quarter' },
    { value: 'yearly', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  // Handle period change for income statement
  const handlePeriodChange = (period: PeriodFilter) => {
    setIncomeStatementPeriod(period);
    const today = new Date();

    if (period === 'monthly') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setIncomeStartDate(firstDay);
      setIncomeEndDate(today);
    } else if (period === 'quarterly') {
      const quarter = Math.floor(today.getMonth() / 3);
      const firstDay = new Date(today.getFullYear(), quarter * 3, 1);
      setIncomeStartDate(firstDay);
      setIncomeEndDate(today);
    } else if (period === 'yearly') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      setIncomeStartDate(firstDay);
      setIncomeEndDate(today);
    }
  };


  // Monthly summary query
  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
    isRefetching: isRefetchingSummary,
  } = useQuery({
    queryKey: ['reports', 'monthly-summary', months],
    queryFn: async () => {
      try {
        const result = await reportService.getMonthlySummary(months);
        if (result.success && result.data) {
          // API returns: { data: { labels: [], income: [], expenses: [], assets: [], liabilities: [] } }
          const responseData = result.data as any;
          const data = responseData?.data || responseData;

          // Transform chart data format to table format
          if (data && data.labels && Array.isArray(data.labels)) {
            const tableData: MonthlySummary[] = data.labels.map((label: string, index: number) => ({
              month: label,
              income: data.income?.[index] || 0,
              expenses: data.expenses?.[index] || 0,
              net: (data.income?.[index] || 0) - (data.expenses?.[index] || 0),
            }));
            return tableData;
          }

          // Fallback if already in array format
          return Array.isArray(data) ? data : [];
        }
        return [];
      } catch (error: any) {
        console.error('Monthly summary error:', error);
        return [];
      }
    },
    enabled: reportType === 'summary',
  });

  // Summary stats query
  const {
    data: summaryStatsData,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['reports', 'summary-stats', months],
    queryFn: async () => {
      const result = await reportService.getSummaryStats(months);
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData;
      }
      return null;
    },
    enabled: reportType === 'summary',
  });

  // Category breakdown query
  const {
    data: categoryData,
    isLoading: isLoadingCategory,
    refetch: refetchCategory,
    isRefetching: isRefetchingCategory,
  } = useQuery({
    queryKey: ['reports', 'category-breakdown', categoryTypeFilter],
    queryFn: async () => {
      const params = categoryTypeFilter !== 'all' ? { type: categoryTypeFilter as 'income' | 'expense' } : {};
      const result = await reportService.getCategoryBreakdown(params);
      if (result.success && result.data) {
        // API returns: { data: { labels: [], values: [], colors: [] } }
        const responseData = result.data as any;
        const data = responseData?.data || responseData;

        // Transform chart data format to table format
        if (data && data.labels && Array.isArray(data.labels)) {
          const defaultColors = [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#F97316', '#EC4899', '#06B6D4', '#84CC16', '#6366F1'
          ];
          const tableData: CategoryBreakdown[] = data.labels.map((label: string, index: number) => ({
            category_id: index,
            category_name: label,
            amount: data.values?.[index] || 0,
            color: data.colors?.[index] || defaultColors[index % defaultColors.length],
          }));
          return tableData;
        }

        // Fallback if already in array format
        return Array.isArray(data) ? data : [];
      }
      return [];
    },
    enabled: reportType === 'category',
  });

  // Net worth timeline query
  const {
    data: netWorthData,
    isLoading: isLoadingNetWorth,
    refetch: refetchNetWorth,
    isRefetching: isRefetchingNetWorth,
  } = useQuery({
    queryKey: ['reports', 'net-worth-timeline', months],
    queryFn: async () => {
      const result = await reportService.getNetWorthTimeline(months);
      if (result.success && result.data) {
        // API returns: { data: { labels: [], netWorth: [] } }
        const responseData = result.data as any;
        return responseData?.data || responseData;
      }
      return null;
    },
    enabled: reportType === 'networth',
  });

  // Income statement query
  const {
    data: incomeStatementData,
    isLoading: isLoadingIncome,
    refetch: refetchIncome,
    isRefetching: isRefetchingIncome,
  } = useQuery({
    queryKey: ['reports', 'income-statement', incomeStartDate.toISOString(), incomeEndDate.toISOString()],
    queryFn: async () => {
      const result = await reportService.getIncomeStatement({
        start_date: incomeStartDate.toISOString().split('T')[0],
        end_date: incomeEndDate.toISOString().split('T')[0],
      });
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData;
      }
      return null;
    },
    enabled: reportType === 'income',
  });

  // Balance sheet query
  const {
    data: balanceSheetData,
    isLoading: isLoadingBalance,
    refetch: refetchBalance,
    isRefetching: isRefetchingBalance,
  } = useQuery({
    queryKey: ['reports', 'balance-sheet', balanceSheetDate.toISOString()],
    queryFn: async () => {
      const result = await reportService.getBalanceSheet({
        as_of_date: balanceSheetDate.toISOString().split('T')[0],
      });
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData;
      }
      return null;
    },
    enabled: reportType === 'balance',
  });

  const isLoading =
    isLoadingSummary || isLoadingCategory || isLoadingIncome || isLoadingBalance || isLoadingNetWorth;
  const isRefetching =
    isRefetchingSummary ||
    isRefetchingCategory ||
    isRefetchingIncome ||
    isRefetchingBalance ||
    isRefetchingNetWorth;

  const handleRefresh = () => {
    switch (reportType) {
      case 'summary':
        refetchSummary();
        break;
      case 'category':
        refetchCategory();
        break;
      case 'networth':
        refetchNetWorth();
        break;
      case 'income':
        refetchIncome();
        break;
      case 'balance':
        refetchBalance();
        break;
    }
  };

  // Calculate totals for summary
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
      { income: 0, expenses: 0, net: 0 }
    );
  }, [summaryData]);

  // Render summary statistics
  const renderSummaryStats = () => {
    const stats = summaryStatsData as {
      total_income?: number;
      total_expenses?: number;
      net_savings?: number;
      savings_rate?: number;
      total_assets?: number;
      total_liabilities?: number;
    } | null;

    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>
          Summary Statistics ({months} Months)
        </Text>
        <View style={styles.statsGrid}>
          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Total Income</Text>
            <Text variant="titleSmall" style={{ color: colors.tertiary, fontWeight: '600' }}>
              {formatAmount(stats.total_income || 0)}
            </Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Total Expenses</Text>
            <Text variant="titleSmall" style={{ color: colors.error, fontWeight: '600' }}>
              {formatAmount(stats.total_expenses || 0)}
            </Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Net Savings</Text>
            <Text variant="titleSmall" style={{ color: colors.primary, fontWeight: '600' }}>
              {formatAmount(stats.net_savings || 0)}
            </Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Savings Rate</Text>
            <Text variant="titleSmall" style={{ color: colors.primary, fontWeight: '600' }}>
              {stats.savings_rate || 0}%
            </Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Total Assets</Text>
            <Text variant="titleSmall" style={{ color: colors.tertiary, fontWeight: '600' }}>
              {formatAmount(stats.total_assets || 0)}
            </Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Total Liabilities</Text>
            <Text variant="titleSmall" style={{ color: colors.error, fontWeight: '600' }}>
              {formatAmount(stats.total_liabilities || 0)}
            </Text>
          </Surface>
        </View>
      </View>
    );
  };

  // Render monthly summary
  const renderMonthlySummary = () => {
    if (!summaryData || summaryData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="chart-line"
            size={48}
            color={colors.onSurfaceVariant}
          />
          <Text
            variant="bodyMedium"
            style={{ color: colors.onSurfaceVariant, marginTop: 12 }}
          >
            No data available
          </Text>
        </View>
      );
    }

    return (
      <>
        {/* Summary totals */}
        <View style={styles.totalsGrid}>
          <Surface
            style={[styles.totalCard, { backgroundColor: colors.surface }]}
            elevation={1}
          >
            <MaterialCommunityIcons
              name="arrow-up-circle"
              size={24}
              color={colors.tertiary}
            />
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              Total Income
            </Text>
            <Text variant="titleMedium" style={{ color: colors.tertiary, fontWeight: '600' }}>
              {formatAmount(summaryTotals.income)}
            </Text>
          </Surface>

          <Surface
            style={[styles.totalCard, { backgroundColor: colors.surface }]}
            elevation={1}
          >
            <MaterialCommunityIcons
              name="arrow-down-circle"
              size={24}
              color={colors.error}
            />
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              Total Expenses
            </Text>
            <Text variant="titleMedium" style={{ color: colors.error, fontWeight: '600' }}>
              {formatAmount(summaryTotals.expenses)}
            </Text>
          </Surface>
        </View>

        <Surface
          style={[styles.netCard, { backgroundColor: colors.primaryContainer }]}
          elevation={1}
        >
          <Text variant="bodyMedium" style={{ color: colors.primary }}>
            Net Savings
          </Text>
          <Text variant="headlineMedium" style={{ color: colors.primary, fontWeight: 'bold' }}>
            {formatAmount(summaryTotals.net)}
          </Text>
        </Surface>

        {/* Monthly breakdown */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>
          Monthly Breakdown
        </Text>

        <Surface
          style={[styles.tableContainer, { backgroundColor: colors.surface }]}
          elevation={1}
        >
          {/* Table header */}
          <View style={[styles.tableRow, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, color: colors.onSurface }]}>
              Month
            </Text>
            <Text style={[styles.tableHeaderCell, { color: colors.onSurface, textAlign: 'right' }]}>
              Income
            </Text>
            <Text style={[styles.tableHeaderCell, { color: colors.onSurface, textAlign: 'right' }]}>
              Expenses
            </Text>
            <Text style={[styles.tableHeaderCell, { color: colors.onSurface, textAlign: 'right' }]}>
              Net
            </Text>
          </View>

          {/* Table rows */}
          {summaryData.map((month, index) => (
            <React.Fragment key={month.month}>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5, color: colors.onSurface }]}>
                  {month.month}
                </Text>
                <Text style={[styles.tableCell, { color: colors.tertiary, textAlign: 'right' }]}>
                  {formatAmount(month.income || 0)}
                </Text>
                <Text style={[styles.tableCell, { color: colors.error, textAlign: 'right' }]}>
                  {formatAmount(month.expenses || 0)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      color: (month.net || 0) >= 0 ? colors.tertiary : colors.error,
                      textAlign: 'right',
                      fontWeight: '500',
                    },
                  ]}
                >
                  {formatAmount(month.net || 0)}
                </Text>
              </View>
              {index < summaryData.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Surface>

        {/* Summary Statistics */}
        {renderSummaryStats()}
      </>
    );
  };

  // Render category breakdown
  const renderCategoryBreakdown = () => {
    // Filter section - using Chips instead of Menu for better reliability
    const filterSection = (
      <View style={styles.filterSection}>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>Filter by Type:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.periodChips}>
            {categoryTypeOptions.map((option) => (
              <Chip
                key={option.value}
                selected={categoryTypeFilter === option.value}
                onPress={() => setCategoryTypeFilter(option.value)}
                style={styles.periodChip}
                mode={categoryTypeFilter === option.value ? 'flat' : 'outlined'}
              >
                {option.label}
              </Chip>
            ))}
          </View>
        </ScrollView>
      </View>
    );

    if (!categoryData || categoryData.length === 0) {
      return (
        <>
          {filterSection}
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="chart-pie"
              size={48}
              color={colors.onSurfaceVariant}
            />
            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, marginTop: 12 }}
            >
              No data available for {categoryTypeFilter === 'all' ? 'all categories' : categoryTypeFilter}
            </Text>
          </View>
        </>
      );
    }

    const totalAmount = categoryData.reduce((sum, cat) => sum + (cat.amount || 0), 0);

    return (
      <>
        {filterSection}

        <Surface
          style={[styles.totalCard, { backgroundColor: colors.surface, marginBottom: 16 }]}
          elevation={1}
        >
          <MaterialCommunityIcons
            name="chart-pie"
            size={24}
            color={categoryTypeFilter === 'income' ? colors.tertiary : colors.error}
          />
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            Total {categoryTypeFilter === 'all' ? 'Amount' : categoryTypeFilter.charAt(0).toUpperCase() + categoryTypeFilter.slice(1)}
          </Text>
          <Text variant="headlineSmall" style={{ color: categoryTypeFilter === 'income' ? colors.tertiary : colors.error, fontWeight: '600' }}>
            {formatAmount(totalAmount)}
          </Text>
        </Surface>

        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>
          By Category
        </Text>

        <Surface
          style={[styles.categoryList, { backgroundColor: colors.surface }]}
          elevation={1}
        >
          {categoryData.map((category, index) => {
            const percentage = totalAmount > 0
              ? ((category.amount || 0) / totalAmount) * 100
              : 0;

            return (
              <React.Fragment key={category.category_id || index}>
                <View style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: category.color || colors.primary },
                      ]}
                    />
                    <Text variant="bodyMedium" style={{ color: colors.onSurface, flex: 1 }}>
                      {category.category_name || 'Unknown'}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      {formatPercentage(percentage)}
                    </Text>
                  </View>
                  <View style={styles.categoryBarContainer}>
                    <View
                      style={[
                        styles.categoryBar,
                        {
                          backgroundColor: colors.surfaceVariant,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.categoryBarFill,
                          {
                            backgroundColor: category.color || colors.primary,
                            width: `${percentage}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '500' }}>
                      {formatAmount(category.amount || 0)}
                    </Text>
                  </View>
                </View>
                {index < categoryData.length - 1 && <Divider style={{ marginVertical: 8 }} />}
              </React.Fragment>
            );
          })}
        </Surface>
      </>
    );
  };

  // Render net worth timeline
  const renderNetWorthTimeline = () => {
    const data = netWorthData as {
      labels?: string[];
      netWorth?: number[];
    } | null;

    if (!data || !data.labels || data.labels.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="chart-timeline-variant"
            size={48}
            color={colors.onSurfaceVariant}
          />
          <Text
            variant="bodyMedium"
            style={{ color: colors.onSurfaceVariant, marginTop: 12 }}
          >
            No net worth data available
          </Text>
        </View>
      );
    }

    const currentNetWorth = data.netWorth?.[data.netWorth.length - 1] || 0;
    const previousNetWorth = data.netWorth?.[0] || 0;
    const change = currentNetWorth - previousNetWorth;
    const changePercent = previousNetWorth !== 0 ? (change / Math.abs(previousNetWorth)) * 100 : 0;

    return (
      <>
        <Surface
          style={[styles.netCard, { backgroundColor: colors.primaryContainer }]}
          elevation={1}
        >
          <Text variant="bodyMedium" style={{ color: colors.primary }}>
            Current Net Worth
          </Text>
          <Text variant="headlineMedium" style={{ color: colors.primary, fontWeight: 'bold' }}>
            {formatAmount(currentNetWorth)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <MaterialCommunityIcons
              name={change >= 0 ? 'arrow-up' : 'arrow-down'}
              size={16}
              color={change >= 0 ? colors.tertiary : colors.error}
            />
            <Text style={{ color: change >= 0 ? colors.tertiary : colors.error, marginLeft: 4 }}>
              {formatAmount(Math.abs(change))} ({changePercent.toFixed(1)}%)
            </Text>
          </View>
        </Surface>

        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>
          Net Worth Timeline
        </Text>

        <Surface
          style={[styles.tableContainer, { backgroundColor: colors.surface }]}
          elevation={1}
        >
          <View style={[styles.tableRow, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.tableHeaderCell, { flex: 1, color: colors.onSurface }]}>
              Month
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, color: colors.onSurface, textAlign: 'right' }]}>
              Net Worth
            </Text>
          </View>

          {data.labels.map((label, index) => (
            <React.Fragment key={label}>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1, color: colors.onSurface }]}>
                  {label}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      flex: 1,
                      color: (data.netWorth?.[index] || 0) >= 0 ? colors.tertiary : colors.error,
                      textAlign: 'right',
                      fontWeight: '500',
                    },
                  ]}
                >
                  {formatAmount(data.netWorth?.[index] || 0)}
                </Text>
              </View>
              {index < data.labels.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Surface>
      </>
    );
  };

  // Render income statement
  const renderIncomeStatement = () => {
    // Period filter section
    const filterSection = (
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.periodChips}>
            {periodOptions.map((option) => (
              <Chip
                key={option.value}
                selected={incomeStatementPeriod === option.value}
                onPress={() => handlePeriodChange(option.value)}
                style={styles.periodChip}
                mode={incomeStatementPeriod === option.value ? 'flat' : 'outlined'}
              >
                {option.label}
              </Chip>
            ))}
          </View>
        </ScrollView>

        {incomeStatementPeriod === 'custom' && (
          <View style={styles.datePickerRow}>
            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => setShowStartPicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={18} color={colors.onSurfaceVariant} />
              <Text style={{ color: colors.onSurface, marginLeft: 8 }}>
                {incomeStartDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            <Text style={{ color: colors.onSurfaceVariant }}>to</Text>
            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => setShowEndPicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={18} color={colors.onSurfaceVariant} />
              <Text style={{ color: colors.onSurface, marginLeft: 8 }}>
                {incomeEndDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );

    const data = incomeStatementData as {
      income?: { items?: { category: string; amount: number }[]; total?: number };
      expenses?: { items?: { category: string; amount: number }[]; total?: number };
      net_income?: number;
      profit_margin?: number;
      period?: { start_date: string; end_date: string };
    } | null;

    if (!data) {
      return (
        <>
          {filterSection}
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="file-document"
              size={48}
              color={colors.onSurfaceVariant}
            />
            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, marginTop: 12 }}
            >
              No data available
            </Text>
          </View>
        </>
      );
    }

    return (
      <>
        {filterSection}

        {data.period && (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: 12 }}>
            Period: {new Date(data.period.start_date).toLocaleDateString()} - {new Date(data.period.end_date).toLocaleDateString()}
          </Text>
        )}

        {/* Income Section */}
        <Surface
          style={[styles.statementSection, { backgroundColor: colors.surface }]}
          elevation={1}
        >
          <View style={styles.statementHeader}>
            <MaterialCommunityIcons name="arrow-up-circle" size={24} color={colors.tertiary} />
            <Text variant="titleMedium" style={{ color: colors.onSurface, flex: 1, marginLeft: 8 }}>
              Revenue / Income
            </Text>
            <Text variant="titleMedium" style={{ color: colors.tertiary, fontWeight: '600' }}>
              {formatAmount(data.income?.total || 0)}
            </Text>
          </View>
          <Divider style={{ marginVertical: 8 }} />
          {data.income?.items && data.income.items.length > 0 ? (
            data.income.items.map((item, index) => (
              <View key={index} style={styles.statementRow}>
                <Text style={{ color: colors.onSurfaceVariant, flex: 1 }}>{item.category}</Text>
                <Text style={{ color: colors.onSurface }}>{formatAmount(item.amount)}</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: colors.onSurfaceVariant, fontStyle: 'italic' }}>No income recorded</Text>
          )}
        </Surface>

        {/* Expenses Section */}
        <Surface
          style={[styles.statementSection, { backgroundColor: colors.surface }]}
          elevation={1}
        >
          <View style={styles.statementHeader}>
            <MaterialCommunityIcons name="arrow-down-circle" size={24} color={colors.error} />
            <Text variant="titleMedium" style={{ color: colors.onSurface, flex: 1, marginLeft: 8 }}>
              Expenses
            </Text>
            <Text variant="titleMedium" style={{ color: colors.error, fontWeight: '600' }}>
              {formatAmount(data.expenses?.total || 0)}
            </Text>
          </View>
          <Divider style={{ marginVertical: 8 }} />
          {data.expenses?.items && data.expenses.items.length > 0 ? (
            data.expenses.items.map((item, index) => (
              <View key={index} style={styles.statementRow}>
                <Text style={{ color: colors.onSurfaceVariant, flex: 1 }}>{item.category}</Text>
                <Text style={{ color: colors.onSurface }}>({formatAmount(item.amount)})</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: colors.onSurfaceVariant, fontStyle: 'italic' }}>No expenses recorded</Text>
          )}
        </Surface>

        {/* Net Income */}
        <Surface
          style={[
            styles.netIncomeCard,
            {
              backgroundColor:
                (data.net_income || 0) >= 0 ? colors.tertiaryContainer : colors.errorContainer,
            },
          ]}
          elevation={1}
        >
          <Text
            variant="titleMedium"
            style={{
              color: (data.net_income || 0) >= 0 ? colors.tertiary : colors.error,
            }}
          >
            Net Income
          </Text>
          <Text
            variant="headlineMedium"
            style={{
              color: (data.net_income || 0) >= 0 ? colors.tertiary : colors.error,
              fontWeight: 'bold',
            }}
          >
            {formatAmount(data.net_income || 0)}
          </Text>
          {data.profit_margin !== undefined && (
            <Text style={{ color: (data.net_income || 0) >= 0 ? colors.tertiary : colors.error, marginTop: 4 }}>
              Profit Margin: {data.profit_margin}%
            </Text>
          )}
        </Surface>
      </>
    );
  };

  // Render balance sheet
  const renderBalanceSheet = () => {
    // Date filter section
    const filterSection = (
      <View style={styles.filterRow}>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>As of Date:</Text>
        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => setShowBalanceDatePicker(true)}
        >
          <MaterialCommunityIcons name="calendar" size={18} color={colors.onSurfaceVariant} />
          <Text style={{ color: colors.onSurface, marginLeft: 8 }}>
            {balanceSheetDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      </View>
    );

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

    if (!data) {
      return (
        <>
          {filterSection}
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="scale-balance"
              size={48}
              color={colors.onSurfaceVariant}
            />
            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, marginTop: 12 }}
            >
              No data available
            </Text>
          </View>
        </>
      );
    }

    return (
      <>
        {filterSection}

        {data.as_of_date && (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: 12 }}>
            As of: {new Date(data.as_of_date).toLocaleDateString()}
          </Text>
        )}

        {/* Assets */}
        <Surface
          style={[styles.statementSection, { backgroundColor: colors.surface }]}
          elevation={1}
        >
          <View style={styles.statementHeader}>
            <MaterialCommunityIcons name="bank" size={24} color={colors.tertiary} />
            <Text variant="titleMedium" style={{ color: colors.onSurface, flex: 1, marginLeft: 8 }}>
              Assets
            </Text>
            <Text variant="titleMedium" style={{ color: colors.tertiary, fontWeight: '600' }}>
              {formatAmount(data.assets?.total || 0)}
            </Text>
          </View>
          <Divider style={{ marginVertical: 8 }} />

          {/* Cash & Bank */}
          {data.assets?.cash_and_bank && data.assets.cash_and_bank.items.length > 0 && (
            <View style={styles.subsection}>
              <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '500', marginBottom: 8 }}>
                Cash & Bank Accounts ({formatAmount(data.assets.cash_and_bank.total)})
              </Text>
              {data.assets.cash_and_bank.items.map((item, index) => (
                <View key={index} style={styles.statementRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.onSurface }}>{item.name}</Text>
                    <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>{item.type}</Text>
                  </View>
                  <Text style={{ color: colors.onSurface }}>{formatAmount(item.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Other Assets */}
          {data.assets?.other_assets && data.assets.other_assets.items.length > 0 && (
            <View style={styles.subsection}>
              <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '500', marginBottom: 8 }}>
                Other Assets ({formatAmount(data.assets.other_assets.total)})
              </Text>
              {data.assets.other_assets.items.map((item, index) => (
                <View key={index} style={styles.statementRow}>
                  <Text style={{ color: colors.onSurfaceVariant, flex: 1 }}>{item.category}</Text>
                  <Text style={{ color: colors.onSurface }}>{formatAmount(item.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Loans Receivable */}
          {data.assets?.loans_receivable && data.assets.loans_receivable.items.length > 0 && (
            <View style={styles.subsection}>
              <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '500', marginBottom: 8 }}>
                Loans Receivable ({formatAmount(data.assets.loans_receivable.total)})
              </Text>
              {data.assets.loans_receivable.items.map((item, index) => (
                <View key={index} style={styles.statementRow}>
                  <Text style={{ color: colors.onSurfaceVariant, flex: 1 }}>{item.name}</Text>
                  <Text style={{ color: colors.onSurface }}>{formatAmount(item.amount)}</Text>
                </View>
              ))}
            </View>
          )}
        </Surface>

        {/* Liabilities */}
        <Surface
          style={[styles.statementSection, { backgroundColor: colors.surface }]}
          elevation={1}
        >
          <View style={styles.statementHeader}>
            <MaterialCommunityIcons name="credit-card" size={24} color={colors.error} />
            <Text variant="titleMedium" style={{ color: colors.onSurface, flex: 1, marginLeft: 8 }}>
              Liabilities
            </Text>
            <Text variant="titleMedium" style={{ color: colors.error, fontWeight: '600' }}>
              {formatAmount(data.liabilities?.total || 0)}
            </Text>
          </View>
          <Divider style={{ marginVertical: 8 }} />

          {/* Other Liabilities */}
          {data.liabilities?.other_liabilities && data.liabilities.other_liabilities.items.length > 0 && (
            <View style={styles.subsection}>
              <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '500', marginBottom: 8 }}>
                Other Liabilities ({formatAmount(data.liabilities.other_liabilities.total)})
              </Text>
              {data.liabilities.other_liabilities.items.map((item, index) => (
                <View key={index} style={styles.statementRow}>
                  <Text style={{ color: colors.onSurfaceVariant, flex: 1 }}>{item.category}</Text>
                  <Text style={{ color: colors.onSurface }}>{formatAmount(item.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Loans Payable */}
          {data.liabilities?.loans_payable && data.liabilities.loans_payable.items.length > 0 && (
            <View style={styles.subsection}>
              <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '500', marginBottom: 8 }}>
                Loans Payable ({formatAmount(data.liabilities.loans_payable.total)})
              </Text>
              {data.liabilities.loans_payable.items.map((item, index) => (
                <View key={index} style={styles.statementRow}>
                  <Text style={{ color: colors.onSurfaceVariant, flex: 1 }}>{item.name}</Text>
                  <Text style={{ color: colors.onSurface }}>{formatAmount(item.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {(!data.liabilities?.other_liabilities?.items?.length && !data.liabilities?.loans_payable?.items?.length) && (
            <Text style={{ color: colors.onSurfaceVariant, fontStyle: 'italic' }}>
              No liabilities
            </Text>
          )}
        </Surface>

        {/* Net Worth */}
        <Surface
          style={[styles.netIncomeCard, { backgroundColor: colors.primaryContainer }]}
          elevation={1}
        >
          <Text variant="titleMedium" style={{ color: colors.primary }}>
            Net Worth
          </Text>
          <Text variant="headlineMedium" style={{ color: colors.primary, fontWeight: 'bold' }}>
            {formatAmount(data.net_worth || 0)}
          </Text>
        </Surface>
      </>
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
      case 'summary':
        return renderMonthlySummary();
      case 'category':
        return renderCategoryBreakdown();
      case 'networth':
        return renderNetWorthTimeline();
      case 'income':
        return renderIncomeStatement();
      case 'balance':
        return renderBalanceSheet();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
          Reports
        </Text>
      </View>

      {/* Report type selector */}
      <View style={styles.segmentContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.reportTypeChips}>
            <Chip
              selected={reportType === 'summary'}
              onPress={() => setReportType('summary')}
              icon="chart-line"
              style={styles.reportChip}
              mode={reportType === 'summary' ? 'flat' : 'outlined'}
            >
              Summary
            </Chip>
            <Chip
              selected={reportType === 'category'}
              onPress={() => setReportType('category')}
              icon="chart-pie"
              style={styles.reportChip}
              mode={reportType === 'category' ? 'flat' : 'outlined'}
            >
              Category
            </Chip>
            <Chip
              selected={reportType === 'networth'}
              onPress={() => setReportType('networth')}
              icon="chart-timeline-variant"
              style={styles.reportChip}
              mode={reportType === 'networth' ? 'flat' : 'outlined'}
            >
              Net Worth
            </Chip>
            <Chip
              selected={reportType === 'income'}
              onPress={() => setReportType('income')}
              icon="file-document"
              style={styles.reportChip}
              mode={reportType === 'income' ? 'flat' : 'outlined'}
            >
              P&L
            </Chip>
            <Chip
              selected={reportType === 'balance'}
              onPress={() => setReportType('balance')}
              icon="scale-balance"
              style={styles.reportChip}
              mode={reportType === 'balance' ? 'flat' : 'outlined'}
            >
              Balance
            </Chip>
          </View>
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

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={incomeStartDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) setIncomeStartDate(date);
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={incomeEndDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) setIncomeEndDate(date);
          }}
        />
      )}
      {showBalanceDatePicker && (
        <DateTimePicker
          value={balanceSheetDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowBalanceDatePicker(false);
            if (date) setBalanceSheetDate(date);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  segmentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  reportTypeChips: {
    flexDirection: 'row',
    gap: 8,
  },
  reportChip: {
    height: 36,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  totalsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  totalCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  netCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  tableContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
  },
  tableHeaderCell: {
    flex: 1,
    fontWeight: '600',
    fontSize: 12,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  filterSection: {
    marginBottom: 16,
  },
  periodChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  periodChip: {
    height: 32,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  categoryList: {
    padding: 16,
    borderRadius: 12,
  },
  categoryItem: {
    paddingVertical: 4,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statementSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  statementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  subsection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  netIncomeCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  statsContainer: {
    marginTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: (screenWidth - 48) / 2 - 4,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
});
