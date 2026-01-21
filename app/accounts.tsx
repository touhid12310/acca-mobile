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
  Divider,
  Portal,
  Modal,
  TextInput,
  Button,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../src/contexts/ThemeContext';
import { useCurrency } from '../src/contexts/CurrencyContext';
import accountService from '../src/services/accountService';
import { Account, AccountType } from '../src/types';

const accountTypeOptions = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
];

const accountIcons: Record<string, string> = {
  checking: 'bank',
  savings: 'piggy-bank',
  credit: 'credit-card',
  cash: 'cash',
  investment: 'chart-line',
  loan: 'hand-coin',
  other: 'wallet',
};

export default function AccountsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'checking' as AccountType,
    balance: '',
  });

  const {
    data: accounts,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
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
      const result = await accountService.create({
        account_name: data.account_name,
        account_type: data.account_type,
        balance: parseFloat(data.balance) || 0,
      });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const result = await accountService.update(id, {
        account_name: data.account_name,
        account_type: data.account_type,
        balance: parseFloat(data.balance) || 0,
      });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await accountService.delete(id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const openModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        account_name: account.account_name,
        account_type: account.account_type,
        balance: String(account.balance || 0),
      });
    } else {
      setEditingAccount(null);
      setFormData({
        account_name: '',
        account_type: 'checking',
        balance: '',
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingAccount(null);
  };

  const handleSave = () => {
    if (!formData.account_name.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }

    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (account: Account) => {
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${account.account_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(account.id),
        },
      ]
    );
  };

  const totalBalance = (accounts || []).reduce(
    (sum: number, acc: Account) => sum + (acc.balance || 0),
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
          Accounts
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
        {/* Total Balance Card */}
        <Surface style={[styles.totalCard, { backgroundColor: colors.primaryContainer }]} elevation={1}>
          <Text variant="bodyMedium" style={{ color: colors.primary }}>Total Balance</Text>
          <Text variant="headlineMedium" style={{ color: colors.primary, fontWeight: 'bold' }}>
            {formatAmount(totalBalance)}
          </Text>
        </Surface>

        {/* Accounts List */}
        {accounts && accounts.length > 0 ? (
          <Surface style={[styles.listCard, { backgroundColor: colors.surface }]} elevation={1}>
            {accounts.map((account: Account, index: number) => (
              <React.Fragment key={account.id}>
                <TouchableOpacity
                  style={styles.accountItem}
                  onPress={() => openModal(account)}
                  onLongPress={() => handleDelete(account)}
                >
                  <View style={[styles.accountIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <MaterialCommunityIcons
                      name={(account.account_type && accountIcons[account.account_type]) || 'wallet'}
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
                      {account.account_name || 'Unnamed Account'}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      {account.account_type ? account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1) : 'Other'}
                    </Text>
                  </View>
                  <Text
                    variant="titleMedium"
                    style={{
                      color: (account.balance || 0) >= 0 ? colors.tertiary : colors.error,
                      fontWeight: '600',
                    }}
                  >
                    {formatAmount(account.balance || 0)}
                  </Text>
                </TouchableOpacity>
                {index < accounts.length - 1 && <Divider style={{ marginLeft: 72 }} />}
              </React.Fragment>
            ))}
          </Surface>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bank-off" size={64} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 16 }}>
              No accounts yet
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
              Tap the + button to add your first account
            </Text>
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.primary }]}
        color={colors.onPrimary}
        onPress={() => openModal()}
      />

      {/* Add/Edit Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
            {editingAccount ? 'Edit Account' : 'Add Account'}
          </Text>

          <TextInput
            label="Account Name"
            value={formData.account_name}
            onChangeText={(text) => setFormData({ ...formData, account_name: text })}
            mode="outlined"
            style={styles.input}
          />

          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginTop: 8, marginBottom: 8 }}>
            Account Type
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <SegmentedButtons
              value={formData.account_type}
              onValueChange={(value) => setFormData({ ...formData, account_type: value as AccountType })}
              buttons={accountTypeOptions}
            />
          </ScrollView>

          <TextInput
            label="Balance"
            value={formData.balance}
            onChangeText={(text) => setFormData({ ...formData, balance: text })}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <View style={styles.modalButtons}>
            <Button mode="text" onPress={closeModal}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingAccount ? 'Update' : 'Add'}
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
  totalCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  listCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
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
  },
  input: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
