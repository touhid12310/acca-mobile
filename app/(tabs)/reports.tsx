import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Text,
  Surface,
  SegmentedButtons,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import reportService from '../../src/services/reportService';
import { MonthlySummary, CategoryBreakdown } from '../../src/types';
import { formatPercentage } from '../../src/utils/format';

type ReportType = 'summary' | 'category' | 'income' | 'balance';

const { width: screenWidth } = Dimensions.get('window');

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();

  const [reportType, setReportType] = useState<ReportType>('summary');
  const [months, setMonths] = useState(6);

  // Monthly summary query
  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
    isRefetching: isRefetchingSummary,
  } = useQuery({
    queryKey: ['reports', 'monthly-summary', months],
    queryFn: async () => {
      const result = await reportService.getMonthlySummary(months);
      if (result.success) {
        const data = (result.data as { data?: MonthlySummary[] })?.data || result.data;
        return Array.isArray(data) ? data : [];
      }
      return [];
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
    queryKey: ['reports', 'category-breakdown'],
    queryFn: async () => {
      const result = await reportService.getCategoryBreakdown({ type: 'expense' });
      if (result.success) {
        const data = (result.data as { data?: CategoryBreakdown[] })?.data || result.data;
        return Array.isArray(data) ? data : [];
      }
      return [];
    },
    enabled: reportType === 'category',
  });

  // Income statement query
  const {
    data: incomeStatementData,
    isLoading: isLoadingIncome,
    refetch: refetchIncome,
    isRefetching: isRefetchingIncome,
  } = useQuery({
    queryKey: ['reports', 'income-statement'],
    queryFn: async () => {
      const result = await reportService.getIncomeStatement({});
      if (result.success) {
        return (result.data as { data?: object })?.data || result.data;
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
    queryKey: ['reports', 'balance-sheet'],
    queryFn: async () => {
      const result = await reportService.getBalanceSheet({});
      if (result.success) {
        return (result.data as { data?: object })?.data || result.data;
      }
      return null;
    },
    enabled: reportType === 'balance',
  });

  const isLoading =
    isLoadingSummary || isLoadingCategory || isLoadingIncome || isLoadingBalance;
  const isRefetching =
    isRefetchingSummary ||
    isRefetchingCategory ||
    isRefetchingIncome ||
    isRefetchingBalance;

  const handleRefresh = () => {
    switch (reportType) {
      case 'summary':
        refetchSummary();
        break;
      case 'category':
        refetchCategory();
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
  const summaryTotals = React.useMemo(() => {
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
      </>
    );
  };

  // Render category breakdown
  const renderCategoryBreakdown = () => {
    if (!categoryData || categoryData.length === 0) {
      return (
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
            No expense data available
          </Text>
        </View>
      );
    }

    const totalExpenses = categoryData.reduce((sum, cat) => sum + (cat.amount || 0), 0);

    return (
      <>
        <Surface
          style={[styles.totalCard, { backgroundColor: colors.surface, marginBottom: 16 }]}
          elevation={1}
        >
          <MaterialCommunityIcons
            name="chart-pie"
            size={24}
            color={colors.error}
          />
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            Total Expenses
          </Text>
          <Text variant="headlineSmall" style={{ color: colors.error, fontWeight: '600' }}>
            {formatAmount(totalExpenses)}
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
            const percentage = totalExpenses > 0
              ? ((category.amount || 0) / totalExpenses) * 100
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

  // Render income statement
  const renderIncomeStatement = () => {
    const data = incomeStatementData as {
      income?: { categories?: { name: string; amount: number }[]; total?: number };
      expenses?: { categories?: { name: string; amount: number }[]; total?: number };
      net_income?: number;
    } | null;

    if (!data) {
      return (
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
      );
    }

    return (
      <>
        {/* Income Section */}
        <Surface
          style={[styles.statementSection, { backgroundColor: colors.surface }]}
          elevation={1}
        >
          <View style={styles.statementHeader}>
            <MaterialCommunityIcons name="arrow-up-circle" size={24} color={colors.tertiary} />
            <Text variant="titleMedium" style={{ color: colors.onSurface, flex: 1, marginLeft: 8 }}>
              Income
            </Text>
            <Text variant="titleMedium" style={{ color: colors.tertiary, fontWeight: '600' }}>
              {formatAmount(data.income?.total || 0)}
            </Text>
          </View>
          <Divider style={{ marginVertical: 8 }} />
          {data.income?.categories?.map((cat, index) => (
            <View key={index} style={styles.statementRow}>
              <Text style={{ color: colors.onSurfaceVariant, flex: 1 }}>{cat.name}</Text>
              <Text style={{ color: colors.onSurface }}>{formatAmount(cat.amount)}</Text>
            </View>
          ))}
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
          {data.expenses?.categories?.map((cat, index) => (
            <View key={index} style={styles.statementRow}>
              <Text style={{ color: colors.onSurfaceVariant, flex: 1 }}>{cat.name}</Text>
              <Text style={{ color: colors.onSurface }}>{formatAmount(cat.amount)}</Text>
            </View>
          ))}
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
        </Surface>
      </>
    );
  };

  // Render balance sheet
  const renderBalanceSheet = () => {
    const data = balanceSheetData as {
      assets?: { accounts?: { name: string; balance: number; type: string }[]; total?: number };
      liabilities?: { accounts?: { name: string; balance: number; type: string }[]; total?: number };
      net_worth?: number;
    } | null;

    if (!data) {
      return (
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
      );
    }

    return (
      <>
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
          {data.assets?.accounts?.map((acc, index) => (
            <View key={index} style={styles.statementRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.onSurface }}>{acc.name}</Text>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>{acc.type}</Text>
              </View>
              <Text style={{ color: colors.onSurface }}>{formatAmount(acc.balance)}</Text>
            </View>
          ))}
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
          {data.liabilities?.accounts?.length ? (
            data.liabilities.accounts.map((acc, index) => (
              <View key={index} style={styles.statementRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.onSurface }}>{acc.name}</Text>
                  <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>{acc.type}</Text>
                </View>
                <Text style={{ color: colors.onSurface }}>{formatAmount(acc.balance)}</Text>
              </View>
            ))
          ) : (
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
        <SegmentedButtons
          value={reportType}
          onValueChange={(value) => setReportType(value as ReportType)}
          buttons={[
            { value: 'summary', label: 'Summary', icon: 'chart-line' },
            { value: 'category', label: 'Category', icon: 'chart-pie' },
            { value: 'income', label: 'P&L', icon: 'file-document' },
            { value: 'balance', label: 'Balance', icon: 'scale-balance' },
          ]}
          style={styles.segmentedButtons}
        />
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
  segmentedButtons: {
    height: 40,
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
  netIncomeCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
});
