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
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../src/contexts/ThemeContext';
import { useCurrency } from '../src/contexts/CurrencyContext';
import loanService from '../src/services/loanService';
import { Loan } from '../src/types';

export default function LoansScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    principal: '',
    interest_rate: '',
    monthly_payment: '',
    remaining_balance: '',
    lender: '',
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await loanService.create({
        name: data.name,
        principal: parseFloat(data.principal) || 0,
        interest_rate: parseFloat(data.interest_rate) || 0,
        monthly_payment: parseFloat(data.monthly_payment) || 0,
        remaining_balance: parseFloat(data.remaining_balance) || parseFloat(data.principal) || 0,
        lender: data.lender || undefined,
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
      name: '',
      principal: '',
      interest_rate: '',
      monthly_payment: '',
      remaining_balance: '',
      lender: '',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a loan name');
      return;
    }
    if (!formData.principal || parseFloat(formData.principal) <= 0) {
      Alert.alert('Error', 'Please enter a valid principal amount');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (loan: Loan) => {
    Alert.alert(
      'Delete Loan',
      `Are you sure you want to delete "${loan.name}"?`,
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

  const totalDebt = (loans || []).reduce(
    (sum: number, loan: Loan) => sum + (loan.remaining_balance || 0),
    0
  );

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
        {/* Total Debt Card */}
        {loans && loans.length > 0 && (
          <Surface style={[styles.totalCard, { backgroundColor: colors.errorContainer }]} elevation={1}>
            <Text variant="bodyMedium" style={{ color: colors.error }}>Total Debt</Text>
            <Text variant="headlineMedium" style={{ color: colors.error, fontWeight: 'bold' }}>
              {formatAmount(totalDebt)}
            </Text>
          </Surface>
        )}

        {loans && loans.length > 0 ? (
          loans.map((loan: Loan) => {
            const paidPercentage = loan.principal > 0
              ? ((loan.principal - loan.remaining_balance) / loan.principal) * 100
              : 0;

            return (
              <Surface
                key={loan.id}
                style={[styles.loanCard, { backgroundColor: colors.surface }]}
                elevation={1}
              >
                <TouchableOpacity onLongPress={() => handleDelete(loan)}>
                  <View style={styles.loanHeader}>
                    <View style={[styles.loanIcon, { backgroundColor: `${colors.error}15` }]}>
                      <MaterialCommunityIcons name="hand-coin" size={24} color={colors.error} />
                    </View>
                    <View style={styles.loanInfo}>
                      <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                        {loan.name}
                      </Text>
                      {loan.lender && (
                        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                          {loan.lender}
                        </Text>
                      )}
                    </View>
                    <View style={styles.loanAmount}>
                      <Text variant="titleMedium" style={{ color: colors.error, fontWeight: '600' }}>
                        {formatAmount(loan.remaining_balance || 0)}
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        remaining
                      </Text>
                    </View>
                  </View>

                  <View style={styles.loanDetails}>
                    <View style={styles.loanDetailItem}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Principal</Text>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                        {formatAmount(loan.principal)}
                      </Text>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Interest</Text>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                        {loan.interest_rate}%
                      </Text>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Monthly</Text>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                        {formatAmount(loan.monthly_payment)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressContainer}>
                    <ProgressBar
                      progress={Math.min(paidPercentage / 100, 1)}
                      color={colors.tertiary}
                      style={[styles.progressBar, { backgroundColor: `${colors.tertiary}20` }]}
                    />
                    <Text
                      variant="labelSmall"
                      style={{ color: colors.onSurfaceVariant, marginTop: 4, textAlign: 'right' }}
                    >
                      {paidPercentage.toFixed(0)}% paid off
                    </Text>
                  </View>
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

      {/* Add Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <ScrollView>
            <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
              Add Loan
            </Text>

            <TextInput
              label="Loan Name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Lender (optional)"
              value={formData.lender}
              onChangeText={(text) => setFormData({ ...formData, lender: text })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Principal Amount"
              value={formData.principal}
              onChangeText={(text) => setFormData({ ...formData, principal: text })}
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
              label="Monthly Payment"
              value={formData.monthly_payment}
              onChangeText={(text) => setFormData({ ...formData, monthly_payment: text })}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <TextInput
              label="Remaining Balance"
              value={formData.remaining_balance}
              onChangeText={(text) => setFormData({ ...formData, remaining_balance: text })}
              mode="outlined"
              keyboardType="decimal-pad"
              placeholder="Same as principal if new"
              style={styles.input}
            />

            <View style={styles.modalButtons}>
              <Button mode="text" onPress={closeModal}>Cancel</Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={createMutation.isPending}
              >
                Add
              </Button>
            </View>
          </ScrollView>
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
  totalCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
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
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
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
    maxHeight: '80%',
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
});
