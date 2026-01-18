import React from 'react';
import { StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '../src/contexts/ThemeContext';
import TransactionFormContent, {
  TransactionFormData,
} from '../src/components/transactions/TransactionFormContent';
import transactionService from '../src/services/transactionService';
import { Transaction, TransactionType } from '../src/types';

export default function TransactionModalScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    id?: string;
    type?: string;
    amount?: string;
    merchant_name?: string;
    description?: string;
    category_id?: string;
    date?: string;
  }>();

  // Prepare initial data from params (for editing or pre-filling from chat)
  const initialData: Partial<Transaction> | undefined =
    params.type || params.amount
      ? {
          type: (params.type?.toLowerCase() as TransactionType) || 'expense',
          amount: params.amount ? parseFloat(params.amount) : undefined,
          merchant_name: params.merchant_name,
          description: params.description,
          category_id: params.category_id ? parseInt(params.category_id) : undefined,
          date: params.date || new Date().toISOString(),
        }
      : undefined;

  const createMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      // Convert form data to API format (convert null to undefined)
      const payload = {
        type: data.type,
        amount: typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount)),
        date: data.date instanceof Date ? data.date.toISOString().split('T')[0] : data.date,
        merchant_name: data.merchant_name || undefined,
        description: data.description || undefined,
        category_id: data.category_id || undefined,
        subcategory_id: data.subcategory_id || undefined,
        account_id: data.account_id || undefined,
        to_account_id: data.to_account_id || undefined,
        notes: data.notes || undefined,
      };

      const result = await transactionService.create(payload);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create transaction');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      router.back();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TransactionFormData }) => {
      // Convert form data to API format (convert null to undefined)
      const payload = {
        type: data.type,
        amount: typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount)),
        date: data.date instanceof Date ? data.date.toISOString().split('T')[0] : data.date,
        merchant_name: data.merchant_name || undefined,
        description: data.description || undefined,
        category_id: data.category_id || undefined,
        subcategory_id: data.subcategory_id || undefined,
        account_id: data.account_id || undefined,
        to_account_id: data.to_account_id || undefined,
        notes: data.notes || undefined,
      };

      const result = await transactionService.update(id, payload);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update transaction');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      router.back();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleSubmit = async (data: TransactionFormData) => {
    if (params.id) {
      await updateMutation.mutateAsync({ id: parseInt(params.id), data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <TransactionFormContent
        onCancel={() => router.back()}
        onSubmit={handleSubmit}
        initialData={initialData}
        isLoading={isLoading}
        title={params.id ? 'Edit Transaction' : 'Add Transaction'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
