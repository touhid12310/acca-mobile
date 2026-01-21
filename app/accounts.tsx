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
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../src/contexts/ThemeContext';
import { useCurrency } from '../src/contexts/CurrencyContext';
import accountService from '../src/services/accountService';
import { Account } from '../src/types';

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

const getAccountIcon = (type: string = ''): string => {
  const normalized = type.toLowerCase();
  if (normalized.includes('cash')) return 'cash';
  if (normalized.includes('credit') || normalized.includes('card')) return 'credit-card';
  if (normalized.includes('wallet') || normalized.includes('mobile')) return 'wallet';
  if (normalized.includes('savings') || normalized.includes('piggy')) return 'piggy-bank';
  if (normalized.includes('investment')) return 'chart-line';
  if (normalized.includes('loan')) return 'hand-coin';
  return 'bank';
};

export default function AccountsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'Bank Account' as string,
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

  const openAddModal = () => {
    setFormData({
      account_name: '',
      account_type: 'Bank Account',
      balance: '',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSave = () => {
    if (!formData.account_name.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }
    createMutation.mutate(formData);
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

  const handleAccountPress = (account: Account) => {
    router.push(`/account-detail?id=${account.id}`);
  };

  // Calculate stats
  const viewAccounts = accounts || [];
  const totalBalance = viewAccounts.reduce(
    (sum: number, acc: Account) => {
      const balance = Number(acc.current_balance) || Number(acc.balance) || 0;
      return sum + balance;
    },
    0
  );
  const accountsCount = viewAccounts.length;
  const uniqueTypes = new Set(viewAccounts.map((acc: Account) => acc.type || acc.account_type || 'Other')).size;
  const topAccount = viewAccounts.length > 0
    ? viewAccounts.reduce((prev: Account, current: Account) => {
        const prevBalance = Number(prev.current_balance) || Number(prev.balance) || 0;
        const currBalance = Number(current.current_balance) || Number(current.balance) || 0;
        return currBalance > prevBalance ? current : prev;
      }, viewAccounts[0])
    : null;

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
        {/* Stats Section */}
        <View style={styles.statsGrid}>
          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <View style={[styles.statIconWrapper, { backgroundColor: `${colors.primary}15` }]}>
              <MaterialCommunityIcons name="wallet" size={20} color={colors.primary} />
            </View>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Total Balance</Text>
            <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: 'bold' }}>
              {formatAmount(totalBalance)}
            </Text>
          </Surface>

          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <View style={[styles.statIconWrapper, { backgroundColor: `${colors.tertiary}15` }]}>
              <MaterialCommunityIcons name="bank" size={20} color={colors.tertiary} />
            </View>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Accounts</Text>
            <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: 'bold' }}>
              {accountsCount}
            </Text>
          </Surface>

          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <View style={[styles.statIconWrapper, { backgroundColor: `${colors.secondary}15` }]}>
              <MaterialCommunityIcons name="star" size={20} color={colors.secondary} />
            </View>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Top Account</Text>
            <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '600' }} numberOfLines={1}>
              {topAccount?.account_name || '-'}
            </Text>
          </Surface>

          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#F59E0B15' }]}>
              <MaterialCommunityIcons name="shape" size={20} color="#F59E0B" />
            </View>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Types</Text>
            <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: 'bold' }}>
              {uniqueTypes}
            </Text>
          </Surface>
        </View>

        {/* Accounts List */}
        {viewAccounts.length > 0 ? (
          <View>
            <Text variant="titleMedium" style={{ color: colors.onSurface, marginBottom: 12 }}>
              All Accounts
            </Text>
            {viewAccounts.map((account: Account) => {
              const accountType = account.type || account.account_type || 'Other';
              const balance = account.current_balance || account.balance || 0;
              const iconName = getAccountIcon(accountType);

              return (
                <Surface
                  key={account.id}
                  style={[styles.accountCard, { backgroundColor: colors.surface }]}
                  elevation={1}
                >
                  <TouchableOpacity
                    style={styles.accountCardInner}
                    onPress={() => handleAccountPress(account)}
                    onLongPress={() => handleDelete(account)}
                  >
                    <View style={[styles.accountIcon, { backgroundColor: `${colors.primary}15` }]}>
                      <MaterialCommunityIcons
                        name={iconName as any}
                        size={24}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                        {account.account_name || 'Unnamed Account'}
                      </Text>
                      <View style={[styles.typeBadge, { backgroundColor: `${colors.primary}10` }]}>
                        <Text variant="labelSmall" style={{ color: colors.primary }}>
                          {accountType}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.balanceContainer}>
                      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                        Balance
                      </Text>
                      <Text
                        variant="titleMedium"
                        style={{
                          color: balance >= 0 ? colors.tertiary : colors.error,
                          fontWeight: 'bold',
                        }}
                      >
                        {formatAmount(balance)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Surface>
              );
            })}
          </View>
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
        onPress={openAddModal}
      />

      {/* Add/Edit Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
            Add Account
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
                    borderColor: formData.account_type === option.value ? colors.primary : colors.surfaceVariant,
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
              loading={createMutation.isPending}
            >
              Add
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  accountCard: {
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accountCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
    gap: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  balanceContainer: {
    alignItems: 'flex-end',
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
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
