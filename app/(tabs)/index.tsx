import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Surface,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import dashboardService, { DashboardData } from '../../src/services/dashboardService';
import { formatRelativeTime } from '../../src/utils/date';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();

  const {
    data: dashboardData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<DashboardData> => {
      const result = await dashboardService.getDashboardData();
      if (result.success && result.data) {
        // Handle wrapped response { data: DashboardData, message?: string }
        const data = result.data as DashboardData | { data: DashboardData };
        if ('totalBalance' in data) {
          return data;
        }
        return (data as { data: DashboardData }).data;
      }
      throw new Error(result.error || 'Failed to load dashboard');
    },
  });

  const stats = dashboardData || null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const StatCard = ({
    title,
    value,
    icon,
    color,
    trend,
  }: {
    title: string;
    value: string;
    icon: string;
    color: string;
    trend?: 'up' | 'down' | null;
  }) => (
    <Surface
      style={[styles.statCard, { backgroundColor: colors.surface }]}
      elevation={1}
    >
      <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
        <MaterialCommunityIcons name={icon as never} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text
          variant="bodySmall"
          style={[styles.statTitle, { color: colors.onSurfaceVariant }]}
        >
          {title}
        </Text>
        <View style={styles.statValueRow}>
          <Text
            variant="titleMedium"
            style={[styles.statValue, { color: colors.onSurface }]}
          >
            {value}
          </Text>
          {trend && (
            <MaterialCommunityIcons
              name={trend === 'up' ? 'trending-up' : 'trending-down'}
              size={18}
              color={trend === 'up' ? colors.tertiary : colors.error}
            />
          )}
        </View>
      </View>
    </Surface>
  );

  const QuickAction = ({
    icon,
    label,
    onPress,
    color,
  }: {
    icon: string;
    label: string;
    onPress: () => void;
    color: string;
  }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View
        style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}
      >
        <MaterialCommunityIcons name={icon as never} size={24} color={color} />
      </View>
      <Text
        variant="bodySmall"
        style={[styles.quickActionLabel, { color: colors.onSurface }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
      edges={['top']}
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text
              variant="titleMedium"
              style={[styles.greeting, { color: colors.onSurfaceVariant }]}
            >
              {getGreeting()},
            </Text>
            <Text
              variant="headlineSmall"
              style={[styles.userName, { color: colors.onSurface }]}
            >
              {user?.name || 'User'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarContainer, { backgroundColor: colors.primaryContainer }]}
            onPress={() => router.push('/(tabs)/more')}
          >
            {user?.profile_picture_url ? (
              <Image
                source={{ uri: user.profile_picture_url }}
                style={styles.avatarImage}
              />
            ) : (
              <MaterialCommunityIcons
                name="account"
                size={28}
                color={colors.primary}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Net Worth Card */}
        <Card
          style={[styles.netWorthCard, { backgroundColor: colors.primary }]}
          mode="elevated"
        >
          <Card.Content style={styles.netWorthContent}>
            <Text style={styles.netWorthLabel}>Net Worth</Text>
            <Text style={styles.netWorthValue}>
              {formatAmount(stats?.netWorth || 0)}
            </Text>
            <View style={styles.netWorthMeta}>
              <View style={styles.netWorthMetaItem}>
                <MaterialCommunityIcons
                  name="arrow-up-circle"
                  size={16}
                  color="rgba(255,255,255,0.8)"
                />
                <Text style={styles.netWorthMetaText}>
                  Income: {formatAmount(stats?.monthlyIncome || 0)}
                </Text>
              </View>
              <View style={styles.netWorthMetaItem}>
                <MaterialCommunityIcons
                  name="arrow-down-circle"
                  size={16}
                  color="rgba(255,255,255,0.8)"
                />
                <Text style={styles.netWorthMetaText}>
                  Expenses: {formatAmount(stats?.monthlyExpenses || 0)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="This Month Income"
            value={formatAmount(stats?.monthlyIncome || 0)}
            icon="arrow-up-circle"
            color={colors.tertiary}
            trend="up"
          />
          <StatCard
            title="This Month Expenses"
            value={formatAmount(stats?.monthlyExpenses || 0)}
            icon="arrow-down-circle"
            color={colors.error}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: colors.onSurface }]}
          >
            Quick Actions
          </Text>
          <View style={styles.quickActions}>
            <QuickAction
              icon="plus-circle"
              label="Add Expense"
              color={colors.error}
              onPress={() => router.push({ pathname: '/transaction-modal', params: { type: 'expense' } })}
            />
            <QuickAction
              icon="cash-plus"
              label="Add Income"
              color={colors.tertiary}
              onPress={() => router.push({ pathname: '/transaction-modal', params: { type: 'income' } })}
            />
            <QuickAction
              icon="bank-transfer"
              label="Transfer"
              color={colors.primary}
              onPress={() => router.push({ pathname: '/transaction-modal', params: { type: 'transfer' } })}
            />
            <QuickAction
              icon="camera"
              label="Scan Receipt"
              color="#9c27b0"
              onPress={() => router.push('/(tabs)/chat')}
            />
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: colors.onSurface }]}
            >
              Recent Transactions
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <Text style={{ color: colors.primary }}>See All</Text>
            </TouchableOpacity>
          </View>

          <Surface
            style={[styles.transactionsList, { backgroundColor: colors.surface }]}
            elevation={1}
          >
            {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
              stats.recentTransactions.slice(0, 5).map((transaction, index) => (
                <React.Fragment key={transaction.id}>
                  <TouchableOpacity
                    style={styles.transactionItem}
                    onPress={() =>
                      router.push(`/(tabs)/transactions?id=${transaction.id}`)
                    }
                  >
                    <View
                      style={[
                        styles.transactionIcon,
                        {
                          backgroundColor:
                            transaction.type === 'income'
                              ? `${colors.tertiary}20`
                              : `${colors.error}20`,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={
                          transaction.type === 'income'
                            ? 'arrow-down-circle'
                            : 'arrow-up-circle'
                        }
                        size={24}
                        color={
                          transaction.type === 'income'
                            ? colors.tertiary
                            : colors.error
                        }
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text
                        variant="bodyMedium"
                        style={{ color: colors.onSurface }}
                        numberOfLines={1}
                      >
                        {transaction.merchant_name ||
                          'Transaction'}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.onSurfaceVariant }}
                      >
                        {formatRelativeTime(transaction.date)}
                      </Text>
                    </View>
                    <Text
                      variant="titleSmall"
                      style={{
                        color:
                          transaction.type === 'income'
                            ? colors.tertiary
                            : colors.error,
                      }}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatAmount(transaction.amount)}
                    </Text>
                  </TouchableOpacity>
                  {index < (stats.recentTransactions?.length || 0) - 1 && (
                    <Divider style={{ marginLeft: 72 }} />
                  )}
                </React.Fragment>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="receipt"
                  size={48}
                  color={colors.onSurfaceVariant}
                />
                <Text
                  variant="bodyMedium"
                  style={{ color: colors.onSurfaceVariant, marginTop: 8 }}
                >
                  No recent transactions
                </Text>
              </View>
            )}
          </Surface>
        </View>

        {/* Budget Summary */}
        {stats?.budgetSummary && (
          <View style={styles.section}>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: colors.onSurface }]}
            >
              Budget Overview
            </Text>
            <Surface
              style={[styles.budgetCard, { backgroundColor: colors.surface }]}
              elevation={1}
            >
              <View style={styles.budgetHeader}>
                <View>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.onSurfaceVariant }}
                  >
                    Spent
                  </Text>
                  <Text
                    variant="titleMedium"
                    style={{ color: colors.onSurface }}
                  >
                    {formatAmount(stats.budgetSummary.total_spent)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.onSurfaceVariant }}
                  >
                    Remaining
                  </Text>
                  <Text variant="titleMedium" style={{ color: colors.tertiary }}>
                    {formatAmount(stats.budgetSummary.remaining)}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.budgetProgress,
                  { backgroundColor: colors.surfaceVariant },
                ]}
              >
                <View
                  style={[
                    styles.budgetProgressFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${Math.min(
                        (stats.budgetSummary.total_spent /
                          stats.budgetSummary.total_budgeted) *
                          100,
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text
                variant="bodySmall"
                style={{ color: colors.onSurfaceVariant, marginTop: 8 }}
              >
                {formatAmount(stats.budgetSummary.total_budgeted)} budgeted this
                month
              </Text>
            </Surface>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    marginBottom: 2,
  },
  userName: {
    fontWeight: 'bold',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  netWorthCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  netWorthContent: {
    padding: 8,
  },
  netWorthLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  netWorthValue: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  netWorthMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  netWorthMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  netWorthMetaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    marginBottom: 2,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    textAlign: 'center',
  },
  transactionsList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  budgetCard: {
    padding: 16,
    borderRadius: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  budgetProgress: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
