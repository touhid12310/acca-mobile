import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Surface,
  FAB,
  ActivityIndicator,
  Portal,
  Modal,
  TextInput,
  Button,
  ProgressBar,
  Chip,
  SegmentedButtons,
  Divider,
} from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../src/contexts/ThemeContext';
import { useCurrency } from '../src/contexts/CurrencyContext';
import loanService from '../src/services/loanService';
import accountService from '../src/services/accountService';
import categoryService from '../src/services/categoryService';
import DateField from '../src/components/common/DateField';
import { Loan } from '../src/types';

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

const termPeriodOptions = [
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

export default function LoansScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showPaymentAccountPicker, setShowPaymentAccountPicker] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [formData, setFormData] = useState({
    loan_name: '',
    original_amount: '',
    interest_rate: '',
    next_payment: '',
    term: '',
    term_period: 'years' as 'months' | 'years',
    start_date: '',
    next_payment_date: '',
    loan_type: 'Borrowed' as 'Borrowed' | 'Lent',
    account_id: '',
    category_id: '',
    notes: '',
  });

  const [paymentData, setPaymentData] = useState({
    payment_amount: '',
    account_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    next_payment: '',
    next_payment_date: '',
    notes: '',
  });

  const {
    data: loans,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const result = await loanService.getAll();
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData || [];
      }
      return [];
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const result = await accountService.getAll();
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData || [];
      }
      return [];
    },
  });

  // Load categories based on loan type
  useEffect(() => {
    const loadCategories = async () => {
      if (!modalVisible) return;

      const categoryType = formData.loan_type === 'Lent' ? 'asset' : 'liability';
      try {
        const result = await categoryService.getForTransaction({ type: categoryType });
        if (result.success && result.data) {
          const data = (result.data as any)?.data || result.data;
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        setCategories([]);
      }
    };

    loadCategories();
  }, [formData.loan_type, modalVisible]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        loan_name: data.loan_name,
        original_amount: parseFloat(data.original_amount) || 0,
        interest_rate: parseFloat(data.interest_rate) || 0,
        next_payment: parseFloat(data.next_payment) || 0,
        term: parseInt(data.term) || 0,
        term_period: data.term_period,
        start_date: data.start_date || new Date().toISOString().split('T')[0],
        next_payment_date: data.next_payment_date || undefined,
        loan_type: data.loan_type,
        account_id: parseInt(data.account_id) || undefined,
        category_id: parseInt(data.category_id) || undefined,
        notes: data.notes || undefined,
      };
      const result = await loanService.create(payload);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      closeModal();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof paymentData }) => {
      const payload = {
        payment_amount: parseFloat(data.payment_amount) || 0,
        account_id: parseInt(data.account_id) || undefined,
        payment_date: data.payment_date || new Date().toISOString().split('T')[0],
        next_payment: data.next_payment ? parseFloat(data.next_payment) : undefined,
        next_payment_date: data.next_payment_date || undefined,
        notes: data.notes || undefined,
      };
      const result = await loanService.makePayment(id, payload);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      closePaymentModal();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await loanService.delete(id);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const openModal = () => {
    setFormData({
      loan_name: '',
      original_amount: '',
      interest_rate: '',
      next_payment: '',
      term: '',
      term_period: 'years',
      start_date: new Date().toISOString().split('T')[0],
      next_payment_date: '',
      loan_type: 'Borrowed',
      account_id: '',
      category_id: '',
      notes: '',
    });
    setShowCategoryPicker(false);
    setShowAccountPicker(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setShowCategoryPicker(false);
    setShowAccountPicker(false);
  };

  const openPaymentModal = (loan: Loan) => {
    setSelectedLoan(loan);
    setPaymentData({
      payment_amount: String(loan.next_payment || ''),
      account_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      next_payment: '',
      next_payment_date: '',
      notes: '',
    });
    setShowPaymentAccountPicker(false);
    setPaymentModalVisible(true);
  };

  const closePaymentModal = () => {
    setPaymentModalVisible(false);
    setSelectedLoan(null);
    setShowPaymentAccountPicker(false);
  };

  const handleSave = () => {
    if (!formData.loan_name.trim()) {
      Alert.alert('Error', 'Please enter a loan name');
      return;
    }
    if (!formData.original_amount || parseFloat(formData.original_amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!formData.category_id) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!formData.account_id) {
      Alert.alert('Error', 'Please select an account');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleMakePayment = () => {
    if (!selectedLoan) return;
    const amount = parseFloat(paymentData.payment_amount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }
    if (amount > parseFloat(String(selectedLoan.remaining_balance ?? 0))) {
      Alert.alert('Error', 'Payment amount exceeds remaining balance');
      return;
    }
    if (!paymentData.account_id) {
      Alert.alert('Error', 'Please select an account');
      return;
    }
    paymentMutation.mutate({ id: selectedLoan.id, data: paymentData });
  };

  const showLoanActions = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowActionSheet(true);
  };

  const handleDeletePress = () => {
    setShowActionSheet(false);
    setTimeout(() => setShowDeleteConfirm(true), 200);
  };

  const handleConfirmDelete = () => {
    if (selectedLoan) {
      deleteMutation.mutate(selectedLoan.id);
    }
    setShowDeleteConfirm(false);
    setSelectedLoan(null);
  };

  const closeActionSheet = () => {
    setShowActionSheet(false);
    setSelectedLoan(null);
  };

  const getSelectedCategoryName = () => {
    const cat = categories.find(c => String(c.id) === String(formData.category_id));
    return cat?.name || '';
  };

  const getSelectedAccountName = (accountId: string) => {
    const acc = (accounts || []).find((a: any) => String(a.id) === String(accountId));
    return acc?.account_name || '';
  };

  // Calculate stats
  const viewLoans = loans || [];
  const viewAccounts = accounts || [];
  const activeLoans = viewLoans.filter((loan: Loan) =>
    loan.status === 'Active' || !loan.status
  );

  // Borrowed loans (liability - I owe money)
  const borrowedLoans = activeLoans.filter((loan: Loan) =>
    loan.loan_type === 'Borrowed' || !loan.loan_type
  );
  const totalLoansToPay = borrowedLoans.reduce(
    (sum: number, loan: Loan) => sum + parseFloat(String(loan.remaining_balance ?? loan.principal ?? 0)),
    0
  );

  // Lent loans (asset - others owe me money)
  const lentLoans = activeLoans.filter((loan: Loan) =>
    loan.loan_type === 'Lent'
  );
  const totalLoansToReceive = lentLoans.reduce(
    (sum: number, loan: Loan) => sum + parseFloat(String(loan.remaining_balance ?? loan.principal ?? 0)),
    0
  );

  // Upcoming installments
  const totalUpcomingInstallments = activeLoans
    .filter((loan: Loan) => loan.next_payment && parseFloat(String(loan.next_payment)) > 0)
    .reduce((sum: number, loan: Loan) => sum + parseFloat(String(loan.next_payment ?? loan.monthly_payment ?? 0)), 0);

  const calculateProgress = (loan: Loan) => {
    const original = parseFloat(String(loan.original_amount ?? loan.principal ?? 0));
    const remaining = parseFloat(String(loan.remaining_balance ?? 0));
    if (original <= 0) return 0;
    return ((original - remaining) / original) * 100;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Active': return colors.primary;
      case 'Paid Off': return colors.tertiary;
      case 'Overdue': return colors.error;
      default: return colors.primary;
    }
  };

  const getDaysUntilPayment = (dateString?: string) => {
    if (!dateString) return null;
    const paymentDate = new Date(dateString);
    const today = new Date();
    const diffTime = paymentDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
          Loans
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
          />
        }
      >
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <Surface style={[styles.statCard, { backgroundColor: colors.errorContainer }]} elevation={1}>
            <MaterialCommunityIcons name="hand-coin" size={24} color={colors.error} />
            <Text variant="labelSmall" style={{ color: colors.error }}>To Pay</Text>
            <Text variant="titleSmall" style={{ color: colors.error, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
              {formatAmount(totalLoansToPay)}
            </Text>
            <Text variant="labelSmall" style={{ color: colors.error }}>{borrowedLoans.length} loans</Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.tertiaryContainer }]} elevation={1}>
            <MaterialCommunityIcons name="cash-plus" size={24} color={colors.tertiary} />
            <Text variant="labelSmall" style={{ color: colors.tertiary }}>To Receive</Text>
            <Text variant="titleSmall" style={{ color: colors.tertiary, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
              {formatAmount(totalLoansToReceive)}
            </Text>
            <Text variant="labelSmall" style={{ color: colors.tertiary }}>{lentLoans.length} loans</Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.primaryContainer }]} elevation={1}>
            <MaterialCommunityIcons name="calendar-clock" size={24} color={colors.primary} />
            <Text variant="labelSmall" style={{ color: colors.primary }}>Installments</Text>
            <Text variant="titleSmall" style={{ color: colors.primary, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
              {formatAmount(totalUpcomingInstallments)}
            </Text>
            <Text variant="labelSmall" style={{ color: colors.primary }}>upcoming</Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.surfaceVariant }]} elevation={1}>
            <MaterialCommunityIcons name="format-list-bulleted" size={24} color={colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Active</Text>
            <Text variant="titleSmall" style={{ color: colors.onSurfaceVariant, fontWeight: 'bold' }}>
              {activeLoans.length}
            </Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>total loans</Text>
          </Surface>
        </View>

        {/* Archived Toggle */}
        {viewLoans.length > activeLoans.length && (
          <TouchableOpacity
            style={[styles.archivedToggle, { backgroundColor: colors.surfaceVariant }]}
            onPress={() => setShowArchived(!showArchived)}
          >
            <MaterialCommunityIcons
              name={showArchived ? "archive-off" : "archive"}
              size={18}
              color={colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginLeft: 8 }}>
              {showArchived ? 'Hide' : 'Show'} Archived ({viewLoans.length - activeLoans.length})
            </Text>
            <MaterialCommunityIcons
              name={showArchived ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.onSurfaceVariant}
              style={{ marginLeft: 'auto' }}
            />
          </TouchableOpacity>
        )}

        {(showArchived ? viewLoans : activeLoans).length > 0 ? (
          (showArchived ? viewLoans : activeLoans).map((loan: Loan) => {
            const progress = calculateProgress(loan);
            const loanName = loan.loan_name || loan.name || 'Unnamed Loan';
            const originalAmount = parseFloat(String(loan.original_amount ?? loan.principal ?? 0));
            const remainingBalance = parseFloat(String(loan.remaining_balance ?? 0));
            const interestRate = loan.interest_rate ?? 0;
            const nextPayment = loan.next_payment ?? loan.monthly_payment ?? 0;
            const loanType = loan.loan_type || 'Borrowed';
            const status = loan.status || 'Active';
            const daysUntil = getDaysUntilPayment(loan.next_payment_date);
            const statusColor = getStatusColor(status);
            const isLent = loanType === 'Lent';

            return (
              <Surface
                key={loan.id}
                style={[styles.loanCard, { backgroundColor: colors.surface }]}
                elevation={1}
              >
                <TouchableOpacity onLongPress={() => showLoanActions(loan)}>
                  <View style={styles.loanHeader}>
                    <View style={[styles.loanIcon, { backgroundColor: `${isLent ? colors.tertiary : colors.error}15` }]}>
                      <MaterialCommunityIcons
                        name={isLent ? 'cash-plus' : 'hand-coin'}
                        size={24}
                        color={isLent ? colors.tertiary : colors.error}
                      />
                    </View>
                    <View style={styles.loanInfo}>
                      <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                        {loanName}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View
                          style={{
                            backgroundColor: isLent ? colors.tertiaryContainer : colors.errorContainer,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 12,
                          }}
                        >
                          <Text style={{ color: isLent ? colors.tertiary : colors.error, fontSize: 11, fontWeight: '500' }}>
                            {loanType}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: `${statusColor}20`,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 12,
                          }}
                        >
                          <Text style={{ color: statusColor, fontSize: 11, fontWeight: '500' }}>
                            {status}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.loanAmount}>
                      <Text variant="titleMedium" style={{ color: isLent ? colors.tertiary : colors.error, fontWeight: '600' }}>
                        {formatAmount(remainingBalance)}
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        remaining
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => showLoanActions(loan)}
                      style={styles.menuButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.loanDetails}>
                    <View style={styles.loanDetailItem}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Original</Text>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                        {formatAmount(originalAmount)}
                      </Text>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Interest</Text>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                        {interestRate}%
                      </Text>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Payment</Text>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                        {formatAmount(nextPayment)}
                      </Text>
                    </View>
                  </View>

                  {loan.next_payment_date && (
                    <View style={styles.nextPaymentRow}>
                      <MaterialCommunityIcons name="calendar" size={16} color={colors.onSurfaceVariant} />
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginLeft: 4 }}>
                        Next: {new Date(loan.next_payment_date).toLocaleDateString()}
                        {daysUntil !== null && daysUntil >= 0 && (
                          <Text style={{ color: daysUntil <= 7 ? colors.error : colors.primary }}>
                            {` (${daysUntil} days)`}
                          </Text>
                        )}
                      </Text>
                    </View>
                  )}

                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Progress</Text>
                      <Text variant="labelSmall" style={{ color: colors.tertiary }}>
                        {progress.toFixed(0)}% paid
                      </Text>
                    </View>
                    <ProgressBar
                      progress={Math.min(progress / 100, 1)}
                      color={colors.tertiary}
                      style={[styles.progressBar, { backgroundColor: `${colors.tertiary}20` }]}
                    />
                  </View>

                  {status === 'Active' && (
                    <TouchableOpacity
                      style={[styles.makePaymentButton, { backgroundColor: colors.primaryContainer }]}
                      onPress={() => openPaymentModal(loan)}
                    >
                      <MaterialCommunityIcons name="cash" size={18} color={colors.primary} />
                      <Text variant="labelMedium" style={{ color: colors.primary, marginLeft: 4 }}>
                        Make Payment
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </Surface>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="hand-coin-outline" size={64} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 16 }}>
              No active loans
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
              {viewLoans.length > 0
                ? `${viewLoans.length} loan(s) archived/paid off`
                : 'Track your loans and payments here'}
            </Text>
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.primary, bottom: 16 + insets.bottom }]}
        color={colors.onPrimary}
        onPress={openModal}
      />

      {/* Add Loan Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
              Add New Loan
            </Text>

            <TextInput
              label="Loan Name *"
              value={formData.loan_name}
              onChangeText={(text) => setFormData({ ...formData, loan_name: text })}
              mode="outlined"
              style={styles.input}
            />

            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
              Loan Type *
            </Text>
            <SegmentedButtons
              value={formData.loan_type}
              onValueChange={(value) => setFormData({ ...formData, loan_type: value as 'Borrowed' | 'Lent', category_id: '' })}
              buttons={[
                {
                  value: 'Borrowed',
                  label: 'Borrowed',
                  icon: 'hand-coin',
                },
                {
                  value: 'Lent',
                  label: 'Lent',
                  icon: 'cash-plus',
                },
              ]}
              style={{ marginBottom: 4 }}
            />
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: 12 }}>
              {formData.loan_type === 'Borrowed'
                ? 'Money you received (Liability)'
                : 'Money you gave (Asset)'}
            </Text>

            {/* Category Selection */}
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
              Category *
            </Text>
            {formData.category_id && (
              <Chip
                onClose={() => setFormData({ ...formData, category_id: '' })}
                style={{ alignSelf: 'flex-start', marginBottom: 8, backgroundColor: colors.primaryContainer }}
                textStyle={{ color: colors.primary }}
              >
                {getSelectedCategoryName()}
              </Chip>
            )}
            <TouchableOpacity
              style={[styles.pickerButton, { borderColor: colors.outline, backgroundColor: colors.surfaceVariant }]}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={{ color: colors.onSurfaceVariant }}>
                {formData.category_id ? getSelectedCategoryName() : 'Select category...'}
              </Text>
              <MaterialCommunityIcons
                name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            {showCategoryPicker && (
              <Surface style={[styles.dropdownList, { backgroundColor: colors.surface }]} elevation={2}>
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {categories.length === 0 ? (
                    <Text style={{ padding: 12, color: colors.onSurfaceVariant, textAlign: 'center' }}>
                      No {formData.loan_type === 'Lent' ? 'asset' : 'liability'} categories
                    </Text>
                  ) : (
                    categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.dropdownItem,
                          String(formData.category_id) === String(cat.id) && { backgroundColor: `${colors.primary}15` }
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, category_id: String(cat.id) });
                          setShowCategoryPicker(false);
                        }}
                      >
                        <Text style={{ color: colors.onSurface }}>{cat.name}</Text>
                        {String(formData.category_id) === String(cat.id) && (
                          <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </Surface>
            )}

            {/* Account Selection */}
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginTop: 12, marginBottom: 8 }}>
              Account *
            </Text>
            {formData.account_id && (
              <Chip
                onClose={() => setFormData({ ...formData, account_id: '' })}
                style={{ alignSelf: 'flex-start', marginBottom: 8, backgroundColor: colors.primaryContainer }}
                textStyle={{ color: colors.primary }}
              >
                {getSelectedAccountName(formData.account_id)}
              </Chip>
            )}
            <TouchableOpacity
              style={[styles.pickerButton, { borderColor: colors.outline, backgroundColor: colors.surfaceVariant }]}
              onPress={() => setShowAccountPicker(!showAccountPicker)}
            >
              <Text style={{ color: colors.onSurfaceVariant }}>
                {formData.account_id ? getSelectedAccountName(formData.account_id) : 'Select account...'}
              </Text>
              <MaterialCommunityIcons
                name={showAccountPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            {showAccountPicker && (
              <Surface style={[styles.dropdownList, { backgroundColor: colors.surface }]} elevation={2}>
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {viewAccounts.length === 0 ? (
                    <Text style={{ padding: 12, color: colors.onSurfaceVariant, textAlign: 'center' }}>
                      No accounts available
                    </Text>
                  ) : (
                    viewAccounts.map((acc: any) => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[
                          styles.dropdownItem,
                          String(formData.account_id) === String(acc.id) && { backgroundColor: `${colors.primary}15` }
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, account_id: String(acc.id) });
                          setShowAccountPicker(false);
                        }}
                      >
                        <View>
                          <Text style={{ color: colors.onSurface }}>{acc.account_name}</Text>
                          <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
                            {formatAmount(parseFloat(String(acc.current_balance ?? acc.balance ?? 0)))}
                          </Text>
                        </View>
                        {String(formData.account_id) === String(acc.id) && (
                          <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </Surface>
            )}

            <TextInput
              label="Original Amount *"
              value={formData.original_amount}
              onChangeText={(text) => setFormData({ ...formData, original_amount: text })}
              mode="outlined"
              keyboardType="decimal-pad"
              style={[styles.input, { marginTop: 12 }]}
            />

            <TextInput
              label="Interest Rate (%)"
              value={formData.interest_rate}
              onChangeText={(text) => setFormData({ ...formData, interest_rate: text })}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <TextInput
              label="Next Payment Amount"
              value={formData.next_payment}
              onChangeText={(text) => setFormData({ ...formData, next_payment: text })}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                label="Term"
                value={formData.term}
                onChangeText={(text) => setFormData({ ...formData, term: text })}
                mode="outlined"
                keyboardType="number-pad"
                style={[styles.input, { flex: 1 }]}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: 4 }}>
                  Period
                </Text>
                <SegmentedButtons
                  value={formData.term_period}
                  onValueChange={(value) => setFormData({ ...formData, term_period: value as 'months' | 'years' })}
                  buttons={termPeriodOptions}
                  density="small"
                />
              </View>
            </View>

            <DateField
              label="Start Date *"
              value={formData.start_date}
              onChange={(date) => setFormData({ ...formData, start_date: date })}
              style={styles.input}
            />

            <DateField
              label="Next Payment Date"
              value={formData.next_payment_date}
              onChange={(date) => setFormData({ ...formData, next_payment_date: date })}
              style={styles.input}
            />

            <TextInput
              label="Notes"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <View style={styles.modalButtons}>
              <Button mode="text" onPress={closeModal}>Cancel</Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={createMutation.isPending}
              >
                Create Loan
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Make Payment Modal */}
      <Portal>
        <Modal
          visible={paymentModalVisible}
          onDismiss={closePaymentModal}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 8 }}>
              Make Payment
            </Text>
            {selectedLoan && (
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 16 }}>
                {selectedLoan.loan_name || selectedLoan.name}
              </Text>
            )}

            {selectedLoan && (
              <Surface style={[styles.loanInfoCard, { backgroundColor: colors.surfaceVariant }]} elevation={0}>
                <View style={styles.loanInfoRow}>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Remaining Balance:</Text>
                  <Text variant="bodyMedium" style={{ color: colors.error, fontWeight: '600' }}>
                    {formatAmount(parseFloat(String(selectedLoan.remaining_balance ?? 0)))}
                  </Text>
                </View>
                <View style={styles.loanInfoRow}>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Suggested Payment:</Text>
                  <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                    {formatAmount(parseFloat(String(selectedLoan.next_payment ?? selectedLoan.monthly_payment ?? 0)))}
                  </Text>
                </View>
              </Surface>
            )}

            <TextInput
              label="Payment Amount *"
              value={paymentData.payment_amount}
              onChangeText={(text) => setPaymentData({ ...paymentData, payment_amount: text })}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            {/* Account Selection for Payment */}
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
              From Account *
            </Text>
            <TouchableOpacity
              style={[styles.pickerButton, { borderColor: colors.outline, backgroundColor: colors.surfaceVariant }]}
              onPress={() => setShowPaymentAccountPicker(!showPaymentAccountPicker)}
            >
              <Text style={{ color: colors.onSurfaceVariant }}>
                {paymentData.account_id ? getSelectedAccountName(paymentData.account_id) : 'Select account...'}
              </Text>
              <MaterialCommunityIcons
                name={showPaymentAccountPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            {showPaymentAccountPicker && (
              <Surface style={[styles.dropdownList, { backgroundColor: colors.surface }]} elevation={2}>
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {viewAccounts.map((acc: any) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.dropdownItem,
                        String(paymentData.account_id) === String(acc.id) && { backgroundColor: `${colors.primary}15` }
                      ]}
                      onPress={() => {
                        setPaymentData({ ...paymentData, account_id: String(acc.id) });
                        setShowPaymentAccountPicker(false);
                      }}
                    >
                      <View>
                        <Text style={{ color: colors.onSurface }}>{acc.account_name}</Text>
                        <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
                          {formatAmount(parseFloat(String(acc.current_balance ?? acc.balance ?? 0)))}
                        </Text>
                      </View>
                      {String(paymentData.account_id) === String(acc.id) && (
                        <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Surface>
            )}

            <DateField
              label="Payment Date *"
              value={paymentData.payment_date}
              onChange={(date) => setPaymentData({ ...paymentData, payment_date: date })}
              style={[styles.input, { marginTop: 12 }]}
            />

            <TextInput
              label="Next Payment Amount"
              value={paymentData.next_payment}
              onChangeText={(text) => setPaymentData({ ...paymentData, next_payment: text })}
              mode="outlined"
              keyboardType="decimal-pad"
              placeholder="Optional"
              style={styles.input}
            />

            <DateField
              label="Next Payment Date"
              value={paymentData.next_payment_date}
              onChange={(date) => setPaymentData({ ...paymentData, next_payment_date: date })}
              placeholder="YYYY-MM-DD (Optional)"
              style={styles.input}
            />

            <TextInput
              label="Notes"
              value={paymentData.notes}
              onChangeText={(text) => setPaymentData({ ...paymentData, notes: text })}
              mode="outlined"
              multiline
              numberOfLines={2}
              placeholder="Optional"
              style={styles.input}
            />

            <View style={styles.modalButtons}>
              <Button mode="text" onPress={closePaymentModal}>Cancel</Button>
              <Button
                mode="contained"
                onPress={handleMakePayment}
                loading={paymentMutation.isPending}
              >
                Make Payment
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Action Sheet Modal */}
      <Portal>
        <Modal
          visible={showActionSheet}
          onDismiss={closeActionSheet}
          contentContainerStyle={[styles.actionSheetContainer, { backgroundColor: colors.surface }]}
        >
          {selectedLoan && (
            <>
              <View style={styles.actionSheetHeader}>
                <View style={[styles.actionSheetIcon, { backgroundColor: `${selectedLoan.loan_type === 'Lent' ? colors.tertiary : colors.error}20` }]}>
                  <MaterialCommunityIcons
                    name={selectedLoan.loan_type === 'Lent' ? 'cash-plus' : 'hand-coin'}
                    size={28}
                    color={selectedLoan.loan_type === 'Lent' ? colors.tertiary : colors.error}
                  />
                </View>
                <View style={styles.actionSheetInfo}>
                  <Text variant="titleMedium" style={{ color: colors.onSurface }} numberOfLines={1}>
                    {selectedLoan.loan_name || selectedLoan.name || 'Unnamed Loan'}
                  </Text>
                  <Text variant="titleLarge" style={{ color: selectedLoan.loan_type === 'Lent' ? colors.tertiary : colors.error, fontWeight: 'bold' }}>
                    {formatAmount(parseFloat(String(selectedLoan.remaining_balance ?? selectedLoan.principal ?? 0)))}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    {selectedLoan.loan_type || 'Borrowed'} • {selectedLoan.status || 'Active'}
                  </Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 16 }} />

              {selectedLoan.status === 'Active' && (
                <TouchableOpacity
                  style={styles.actionSheetButton}
                  onPress={() => {
                    setShowActionSheet(false);
                    openPaymentModal(selectedLoan);
                  }}
                >
                  <MaterialCommunityIcons name="cash" size={24} color={colors.primary} />
                  <Text variant="bodyLarge" style={[styles.actionSheetButtonText, { color: colors.onSurface }]}>
                    Make Payment
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.actionSheetButton} onPress={handleDeletePress}>
                <MaterialCommunityIcons name="delete" size={24} color={colors.error} />
                <Text variant="bodyLarge" style={[styles.actionSheetButtonText, { color: colors.error }]}>
                  Delete Loan
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.error} />
              </TouchableOpacity>

              <Button mode="outlined" onPress={closeActionSheet} style={styles.actionSheetCancel}>
                Cancel
              </Button>
            </>
          )}
        </Modal>
      </Portal>

      {/* Delete Confirmation Modal */}
      <Portal>
        <Modal
          visible={showDeleteConfirm}
          onDismiss={() => setShowDeleteConfirm(false)}
          contentContainerStyle={[styles.deleteConfirmContainer, { backgroundColor: colors.surface }]}
        >
          <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} style={{ alignSelf: 'center' }} />
          <Text variant="titleLarge" style={[styles.deleteConfirmTitle, { color: colors.onSurface }]}>
            Delete Loan?
          </Text>
          <Text variant="bodyMedium" style={[styles.deleteConfirmText, { color: colors.onSurfaceVariant }]}>
            This action cannot be undone. The loan and all payment history will be permanently removed.
          </Text>
          <View style={styles.deleteConfirmButtons}>
            <Button mode="outlined" onPress={() => setShowDeleteConfirm(false)} style={styles.deleteConfirmButton}>
              Cancel
            </Button>
            <Button
              mode="contained"
              buttonColor={colors.error}
              onPress={handleConfirmDelete}
              style={styles.deleteConfirmButton}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </View>
        </Modal>
      </Portal>
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
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 2,
  },
  loanCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  loanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loanIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loanInfo: {
    flex: 1,
  },
  loanAmount: {
    alignItems: 'flex-end',
  },
  loanDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  loanDetailItem: {
    alignItems: 'center',
  },
  nextPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  makePaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '70%',
  },
  input: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  loanInfoCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  loanInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownList: {
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 8,
    padding: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
  },
  archivedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  menuButton: {
    padding: 8,
    marginLeft: 4,
    marginRight: -8,
  },
  actionSheetContainer: {
    margin: 16,
    marginTop: 'auto',
    borderRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  actionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionSheetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionSheetInfo: {
    flex: 1,
  },
  actionSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  actionSheetButtonText: {
    flex: 1,
    marginLeft: 16,
  },
  actionSheetCancel: {
    marginTop: 16,
    borderRadius: 12,
  },
  deleteConfirmContainer: {
    margin: 24,
    borderRadius: 20,
    padding: 24,
  },
  deleteConfirmTitle: {
    textAlign: 'center',
    marginTop: 16,
    fontWeight: 'bold',
  },
  deleteConfirmText: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteConfirmButton: {
    flex: 1,
    borderRadius: 12,
  },
});
