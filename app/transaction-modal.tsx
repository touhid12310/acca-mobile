import React from 'react';
import { StyleSheet, Alert, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
    subcategory_id?: string;
    account_id?: string;
    notes?: string;
    date?: string;
    items?: string; // JSON stringified items from chat
    receipt_uri?: string; // Receipt file URI from chat
    receipt_type?: string; // 'image', 'pdf', 'csv', etc
    receipt_name?: string; // Filename
  }>();

  // Fetch full transaction data when editing (to get expense_categories and payment_method)
  const { data: fetchedTransaction, isLoading: isFetching } = useQuery({
    queryKey: ['transaction', params.id],
    queryFn: async () => {
      if (!params.id) return null;
      const result = await transactionService.getById(parseInt(params.id));
      if (result.success && result.data) {
        const data = result.data as any;
        // Handle nested response: { data: { ... } } or direct { ... }
        return data.data || data;
      }
      return null;
    },
    enabled: !!params.id, // Only fetch when editing
    staleTime: 0, // Always consider data stale - fetch fresh on every visit
    refetchOnMount: 'always', // Always refetch when component mounts
  });


  // Prepare initial data - prefer fetched data when editing
  const initialData: Partial<Transaction> | undefined = React.useMemo(() => {
    try {
      if (fetchedTransaction) {
        // Use the fetched transaction data
        const tx = fetchedTransaction as any;

        // Extract category from expense_categories if available
        let categoryId = tx.category_id;
        let subcategoryId = tx.subcategory_id;

        if (tx.expense_categories && tx.expense_categories.length > 0) {
          const primaryCategory = tx.expense_categories[0];
          categoryId = primaryCategory.category_id;
          subcategoryId = primaryCategory.subcategory_id;
        }

        // Account is stored as payment_method in the API
        const accountId = tx.payment_method || tx.account_id;

        return {
          id: tx.id,
          type: (tx.type?.toLowerCase() as TransactionType) || 'expense',
          amount: typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount,
          merchant_name: tx.merchant_name,
          description: tx.description,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          account_id: accountId,
          notes: tx.notes,
          date: tx.date,
          items: tx.items, // Include items from API
          receipt_file: tx.receipt_file, // Receipt file path from API
          receipt_path: tx.receipt_file, // Also set as receipt_path for display
        };
      }

      // Fall back to params for new transactions or pre-filling from chat
      if (params.type || params.amount) {
        // Parse items from JSON string if provided
        let parsedItems = undefined;
        if (params.items) {
          try {
            parsedItems = JSON.parse(params.items);
          } catch (e) {
            // Failed to parse items JSON
          }
        }

        return {
          type: (params.type?.toLowerCase() as TransactionType) || 'expense',
          amount: params.amount ? parseFloat(params.amount) : undefined,
          merchant_name: params.merchant_name || undefined,
          description: params.description || undefined,
          category_id: params.category_id ? parseInt(params.category_id) : undefined,
          subcategory_id: params.subcategory_id ? parseInt(params.subcategory_id) : undefined,
          account_id: params.account_id ? parseInt(params.account_id) : undefined,
          notes: params.notes || undefined,
          date: params.date || new Date().toISOString(),
          items: parsedItems,
          receipt_path: params.receipt_uri || undefined, // Pass as receipt_path for display
          receipt_type: params.receipt_type || 'image',
          receipt_name: params.receipt_name || 'receipt',
        };
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }, [fetchedTransaction, params]);

  const createMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      // Convert form data to API format
      // Note: API expects 'payment_method' instead of 'account_id'
      // API expects 'categories' as array and 'items' as array
      const payload: any = {
        type: data.type,
        amount: typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount)),
        date: data.date instanceof Date ? data.date.toISOString().split('T')[0] : data.date,
        merchant_name: data.merchant_name || undefined,
        description: data.description || undefined,
        payment_method: data.account_id || undefined,
        to_account_id: data.to_account_id || undefined,
        notes: data.notes || undefined,
      };

      // Add categories in the format API expects: [{ category_id, subcategory_id }]
      if (data.category_id) {
        payload.categories = [{
          category_id: data.category_id,
          subcategory_id: data.subcategory_id || null,
        }];
      }

      // Add items array if present
      if (data.items && data.items.length > 0) {
        payload.items = data.items.map(item => ({
          name: item.name,
          quantity: parseFloat(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
        }));
      }

      // Add receipt_path if present
      if (data.receipt_path) {
        payload.receipt_path = data.receipt_path;
      }

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
      // Convert form data to API format
      // Note: API expects 'payment_method' instead of 'account_id'
      // API expects 'categories' as array and 'items' as array
      const payload: any = {
        type: data.type,
        amount: typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount)),
        date: data.date instanceof Date ? data.date.toISOString().split('T')[0] : data.date,
        merchant_name: data.merchant_name || undefined,
        description: data.description || undefined,
        payment_method: data.account_id || undefined,
        to_account_id: data.to_account_id || undefined,
        notes: data.notes || undefined,
      };

      // Add categories in the format API expects: [{ category_id, subcategory_id }]
      if (data.category_id) {
        payload.categories = [{
          category_id: data.category_id,
          subcategory_id: data.subcategory_id || null,
        }];
      }

      // Add items array if present
      if (data.items && data.items.length > 0) {
        payload.items = data.items.map(item => ({
          name: item.name,
          quantity: parseFloat(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
        }));
      }

      // Add receipt_path if present
      if (data.receipt_path) {
        payload.receipt_path = data.receipt_path;
      }

      const result = await transactionService.update(id, payload);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update transaction');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', params.id] }); // Invalidate specific transaction
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

  // Show loading while fetching transaction data
  if (params.id && isFetching) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
