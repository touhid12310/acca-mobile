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
  IconButton,
  Menu,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

import { useTheme } from '../src/contexts/ThemeContext';
import { useCurrency } from '../src/contexts/CurrencyContext';
import accountService from '../src/services/accountService';
import transactionService from '../src/services/transactionService';
import categoryService from '../src/services/categoryService';
import DateField from '../src/components/common/DateField';
import { Account, Transaction } from '../src/types';

interface ReconcileTransaction {
  date: string;
  merchant_name: string;
  description?: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category_id?: number;
  notes?: string;
  isMatched?: boolean;
  matchedData?: Transaction;
}

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

// Helper function to extract detailed validation errors from API response
const formatApiError = (result: any): string => {
  const errorData = result.data;
  let errorMsg = errorData?.message || result.error || 'Request failed';

  // Check for Laravel validation errors
  const validationErrors = errorData?.errors;
  if (validationErrors && typeof validationErrors === 'object') {
    const errorDetails = Object.entries(validationErrors)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
      .join('\n');
    if (errorDetails) {
      errorMsg = `${errorMsg}\n\n${errorDetails}`;
    }
  }

  return errorMsg;
};

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

  // Reconcile state
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [reconcileData, setReconcileData] = useState<ReconcileTransaction[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

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
        return txData;
      }
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
      if (!result.success) throw new Error(formatApiError(result));
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
      if (!result.success) throw new Error(formatApiError(result));
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

  // Reconcile functions
  const loadCategories = async (type: string) => {
    try {
      const result = await categoryService.getForTransaction({ type });
      if (result.success && result.data) {
        const data = (result.data as any)?.data || result.data;
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      // Failed to load categories
    }
  };

  const handlePickCsv = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      setIsProcessingCsv(true);

      const response = await transactionService.processCsv({
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'text/csv',
      });

      if (response.success && response.data) {
        const csvData = (response.data as any)?.data || response.data;
        const bankTransactions: ReconcileTransaction[] = (Array.isArray(csvData) ? csvData : []).map((tx: any) => ({
          date: tx.date || '',
          merchant_name: tx.merchant_name || tx.description || tx.payee || '',
          description: tx.description || '',
          amount: parseFloat(tx.amount) || 0,
          type: tx.type || 'expense',
          notes: tx.notes || tx.reference || '',
          isMatched: false,
        }));

        // Match with existing account transactions
        const existingTx = transactionsList || [];
        let matched = 0;
        let unmatched = 0;

        const matchedData = bankTransactions.map((bankTx) => {
          const match = existingTx.find((accTx: Transaction) => {
            const bankDate = bankTx.date?.split('T')[0];
            const accDate = (accTx.date || '').split('T')[0];
            const amountMatch = Math.abs(Number(accTx.amount) - bankTx.amount) < 0.01;
            const dateMatch = bankDate === accDate;
            const merchantMatch = bankTx.merchant_name?.toLowerCase() === accTx.merchant_name?.toLowerCase();
            return dateMatch && amountMatch && merchantMatch;
          });

          if (match) {
            matched++;
            return { ...bankTx, isMatched: true, matchedData: match };
          } else {
            unmatched++;
            return bankTx;
          }
        });

        setReconcileData(matchedData);
        setMatchedCount(matched);
        setUnmatchedCount(unmatched);

        // Load categories for expense type by default
        await loadCategories('expense');

        Alert.alert('Success', `Processed ${bankTransactions.length} transactions. ${matched} matched, ${unmatched} unmatched.`);
      } else {
        Alert.alert('Error', response.error || 'Failed to process CSV');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick or process CSV file');
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleUpdateReconcileItem = (index: number, field: string, value: any) => {
    setReconcileData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // If type changes, reload categories
      if (field === 'type' && value) {
        loadCategories(value);
        updated[index].category_id = undefined;
      }

      return updated;
    });
  };

  const handleSaveSingle = async (index: number) => {
    const tx = reconcileData[index];
    if (!tx.merchant_name || !tx.amount || !tx.date || !tx.type) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (tx.type !== 'transfer' && !tx.category_id) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setSavingIndex(index);
    try {
      const result = await transactionService.bulkCreate([{
        merchant_name: tx.merchant_name,
        description: tx.description || tx.merchant_name,
        amount: tx.amount,
        type: tx.type,
        date: tx.date,
        category_id: tx.category_id,
        payment_method: accountId,
        notes: tx.notes,
      }]);

      if (result.success) {
        // Remove saved transaction from list
        setReconcileData(prev => prev.filter((_, i) => i !== index));
        setUnmatchedCount(prev => prev - 1);
        queryClient.invalidateQueries({ queryKey: ['transactions', 'account', accountId] });
        Alert.alert('Success', 'Transaction saved');
      } else {
        Alert.alert('Error', result.error || 'Failed to save transaction');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction');
    } finally {
      setSavingIndex(null);
    }
  };

  const handleSkipTransaction = (index: number) => {
    setReconcileData(prev => prev.filter((_, i) => i !== index));
    const tx = reconcileData[index];
    if (tx.isMatched) {
      setMatchedCount(prev => prev - 1);
    } else {
      setUnmatchedCount(prev => prev - 1);
    }
  };

  const handleSaveAll = async () => {
    const unmatchedTx = reconcileData.filter(tx => !tx.isMatched);

    // Validate all transactions
    const invalidTx = unmatchedTx.find(tx =>
      !tx.merchant_name || !tx.amount || !tx.date || !tx.type || (tx.type !== 'transfer' && !tx.category_id)
    );

    if (invalidTx) {
      Alert.alert('Error', 'Please fill in all required fields for all transactions');
      return;
    }

    setSavingAll(true);
    try {
      const transactions = unmatchedTx.map(tx => ({
        merchant_name: tx.merchant_name,
        description: tx.description || tx.merchant_name,
        amount: tx.amount,
        type: tx.type,
        date: tx.date,
        category_id: tx.category_id,
        payment_method: accountId,
        notes: tx.notes,
      }));

      const result = await transactionService.bulkCreate(transactions);

      if (result.success) {
        setReconcileData([]);
        setMatchedCount(0);
        setUnmatchedCount(0);
        queryClient.invalidateQueries({ queryKey: ['transactions', 'account', accountId] });
        Alert.alert('Success', `${transactions.length} transactions saved`);
      } else {
        Alert.alert('Error', result.error || 'Failed to save transactions');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save transactions');
    } finally {
      setSavingAll(false);
    }
  };

  const handleClearReconcile = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to clear all reconciliation data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setReconcileData([]);
            setMatchedCount(0);
            setUnmatchedCount(0);
          },
        },
      ]
    );
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
              contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 32 }}
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
                      {item.notes ? (
                        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                          {item.notes}
                        </Text>
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
        <View style={{ flex: 1 }}>
          {reconcileData.length === 0 ? (
            <ScrollView contentContainerStyle={styles.tabContent}>
              {/* Upload Section */}
              <Surface style={[styles.reconcileCard, { backgroundColor: colors.surface }]} elevation={1}>
                <MaterialCommunityIcons name="file-upload" size={48} color={colors.primary} />
                <Text variant="titleMedium" style={{ color: colors.onSurface, marginTop: 12 }}>
                  Upload Bank Statement
                </Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
                  Upload a CSV file from your bank to match transactions with your records
                </Text>

                <Divider style={{ marginVertical: 20, width: '100%' }} />

                <View style={styles.reconcileRow}>
                  <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>Account Balance:</Text>
                  <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                    {formatAmount(accountBalance)}
                  </Text>
                </View>

                <Button
                  mode="contained"
                  icon="upload"
                  onPress={handlePickCsv}
                  loading={isProcessingCsv}
                  disabled={isProcessingCsv}
                  style={{ marginTop: 20, width: '100%' }}
                >
                  {isProcessingCsv ? 'Processing...' : 'Choose CSV File'}
                </Button>

                <View style={{ marginTop: 20, width: '100%' }}>
                  <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
                    CSV Format Required:
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    • Date, Description, Amount, Type, Payee, Reference
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    • Date format: YYYY-MM-DD
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    • Type: income, expense, or transfer
                  </Text>
                </View>
              </Surface>
            </ScrollView>
          ) : (
            <FlatList
              data={reconcileData}
              keyExtractor={(_, index) => `reconcile-${index}`}
              contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 100 }}
              ListHeaderComponent={() => (
                <View style={{ marginBottom: 16 }}>
                  {/* Summary Cards */}
                  <View style={styles.reconcileSummary}>
                    <Surface style={[styles.reconcileSummaryCard, { backgroundColor: colors.tertiary }]} elevation={1}>
                      <MaterialCommunityIcons name="check-circle" size={24} color="#fff" />
                      <Text variant="titleLarge" style={{ color: '#fff', fontWeight: 'bold' }}>{matchedCount}</Text>
                      <Text variant="labelSmall" style={{ color: '#fff' }}>Matched</Text>
                    </Surface>
                    <Surface style={[styles.reconcileSummaryCard, { backgroundColor: colors.error }]} elevation={1}>
                      <MaterialCommunityIcons name="alert-circle" size={24} color="#fff" />
                      <Text variant="titleLarge" style={{ color: '#fff', fontWeight: 'bold' }}>{unmatchedCount}</Text>
                      <Text variant="labelSmall" style={{ color: '#fff' }}>Unmatched</Text>
                    </Surface>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.reconcileActions}>
                    <Button
                      mode="contained"
                      icon="content-save-all"
                      onPress={handleSaveAll}
                      loading={savingAll}
                      disabled={savingAll || unmatchedCount === 0}
                      style={{ flex: 1 }}
                    >
                      Save All ({unmatchedCount})
                    </Button>
                    <Button
                      mode="outlined"
                      icon="close"
                      onPress={handleClearReconcile}
                      disabled={savingAll}
                      style={{ marginLeft: 8 }}
                    >
                      Clear
                    </Button>
                  </View>

                  <Button
                    mode="text"
                    icon="plus"
                    onPress={handlePickCsv}
                    disabled={isProcessingCsv}
                    style={{ marginTop: 8 }}
                  >
                    Add More CSV Data
                  </Button>
                </View>
              )}
              renderItem={({ item, index }) => {
                const txColor = getTransactionColor(item.type);
                const isProcessing = savingIndex === index;

                return (
                  <Surface style={[styles.reconcileItem, { backgroundColor: colors.surface }]} elevation={1}>
                    {/* Status Badge */}
                    <View style={[
                      styles.reconcileStatusBadge,
                      { backgroundColor: item.isMatched ? `${colors.tertiary}15` : `${colors.error}15` }
                    ]}>
                      <MaterialCommunityIcons
                        name={item.isMatched ? 'check-circle' : 'alert-circle'}
                        size={16}
                        color={item.isMatched ? colors.tertiary : colors.error}
                      />
                      <Text style={{ color: item.isMatched ? colors.tertiary : colors.error, fontSize: 10, marginLeft: 4 }}>
                        {item.isMatched ? 'Matched' : 'Unmatched'}
                      </Text>
                    </View>

                    {/* Transaction Info */}
                    <View style={styles.reconcileItemHeader}>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          label="Merchant"
                          value={item.merchant_name}
                          onChangeText={(text) => handleUpdateReconcileItem(index, 'merchant_name', text)}
                          mode="outlined"
                          dense
                          style={styles.reconcileInput}
                        />
                      </View>
                      <View style={{ width: 100, marginLeft: 8 }}>
                        <TextInput
                          label="Amount"
                          value={String(item.amount)}
                          onChangeText={(text) => handleUpdateReconcileItem(index, 'amount', parseFloat(text) || 0)}
                          mode="outlined"
                          dense
                          keyboardType="decimal-pad"
                          style={styles.reconcileInput}
                        />
                      </View>
                    </View>

                    <View style={styles.reconcileItemRow}>
                      <View style={{ flex: 1 }}>
                        <DateField
                          label="Date"
                          value={item.date?.split('T')[0] || ''}
                          onChange={(date) => handleUpdateReconcileItem(index, 'date', date)}
                          dense
                          style={styles.reconcileInput}
                        />
                      </View>
                      <View style={{ width: 110, marginLeft: 8 }}>
                        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant, marginBottom: 4 }}>Type</Text>
                        <View style={styles.typeSelector}>
                          {['income', 'expense'].map((type) => (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.typeSelectorBtn,
                                {
                                  backgroundColor: item.type === type
                                    ? (type === 'income' ? colors.tertiary : colors.error)
                                    : colors.surfaceVariant,
                                },
                              ]}
                              onPress={() => handleUpdateReconcileItem(index, 'type', type)}
                            >
                              <Text style={{
                                color: item.type === type ? '#fff' : colors.onSurfaceVariant,
                                fontSize: 10,
                              }}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>

                    {/* Category Selector */}
                    {item.type !== 'transfer' && (
                      <View style={{ marginTop: 8 }}>
                        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant, marginBottom: 4 }}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {categories.map((cat) => (
                              <TouchableOpacity
                                key={cat.id}
                                style={[
                                  styles.categoryChip,
                                  {
                                    backgroundColor: item.category_id === cat.id ? colors.primary : colors.surfaceVariant,
                                  },
                                ]}
                                onPress={() => handleUpdateReconcileItem(index, 'category_id', cat.id)}
                              >
                                <Text style={{
                                  color: item.category_id === cat.id ? '#fff' : colors.onSurfaceVariant,
                                  fontSize: 11,
                                }}>
                                  {cat.name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
                      </View>
                    )}

                    {/* Notes */}
                    <TextInput
                      label="Notes"
                      value={item.notes || ''}
                      onChangeText={(text) => handleUpdateReconcileItem(index, 'notes', text)}
                      mode="outlined"
                      dense
                      style={[styles.reconcileInput, { marginTop: 8 }]}
                    />

                    {/* Action Buttons */}
                    <View style={styles.reconcileItemActions}>
                      <Button
                        mode="contained"
                        onPress={() => handleSaveSingle(index)}
                        loading={isProcessing}
                        disabled={isProcessing || savingAll}
                        style={{ flex: 1 }}
                        compact
                      >
                        Create
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleSkipTransaction(index)}
                        disabled={isProcessing || savingAll}
                        style={{ marginLeft: 8 }}
                        compact
                      >
                        {item.isMatched ? 'Confirm Match' : 'Skip'}
                      </Button>
                    </View>

                    {/* Matched Transaction Info */}
                    {item.isMatched && item.matchedData && (
                      <View style={[styles.matchedInfo, { backgroundColor: `${colors.tertiary}10` }]}>
                        <MaterialCommunityIcons name="check-circle" size={14} color={colors.tertiary} />
                        <Text variant="bodySmall" style={{ color: colors.tertiary, marginLeft: 6, flex: 1 }}>
                          Matched: {item.matchedData.merchant_name} - {formatAmount(Number(item.matchedData.amount))}
                        </Text>
                      </View>
                    )}
                  </Surface>
                );
              }}
            />
          )}
        </View>
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
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Reconcile styles
  reconcileSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  reconcileSummaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  reconcileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reconcileItem: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  reconcileStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  reconcileItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reconcileItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  reconcileInput: {
    backgroundColor: 'transparent',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  typeSelectorBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reconcileItemActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  matchedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
});
