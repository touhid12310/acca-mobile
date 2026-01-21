import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
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
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../src/contexts/ThemeContext';
import { useCurrency } from '../src/contexts/CurrencyContext';
import loanService from '../src/services/loanService';
import accountService from '../src/services/accountService';
import { Loan } from '../src/types';

const loanTypeOptions = [
  { value: 'Borrowed', label: 'Borrowed' },
  { value: 'Lent', label: 'Lent' },
];

const termPeriodOptions = [
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

export default function LoansScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await loanService.create({
        loan_name: data.loan_name,
        original_amount: parseFloat(data.original_amount) || 0,
        interest_rate: parseFloat(data.interest_rate) || 0,
        next_payment: parseFloat(data.next_payment) || 0,
        term: parseInt(data.term) || 0,
        term_period: data.term_period,
        start_date: data.start_date || new Date().toISOString().split('T')[0],
        next_payment_date: data.next_payment_date || undefined,
        loan_type: data.loan_type,
        notes: data.notes || undefined,
      });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      closeModal();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const result = await loanService.makePayment(id, { payment_amount: amount });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      closePaymentModal();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await loanService.delete(id);
      if (!result.success) throw new Error(result.error);
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
      notes: '',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const openPaymentModal = (loan: Loan) => {
    setSelectedLoan(loan);
    setPaymentAmount('');
    setPaymentModalVisible(true);
  };

  const closePaymentModal = () => {
    setPaymentModalVisible(false);
    setSelectedLoan(null);
    setPaymentAmount('');
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
    createMutation.mutate(formData);
  };

  const handleMakePayment = () => {
    if (!selectedLoan) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }
    if (amount > (selectedLoan.remaining_balance || 0)) {
      Alert.alert('Error', 'Payment amount exceeds remaining balance');
      return;
    }
    paymentMutation.mutate({ id: selectedLoan.id, amount });
  };

  const handleDelete = (loan: Loan) => {
    Alert.alert(
      'Delete Loan',
      `Are you sure you want to delete "${loan.loan_name || loan.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(loan.id),
        },
      ]
    );
  };

  // Calculate stats
  const viewLoans = loans || [];
  const activeLoans = viewLoans.filter((loan: Loan) =>
    loan.status === 'Active' || !loan.status
  );

  // Borrowed loans (liability - I owe money)
  const borrowedLoans = activeLoans.filter((loan: Loan) =>
    loan.loan_type === 'Borrowed' || !loan.loan_type
  );
  const totalLoansToPay = borrowedLoans.reduce(
    (sum: number, loan: Loan) => sum + parseFloat(String(loan.remaining_balance || loan.principal || 0)),
    0
  );

  // Lent loans (asset - others owe me money)
  const lentLoans = activeLoans.filter((loan: Loan) =>
    loan.loan_type === 'Lent'
  );
  const totalLoansToReceive = lentLoans.reduce(
    (sum: number, loan: Loan) => sum + parseFloat(String(loan.remaining_balance || loan.principal || 0)),
    0
  );

  // Upcoming installments
  const totalUpcomingInstallments = activeLoans
    .filter((loan: Loan) => loan.next_payment && parseFloat(String(loan.next_payment)) > 0)
    .reduce((sum: number, loan: Loan) => sum + parseFloat(String(loan.next_payment || loan.monthly_payment || 0)), 0);

  const calculateProgress = (loan: Loan) => {
    const original = parseFloat(String(loan.original_amount || loan.principal || 0));
    const remaining = parseFloat(String(loan.remaining_balance || 0));
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
            <Text variant="titleMedium" style={{ color: colors.error, fontWeight: 'bold' }}>
              {formatAmount(totalLoansToPay)}
            </Text>
            <Text variant="labelSmall" style={{ color: colors.error }}>{borrowedLoans.length} loans</Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.tertiaryContainer }]} elevation={1}>
            <MaterialCommunityIcons name="cash-plus" size={24} color={colors.tertiary} />
            <Text variant="labelSmall" style={{ color: colors.tertiary }}>To Receive</Text>
            <Text variant="titleMedium" style={{ color: colors.tertiary, fontWeight: 'bold' }}>
              {formatAmount(totalLoansToReceive)}
            </Text>
            <Text variant="labelSmall" style={{ color: colors.tertiary }}>{lentLoans.length} loans</Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.primaryContainer }]} elevation={1}>
            <MaterialCommunityIcons name="calendar-clock" size={24} color={colors.primary} />
            <Text variant="labelSmall" style={{ color: colors.primary }}>Installments</Text>
            <Text variant="titleMedium" style={{ color: colors.primary, fontWeight: 'bold' }}>
              {formatAmount(totalUpcomingInstallments)}
            </Text>
            <Text variant="labelSmall" style={{ color: colors.primary }}>upcoming</Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.surfaceVariant }]} elevation={1}>
            <MaterialCommunityIcons name="format-list-bulleted" size={24} color={colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Active</Text>
            <Text variant="titleMedium" style={{ color: colors.onSurfaceVariant, fontWeight: 'bold' }}>
              {activeLoans.length}
            </Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>total loans</Text>
          </Surface>
        </View>

        {viewLoans.length > 0 ? (
          viewLoans.map((loan: Loan) => {
            const progress = calculateProgress(loan);
            const loanName = loan.loan_name || loan.name || 'Unnamed Loan';
            const originalAmount = parseFloat(String(loan.original_amount || loan.principal || 0));
            const remainingBalance = parseFloat(String(loan.remaining_balance || 0));
            const interestRate = loan.interest_rate || 0;
            const nextPayment = loan.next_payment || loan.monthly_payment || 0;
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
                <TouchableOpacity onLongPress={() => handleDelete(loan)}>
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Chip
                          compact
                          style={{
                            backgroundColor: isLent ? colors.tertiaryContainer : colors.errorContainer,
                            height: 22,
                          }}
                          textStyle={{
                            color: isLent ? colors.tertiary : colors.error,
                            fontSize: 10
                          }}
                        >
                          {loanType}
                        </Chip>
                        <Chip
                          compact
                          style={{
                            backgroundColor: `${statusColor}20`,
                            height: 22,
                          }}
                          textStyle={{ color: statusColor, fontSize: 10 }}
                        >
                          {status}
                        </Chip>
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
                  </View>

                  <View style={styles.loanDetails}>
                    <View style={styles.loanDetailItem}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Original</Text>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                        {formatAmount(originalAmount)}
                      </Text>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Interest</Text>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                        {interestRate}%
                      </Text>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Payment</Text>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
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
              No loans yet
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
              Track your loans and payments here
            </Text>
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.primary }]}
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
          <ScrollView showsVerticalScrollIndicator={false}>
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
              Loan Type
            </Text>
            <SegmentedButtons
              value={formData.loan_type}
              onValueChange={(value) => setFormData({ ...formData, loan_type: value as 'Borrowed' | 'Lent' })}
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
              style={{ marginBottom: 12 }}
            />
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: 12, marginTop: -4 }}>
              {formData.loan_type === 'Borrowed'
                ? 'Money you received (Liability)'
                : 'Money you gave (Asset)'}
            </Text>

            <TextInput
              label="Original Amount *"
              value={formData.original_amount}
              onChangeText={(text) => setFormData({ ...formData, original_amount: text })}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
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

            <TextInput
              label="Start Date"
              value={formData.start_date}
              onChangeText={(text) => setFormData({ ...formData, start_date: text })}
              mode="outlined"
              placeholder="YYYY-MM-DD"
              style={styles.input}
            />

            <TextInput
              label="Next Payment Date"
              value={formData.next_payment_date}
              onChangeText={(text) => setFormData({ ...formData, next_payment_date: text })}
              mode="outlined"
              placeholder="YYYY-MM-DD"
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
                <Text variant="bodyMedium" style={{ color: colors.error }}>
                  {formatAmount(selectedLoan.remaining_balance || 0)}
                </Text>
              </View>
              <View style={styles.loanInfoRow}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Next Payment:</Text>
                <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                  {formatAmount(selectedLoan.next_payment || selectedLoan.monthly_payment || 0)}
                </Text>
              </View>
            </Surface>
          )}

          <TextInput
            label="Payment Amount *"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            mode="outlined"
            keyboardType="decimal-pad"
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
    maxHeight: '85%',
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
});
