import React from 'react';
import { StyleSheet, View, ActivityIndicator, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Portal, Modal, Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../src/contexts/ThemeContext';
import TransactionFormContent, {
  TransactionFormData,
} from '../src/components/transactions/TransactionFormContent';
import transactionService from '../src/services/transactionService';
import { Transaction, TransactionType } from '../src/types';

type StatusAlertType = 'success' | 'error';

type StatusAlertConfig = {
  type: StatusAlertType;
  title: string;
  message: string;
  autoCloseMs?: number;
  onClose?: () => void;
};

type StatusAlertState = {
  visible: boolean;
  type: StatusAlertType;
  title: string;
  message: string;
};

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
    scan_mode?: string; // 'camera' | 'gallery'
  }>();
  const [statusAlert, setStatusAlert] = React.useState<StatusAlertState>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });
  const alertScale = React.useRef(new Animated.Value(0.9)).current;
  const alertOpacity = React.useRef(new Animated.Value(0)).current;
  const successIconScale = React.useRef(new Animated.Value(1)).current;
  const successIconOpacity = React.useRef(new Animated.Value(1)).current;
  const successIconTilt = React.useRef(new Animated.Value(0)).current;
  const alertTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertCloseActionRef = React.useRef<(() => void) | null>(null);

  const hideStatusAlert = React.useCallback(() => {
    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
      alertTimerRef.current = null;
    }
    setStatusAlert((prev) => ({ ...prev, visible: false }));
    const onClose = alertCloseActionRef.current;
    alertCloseActionRef.current = null;
    if (onClose) {
      onClose();
    }
  }, []);

  const showStatusAlert = React.useCallback(
    ({ type, title, message, autoCloseMs, onClose }: StatusAlertConfig) => {
      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);
        alertTimerRef.current = null;
      }

      alertCloseActionRef.current = onClose || null;
      setStatusAlert({
        visible: true,
        type,
        title,
        message,
      });

      if (autoCloseMs && autoCloseMs > 0) {
        alertTimerRef.current = setTimeout(() => {
          hideStatusAlert();
        }, autoCloseMs);
      }
    },
    [hideStatusAlert]
  );

  React.useEffect(() => {
    if (!statusAlert.visible) {
      alertScale.setValue(0.9);
      alertOpacity.setValue(0);
      successIconScale.setValue(1);
      successIconOpacity.setValue(1);
      successIconTilt.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(alertOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(alertScale, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    if (statusAlert.type === 'success') {
      successIconScale.setValue(0.55);
      successIconOpacity.setValue(0);
      successIconTilt.setValue(-10);

      Animated.parallel([
        Animated.timing(successIconOpacity, {
          toValue: 1,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(successIconScale, {
            toValue: 1.15,
            friction: 5,
            tension: 150,
            useNativeDriver: true,
          }),
          Animated.spring(successIconScale, {
            toValue: 1,
            friction: 7,
            tension: 120,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(successIconTilt, {
            toValue: 4,
            duration: 110,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(successIconTilt, {
            toValue: 0,
            duration: 90,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      successIconScale.setValue(1);
      successIconOpacity.setValue(1);
      successIconTilt.setValue(0);
    }
  }, [
    alertOpacity,
    alertScale,
    statusAlert.type,
    statusAlert.visible,
    successIconOpacity,
    successIconScale,
    successIconTilt,
  ]);

  React.useEffect(() => {
    return () => {
      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);
        alertTimerRef.current = null;
      }
    };
  }, []);

  // Fetch full transaction data when editing (to get transaction_categories and payment_method)
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

        // Extract category from transaction_categories if available
        let categoryId = tx.category_id;
        let subcategoryId = tx.subcategory_id;

        if (tx.transaction_categories && tx.transaction_categories.length > 0) {
          const primaryCategory = tx.transaction_categories[0];
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
      showStatusAlert({
        type: 'success',
        title: 'Transaction Saved',
        message: 'Your transaction has been saved successfully.',
        autoCloseMs: 1200,
        onClose: () => router.back(),
      });
    },
    onError: (error: Error) => {
      showStatusAlert({
        type: 'error',
        title: 'Save Failed',
        message: error.message || 'Unable to save transaction.',
      });
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
      showStatusAlert({
        type: 'success',
        title: 'Transaction Updated',
        message: 'Your transaction has been updated successfully.',
        autoCloseMs: 1200,
        onClose: () => router.back(),
      });
    },
    onError: (error: Error) => {
      showStatusAlert({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Unable to update transaction.',
      });
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
  const successIconRotate = successIconTilt.interpolate({
    inputRange: [-12, 12],
    outputRange: ['-12deg', '12deg'],
  });

  // Show loading while fetching transaction data
  if (params.id && isFetching) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
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
      edges={['top', 'bottom']}
    >
      <TransactionFormContent
        onCancel={() => router.back()}
        onSubmit={handleSubmit}
        initialData={initialData}
        isLoading={isLoading}
        title={params.id ? 'Edit Transaction' : 'Add Transaction'}
        autoScanMode={
          params.scan_mode === 'camera' || params.scan_mode === 'gallery'
            ? params.scan_mode
            : undefined
        }
      />

      <Portal>
        <Modal
          visible={statusAlert.visible}
          onDismiss={() => {
            if (statusAlert.type === 'error') {
              hideStatusAlert();
            }
          }}
          dismissable={statusAlert.type === 'error'}
          contentContainerStyle={styles.statusAlertModal}
        >
          <Animated.View
            style={[
              styles.statusAlertCard,
              {
                backgroundColor: colors.surface,
                opacity: alertOpacity,
                transform: [{ scale: alertScale }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.statusAlertIcon,
                {
                  backgroundColor:
                    statusAlert.type === 'success'
                      ? `${colors.tertiary}20`
                      : `${colors.error}20`,
                },
                statusAlert.type === 'success'
                  ? {
                      opacity: successIconOpacity,
                      transform: [{ scale: successIconScale }, { rotate: successIconRotate }],
                    }
                  : null,
              ]}
            >
              <MaterialCommunityIcons
                name={statusAlert.type === 'success' ? 'check-circle' : 'close-circle'}
                size={48}
                color={statusAlert.type === 'success' ? colors.tertiary : colors.error}
              />
            </Animated.View>

            <Text variant="titleLarge" style={[styles.statusAlertTitle, { color: colors.onSurface }]}>
              {statusAlert.title}
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.statusAlertMessage, { color: colors.onSurfaceVariant }]}
            >
              {statusAlert.message}
            </Text>

            {statusAlert.type === 'error' ? (
              <Button mode="contained" onPress={hideStatusAlert} style={styles.statusAlertButton}>
                OK
              </Button>
            ) : null}
          </Animated.View>
        </Modal>
      </Portal>
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
  statusAlertModal: {
    marginHorizontal: 24,
  },
  statusAlertCard: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
  },
  statusAlertIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusAlertTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  statusAlertMessage: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  statusAlertButton: {
    marginTop: 20,
    minWidth: 120,
  },
});
