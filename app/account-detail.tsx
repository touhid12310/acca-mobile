import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import {
  Text,
  Surface,
  ActivityIndicator,
  TextInput,
  Button,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { useTheme } from '../src/contexts/ThemeContext';
import { useCurrency } from '../src/contexts/CurrencyContext';
import accountService from '../src/services/accountService';
import { Account, Transaction } from '../src/types';

const accountTypeOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank Account', label: 'Bank Account' },
  { value: 'Savings Account', label: 'Savings' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Mobile Banking/e-Wallet', label: 'e-Wallet' },
  { value: 'Loan Account', label: 'Loan' },
  { value: 'Investment Account', label: 'Investment' },
  { value: 'Digital Bank Account', label: 'Digital Bank' },
  { value: 'Prepaid Card', label: 'Prepaid' },
  { value: 'Other', label: 'Other' },
];

export default function AccountDetailScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Number(id);

  const [activeTab, setActiveTab] = useState<'transactions' | 'reconcile' | 'edit'>('transactions');
  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'Bank Account',
    balance: '',
  });

  // Fetch account details
  const {
    data: account,
    isLoading: accountLoading,
    refetch: refetchAccount,
  } = useQuery({
    queryKey: ['account', accountId],
    queryFn: async () => {
      const result = await accountService.getById(accountId);
      if (result.success && result.data) {
        const acc = (result.data as any)?.data || result.data;
        return acc as Account;
      }
      return null;
    },
    enabled: !!accountId,
  });

  // Fetch transactions for this account
  const {
    data: transactions,
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
    isRefetching,
  } = useQuery({
    queryKey: ['transactions', 'account', accountId],
    queryFn: async () => {
      const result = await accountService.getTransactions(accountId);
      console.log('Account transactions API response:', JSON.stringify(result, null, 2));
      if (result.success && result.data) {
        const responseData = result.data as any;
        // Handle nested data structure from API: response.data.data.transactions
        let txData: any[] = [];
        if (responseData?.data?.transactions) {
          txData = responseData.data.transactions;
        } else if (responseData?.transactions) {
          txData = responseData.transactions;
        } else if (Array.isArray(responseData?.data)) {
          txData = responseData.data;
        } else if (Array.isArray(responseData)) {
          txData = responseData;
        }
        console.log('Extracted transactions count:', txData.length);
        return txData;
      }
      console.log('API call failed or no data');
      return [];
    },
    enabled: !!accountId,
  });

  // Ensure transactions is always an array
  const transactionsList = Array.isArray(transactions) ? transactions : [];

  // Calculate totals
  const totalIncome = transactionsList
    .filter((t: Transaction) => t.type === 'income')
    .reduce((sum: number, t: Transaction) => sum + Number(t.amount || 0), 0);

  const totalExpenses = transactionsList
    .filter((t: Transaction) => t.type === 'expense')
    .reduce((sum: number, t: Transaction) => sum + Number(t.amount || 0), 0);

  const netAmount = totalIncome - totalExpenses;

  // Update form when account loads
  useEffect(() => {
    if (account) {
      setFormData({
        account_name: account.account_name || '',
        account_type: account.type || account.account_type || 'Bank Account',
        balance: String(Number(account.current_balance) || Number(account.balance) || 0),
      });
    }
  }, [account]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await accountService.update(accountId, {
        account_name: data.account_name,
        type: data.account_type,
        current_balance: parseFloat(data.balance) || 0,
      });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      Alert.alert('Success', 'Account updated successfully');
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const result = await accountService.delete(accountId);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      router.back();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const handleSave = () => {
    if (!formData.account_name.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }
    updateMutation.mutate(formData);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${account?.account_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income': return 'arrow-down';
      case 'expense': return 'arrow-up';
      case 'transfer': return 'swap-horizontal';
      default: return 'cash';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'income': return colors.tertiary;
      case 'expense': return colors.error;
      case 'transfer': return colors.primary;
      default: return colors.onSurfaceVariant;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (accountLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
            Account
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 16 }}>
            Account not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const accountBalance = Number(account.current_balance) || Number(account.balance) || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text variant="titleLarge" style={{ color: colors.onSurface, fontWeight: 'bold' }} numberOfLines={1}>
            {account.account_name}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {account.type || account.account_type || 'Account'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <MaterialCommunityIcons name="delete-outline" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <Surface style={[styles.balanceCard, { backgroundColor: colors.primaryContainer }]} elevation={0}>
        <Text variant="bodyMedium" style={{ color: colors.primary }}>Current Balance</Text>
        <Text variant="headlineLarge" style={{ color: colors.primary, fontWeight: 'bold' }}>
          {formatAmount(accountBalance)}
        </Text>
      </Surface>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.surfaceVariant }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'transactions' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('transactions')}
        >
          <MaterialCommunityIcons
            name="format-list-bulleted"
            size={20}
            color={activeTab === 'transactions' ? colors.primary : colors.onSurfaceVariant}
          />
          <Text
            style={{
              color: activeTab === 'transactions' ? colors.primary : colors.onSurfaceVariant,
              fontWeight: activeTab === 'transactions' ? '600' : '400',
              marginLeft: 6,
            }}
          >
            Transactions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'reconcile' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('reconcile')}
        >
          <MaterialCommunityIcons
            name="check-decagram"
            size={20}
            color={activeTab === 'reconcile' ? colors.primary : colors.onSurfaceVariant}
          />
          <Text
            style={{
              color: activeTab === 'reconcile' ? colors.primary : colors.onSurfaceVariant,
              fontWeight: activeTab === 'reconcile' ? '600' : '400',
              marginLeft: 6,
            }}
          >
            Reconcile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'edit' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('edit')}
        >
          <MaterialCommunityIcons
            name="pencil"
            size={20}
            color={activeTab === 'edit' ? colors.primary : colors.onSurfaceVariant}
          />
          <Text
            style={{
              color: activeTab === 'edit' ? colors.primary : colors.onSurfaceVariant,
              fontWeight: activeTab === 'edit' ? '600' : '400',
              marginLeft: 6,
            }}
          >
            Edit
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'transactions' && (
        <View style={{ flex: 1 }}>
          {transactionsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={transactionsList}
              keyExtractor={(item: Transaction) => String(item.id)}
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetchTransactions}
                  colors={[colors.primary]}
                />
              }
              ListHeaderComponent={() => (
                <View style={styles.summaryCards}>
                  <Surface style={[styles.summaryCard, { backgroundColor: colors.surface }]} elevation={1}>
                    <View style={[styles.summaryIcon, { backgroundColor: `${colors.tertiary}15` }]}>
                      <MaterialCommunityIcons name="arrow-down" size={18} color={colors.tertiary} />
                    </View>
                    <Text variant="titleSmall" style={{ color: colors.tertiary, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
                      {formatAmount(totalIncome)}
                    </Text>
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Income</Text>
                  </Surface>

                  <Surface style={[styles.summaryCard, { backgroundColor: colors.surface }]} elevation={1}>
                    <View style={[styles.summaryIcon, { backgroundColor: `${colors.error}15` }]}>
                      <MaterialCommunityIcons name="arrow-up" size={18} color={colors.error} />
                    </View>
                    <Text variant="titleSmall" style={{ color: colors.error, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
                      {formatAmount(totalExpenses)}
                    </Text>
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Expenses</Text>
                  </Surface>

                  <Surface style={[styles.summaryCard, { backgroundColor: colors.surface }]} elevation={1}>
                    <View style={[styles.summaryIcon, { backgroundColor: `${colors.primary}15` }]}>
                      <MaterialCommunityIcons name="scale-balance" size={18} color={colors.primary} />
                    </View>
                    <Text
                      variant="titleSmall"
                      style={{ color: netAmount >= 0 ? colors.tertiary : colors.error, fontWeight: 'bold' }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatAmount(Math.abs(netAmount))}
                    </Text>
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                      {netAmount >= 0 ? 'Net Income' : 'Net Expense'}
                    </Text>
                  </Surface>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="receipt" size={64} color={colors.onSurfaceVariant} />
                  <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 16 }}>
                    No transactions yet
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
                    Transactions for this account will appear here
                  </Text>
                </View>
              )}
              renderItem={({ item }: { item: Transaction }) => {
                const txType = item.type || 'expense';
                const iconColor = getTransactionColor(txType);
                const merchantName = item.merchant_name || item.description || 'Transaction';
                // Get category name from expense_categories pivot table like web version
                const expenseCategories = (item as any).expense_categories;
                const categoryName = expenseCategories && expenseCategories.length > 0
                  ? expenseCategories.map((ec: any) => ec.category?.name || '').filter(Boolean).join(', ')
                  : (item as any).category_name || (item as any).category || '';
                const txDate = formatDate(item.date || (item as any).transaction_date || '');

                return (
                  <Surface style={[styles.transactionItem, { backgroundColor: colors.surface }]} elevation={1}>
                    <View style={[styles.txIcon, { backgroundColor: `${iconColor}15` }]}>
                      <MaterialCommunityIcons
                        name={getTransactionIcon(txType) as any}
                        size={20}
                        color={iconColor}
                      />
                    </View>
                    <View style={styles.txInfo}>
                      <Text variant="bodyLarge" style={{ color: colors.onSurface }} numberOfLines={1}>
                        {merchantName}
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        {txDate}
                      </Text>
                      {categoryName ? (
                        <View style={[styles.categoryBadge, { backgroundColor: `${iconColor}15`, marginTop: 2 }]}>
                          <Text style={{ color: iconColor, fontSize: 10 }}>{categoryName}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.txAmount}>
                      <Text
                        variant="titleMedium"
                        style={{
                          color: txType === 'income' ? colors.tertiary : colors.error,
                          fontWeight: '600',
                        }}
                        numberOfLines={1}
                      >
                        {txType === 'income' ? '+' : '-'}{formatAmount(Number(item.amount) || 0)}
                      </Text>
                    </View>
                  </Surface>
                );
              }}
            />
          )}
        </View>
      )}

      {activeTab === 'reconcile' && (
        <ScrollView contentContainerStyle={styles.tabContent}>
          <Surface style={[styles.reconcileCard, { backgroundColor: colors.surface }]} elevation={1}>
            <MaterialCommunityIcons name="check-decagram" size={48} color={colors.primary} />
            <Text variant="titleMedium" style={{ color: colors.onSurface, marginTop: 12 }}>
              Bank Reconciliation
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
              Compare your account balance with your bank statement to ensure accuracy
            </Text>

            <Divider style={{ marginVertical: 20, width: '100%' }} />

            <View style={styles.reconcileRow}>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>Account Balance:</Text>
              <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                {formatAmount(accountBalance)}
              </Text>
            </View>

            <TextInput
              label="Bank Statement Balance"
              mode="outlined"
              keyboardType="decimal-pad"
              placeholder="Enter bank statement balance"
              style={{ width: '100%', marginTop: 16 }}
            />

            <Button mode="contained" style={{ marginTop: 20, width: '100%' }}>
              Start Reconciliation
            </Button>
          </Surface>
        </ScrollView>
      )}

      {activeTab === 'edit' && (
        <ScrollView contentContainerStyle={styles.tabContent}>
          <Surface style={[styles.editCard, { backgroundColor: colors.surface }]} elevation={1}>
            <TextInput
              label="Account Name"
              value={formData.account_name}
              onChangeText={(text) => setFormData({ ...formData, account_name: text })}
              mode="outlined"
              style={styles.input}
            />

            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
              Account Type
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {accountTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: formData.account_type === option.value ? colors.primary : colors.surfaceVariant,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, account_type: option.value })}
                >
                  <Text
                    style={{
                      color: formData.account_type === option.value ? '#fff' : colors.onSurfaceVariant,
                      fontSize: 12,
                      fontWeight: '500',
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              label="Current Balance"
              value={formData.balance}
              onChangeText={(text) => setFormData({ ...formData, balance: text })}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <View style={styles.editButtons}>
              <Button
                mode="outlined"
                onPress={handleDelete}
                textColor={colors.error}
                style={{ flex: 1, borderColor: colors.error }}
              >
                Delete Account
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={updateMutation.isPending}
                style={{ flex: 1 }}
              >
                Save Changes
              </Button>
            </View>
          </Surface>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  title: {
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txAmount: {
    alignItems: 'flex-end',
    marginLeft: 4,
  },
  reconcileCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  reconcileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  editCard: {
    padding: 20,
    borderRadius: 16,
  },
  input: {
    marginBottom: 16,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
