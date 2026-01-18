import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Text,
  Searchbar,
  Chip,
  FAB,
  ActivityIndicator,
  Surface,
  Divider,
  Menu,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import transactionService from '../../src/services/transactionService';
import accountService from '../../src/services/accountService';
import { formatDate } from '../../src/utils/date';
import { Transaction, TransactionType, AccountType, Account } from '../../src/types';

type FilterType = 'all' | TransactionType;

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Fetch accounts for asset/liability filtering
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
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

  // Create a map of account_id to account for quick lookup
  const accountsMap = React.useMemo(() => {
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
    queryKey: ['transactions', filterType],
    queryFn: async () => {
      const params: Record<string, string> = {};
      // Only filter by transaction type for income/expense/transfer
      // asset/liability filtering is done client-side based on account type
      if (filterType !== 'all' && filterType !== 'asset' && filterType !== 'liability') {
        params.type = filterType;
      }
      const result = await transactionService.getAll(params);
      if (result.success && result.data) {
        // Handle Laravel paginated response structure
        // API returns: { success: true, data: { data: { data: [...] } } } OR { success: true, data: { data: [...] } }
        const laravelResponse = result.data as any;

        let transactionsData: Transaction[] = [];

        // Check for triply nested: laravelResponse.data.data (array)
        if (laravelResponse.data?.data && Array.isArray(laravelResponse.data.data)) {
          transactionsData = laravelResponse.data.data;
        }
        // Check for doubly nested: laravelResponse.data (array)
        else if (Array.isArray(laravelResponse.data)) {
          transactionsData = laravelResponse.data;
        }
        // Check if laravelResponse itself is an array
        else if (Array.isArray(laravelResponse)) {
          transactionsData = laravelResponse;
        }

        console.log('Transactions loaded:', transactionsData.length);
        return transactionsData;
      }
      throw new Error(result.error || 'Failed to load transactions');
    },
  });

  const transactions = transactionsData || [];

  // Helper to get account type for a transaction
  const getTransactionAccountType = useCallback((t: Transaction): AccountType | undefined => {
    // First try the nested account object
    if (t.account?.account_type) {
      return t.account.account_type;
    }
    // Fall back to looking up by account_id in our accounts map
    if (t.account_id) {
      const account = accountsMap.get(t.account_id);
      return account?.account_type;
    }
    return undefined;
  }, [accountsMap]);

  // Filter and sort transactions
  const filteredTransactions = useCallback(() => {
    let filtered = [...transactions];

    // Filter by transaction type
    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.merchant_name?.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.category?.name?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });

    return filtered;
  }, [transactions, searchQuery, sortBy, sortOrder, filterType]);

  const handleSort = (by: 'date' | 'amount') => {
    if (sortBy === by) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(by);
      setSortOrder('desc');
    }
    setSortMenuVisible(false);
  };

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return 'arrow-down-circle';
      case 'expense':
        return 'arrow-up-circle';
      case 'transfer':
        return 'bank-transfer';
      case 'asset':
        return 'wallet';
      case 'liability':
        return 'credit-card';
      default:
        return 'cash';
    }
  };

  const getTransactionColor = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return colors.tertiary;
      case 'expense':
        return colors.error;
      case 'transfer':
        return colors.primary;
      case 'asset':
        return '#4CAF50'; // Green for assets
      case 'liability':
        return '#FF9800'; // Orange for liabilities
      default:
        return colors.onSurfaceVariant;
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => {
        // Handle API structure: payment_method for account, expense_categories for category
        // Category: check expense_categories array first, then fallback to category_id/category
        let categoryId: number | undefined = item.category_id || item.category?.id;
        let subcategoryId: number | undefined = item.subcategory_id || item.subcategory?.id;

        if (item.expense_categories && item.expense_categories.length > 0) {
          const primaryCategory = item.expense_categories[0];
          categoryId = primaryCategory.category_id;
          subcategoryId = primaryCategory.subcategory_id;
        }

        // Account: check payment_method first, then account_id/account
        const accountId = item.payment_method || item.account_id || item.account?.id;

        // Debug logging
        console.log('Edit transaction:', {
          id: item.id,
          type: item.type,
          payment_method: item.payment_method,
          expense_categories: item.expense_categories,
          categoryId,
          subcategoryId,
          accountId,
        });

        router.push({
          pathname: '/transaction-modal',
          params: {
            id: item.id.toString(),
            type: item.type,
            amount: item.amount.toString(),
            merchant_name: item.merchant_name || '',
            description: item.description || '',
            category_id: categoryId?.toString() || '',
            subcategory_id: subcategoryId?.toString() || '',
            account_id: accountId?.toString() || '',
            notes: item.notes || '',
            date: item.date,
          },
        });
      }}
    >
      <View
        style={[
          styles.transactionIcon,
          { backgroundColor: `${getTransactionColor(item.type)}20` },
        ]}
      >
        <MaterialCommunityIcons
          name={getTransactionIcon(item.type)}
          size={24}
          color={getTransactionColor(item.type)}
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text
          variant="bodyLarge"
          style={{ color: colors.onSurface }}
          numberOfLines={1}
        >
          {item.merchant_name || item.description || 'Transaction'}
        </Text>
        <View style={styles.transactionMeta}>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {formatDate(item.date)}
          </Text>
          {item.category && (
            <Chip
              compact
              textStyle={{ fontSize: 10 }}
              style={styles.categoryChip}
            >
              {item.category.name}
            </Chip>
          )}
        </View>
      </View>
      <Text
        variant="titleMedium"
        style={{ color: getTransactionColor(item.type), fontWeight: '600' }}
      >
        {item.type === 'expense' ? '-' : item.type === 'income' ? '+' : ''}
        {formatAmount(item.amount)}
      </Text>
    </TouchableOpacity>
  );

  const renderSectionHeader = (date: string) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
        {formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>
    </View>
  );

  // Group transactions by date
  const groupedTransactions = useCallback(() => {
    const filtered = filteredTransactions();
    const groups: { date: string; data: Transaction[] }[] = [];
    let currentDate = '';

    filtered.forEach((transaction) => {
      const date = transaction.date.split('T')[0];
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, data: [] });
      }
      groups[groups.length - 1].data.push(transaction);
    });

    return groups;
  }, [filteredTransactions]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
          Transactions
        </Text>
        <Menu
          visible={sortMenuVisible}
          onDismiss={() => setSortMenuVisible(false)}
          anchor={
            <IconButton
              icon="sort"
              size={24}
              onPress={() => setSortMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            leadingIcon={sortBy === 'date' ? 'check' : undefined}
            onPress={() => handleSort('date')}
            title={`Date ${sortBy === 'date' ? (sortOrder === 'desc' ? '(Newest)' : '(Oldest)') : ''}`}
          />
          <Menu.Item
            leadingIcon={sortBy === 'amount' ? 'check' : undefined}
            onPress={() => handleSort('amount')}
            title={`Amount ${sortBy === 'amount' ? (sortOrder === 'desc' ? '(Highest)' : '(Lowest)') : ''}`}
          />
        </Menu>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search transactions..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchbar, { backgroundColor: colors.surfaceVariant }]}
          inputStyle={{ fontSize: 14 }}
        />
      </View>

      {/* Filter Chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
        <Chip
          selected={filterType === 'all'}
          onPress={() => setFilterType('all')}
          style={styles.filterChip}
          showSelectedCheck={false}
          mode={filterType === 'all' ? 'flat' : 'outlined'}
        >
          All
        </Chip>
        <Chip
          selected={filterType === 'income'}
          onPress={() => setFilterType('income')}
          style={styles.filterChip}
          showSelectedCheck={false}
          mode={filterType === 'income' ? 'flat' : 'outlined'}
        >
          Income
        </Chip>
        <Chip
          selected={filterType === 'expense'}
          onPress={() => setFilterType('expense')}
          style={styles.filterChip}
          showSelectedCheck={false}
          mode={filterType === 'expense' ? 'flat' : 'outlined'}
        >
          Expenses
        </Chip>
        <Chip
          selected={filterType === 'transfer'}
          onPress={() => setFilterType('transfer')}
          style={styles.filterChip}
          showSelectedCheck={false}
          mode={filterType === 'transfer' ? 'flat' : 'outlined'}
        >
          Transfers
        </Chip>
        <Chip
          selected={filterType === 'asset'}
          onPress={() => setFilterType('asset')}
          style={styles.filterChip}
          showSelectedCheck={false}
          mode={filterType === 'asset' ? 'flat' : 'outlined'}
        >
          Assets
        </Chip>
        <Chip
          selected={filterType === 'liability'}
          onPress={() => setFilterType('liability')}
          style={styles.filterChip}
          showSelectedCheck={false}
          mode={filterType === 'liability' ? 'flat' : 'outlined'}
        >
          Liabilities
        </Chip>
        </ScrollView>
      </View>

      {/* Transactions List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredTransactions().length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="receipt-text-outline"
            size={64}
            color={colors.onSurfaceVariant}
          />
          <Text
            variant="titleMedium"
            style={{ color: colors.onSurfaceVariant, marginTop: 16 }}
          >
            No transactions found
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}
          >
            {searchQuery
              ? 'Try a different search term'
              : 'Add your first transaction to get started'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {groupedTransactions().map((group) => (
            <Surface
              key={group.date}
              style={[styles.dateGroup, { backgroundColor: colors.surface }]}
              elevation={1}
            >
              {renderSectionHeader(group.date)}
              {group.data.map((transaction, index) => (
                <React.Fragment key={transaction.id}>
                  {renderTransaction({ item: transaction })}
                  {index < group.data.length - 1 && (
                    <Divider style={{ marginLeft: 72 }} />
                  )}
                </React.Fragment>
              ))}
            </Surface>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.primary }]}
        color="#ffffff"
        onPress={() => router.push('/transaction-modal')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchbar: {
    borderRadius: 12,
    elevation: 0,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    height: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  dateGroup: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    height: 20,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
