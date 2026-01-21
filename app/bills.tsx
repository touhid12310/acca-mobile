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
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../src/contexts/ThemeContext';
import { useCurrency } from '../src/contexts/CurrencyContext';
import billService from '../src/services/billService';
import { Bill } from '../src/types';

const frequencyOptions = ['monthly', 'weekly', 'yearly', 'one-time'];

export default function BillsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    due_date: '',
    frequency: 'monthly' as Bill['frequency'],
  });

  const {
    data: bills,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      const result = await billService.getAll();
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData || [];
      }
      return [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await billService.create({
        name: data.name,
        amount: parseFloat(data.amount) || 0,
        due_date: data.due_date || new Date().toISOString().split('T')[0],
        frequency: data.frequency,
      });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      closeModal();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await billService.delete(id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const openModal = () => {
    setFormData({
      name: '',
      amount: '',
      due_date: new Date().toISOString().split('T')[0],
      frequency: 'monthly',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a bill name');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (bill: Bill) => {
    Alert.alert(
      'Delete Bill',
      `Are you sure you want to delete "${bill.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(bill.id),
        },
      ]
    );
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueStatusColor = (daysUntil: number) => {
    if (daysUntil < 0) return colors.error;
    if (daysUntil <= 3) return '#F59E0B';
    if (daysUntil <= 7) return colors.primary;
    return colors.tertiary;
  };

  const totalMonthlyBills = (bills || [])
    .filter((b: Bill) => b.frequency === 'monthly')
    .reduce((sum: number, b: Bill) => sum + (b.amount || 0), 0);

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
          Bills
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
        {/* Monthly Total Card */}
        {bills && bills.length > 0 && (
          <Surface style={[styles.totalCard, { backgroundColor: colors.primaryContainer }]} elevation={1}>
            <Text variant="bodyMedium" style={{ color: colors.primary }}>Monthly Bills</Text>
            <Text variant="headlineMedium" style={{ color: colors.primary, fontWeight: 'bold' }}>
              {formatAmount(totalMonthlyBills)}
            </Text>
          </Surface>
        )}

        {bills && bills.length > 0 ? (
          bills.map((bill: Bill) => {
            const daysUntil = getDaysUntilDue(bill.due_date);
            const statusColor = getDueStatusColor(daysUntil);
            const isPaid = bill.is_paid;

            return (
              <Surface
                key={bill.id}
                style={[styles.billCard, { backgroundColor: colors.surface }]}
                elevation={1}
              >
                <TouchableOpacity onLongPress={() => handleDelete(bill)}>
                  <View style={styles.billHeader}>
                    <View style={[styles.billIcon, { backgroundColor: `${statusColor}15` }]}>
                      <MaterialCommunityIcons
                        name={isPaid ? 'check-circle' : 'calendar-clock'}
                        size={24}
                        color={statusColor}
                      />
                    </View>
                    <View style={styles.billInfo}>
                      <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                        {bill.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                          {bill.frequency ? bill.frequency.charAt(0).toUpperCase() + bill.frequency.slice(1) : 'Monthly'}
                        </Text>
                        {isPaid && (
                          <Chip
                            compact
                            style={{ backgroundColor: colors.tertiaryContainer }}
                            textStyle={{ color: colors.tertiary, fontSize: 10 }}
                          >
                            Paid
                          </Chip>
                        )}
                      </View>
                    </View>
                    <View style={styles.billAmount}>
                      <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                        {formatAmount(bill.amount)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.dueInfo, { borderTopColor: colors.surfaceVariant }]}>
                    <MaterialCommunityIcons name="calendar" size={16} color={colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginLeft: 4 }}>
                      Due: {new Date(bill.due_date).toLocaleDateString()}
                    </Text>
                    {!isPaid && (
                      <Text
                        variant="labelSmall"
                        style={{
                          color: statusColor,
                          marginLeft: 'auto',
                          fontWeight: '600',
                        }}
                      >
                        {daysUntil < 0
                          ? `${Math.abs(daysUntil)} days overdue`
                          : daysUntil === 0
                          ? 'Due today'
                          : `${daysUntil} days left`}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </Surface>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={64} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 16 }}>
              No bills yet
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
              Add recurring bills to track due dates
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
          <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
            Add Bill
          </Text>

          <TextInput
            label="Bill Name"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Amount"
            value={formData.amount}
            onChangeText={(text) => setFormData({ ...formData, amount: text })}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
            Frequency
          </Text>
          <View style={styles.frequencyButtons}>
            {frequencyOptions.map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.frequencyButton,
                  {
                    backgroundColor: formData.frequency === freq ? colors.primaryContainer : colors.surfaceVariant,
                    borderColor: formData.frequency === freq ? colors.primary : 'transparent',
                  },
                ]}
                onPress={() => setFormData({ ...formData, frequency: freq as Bill['frequency'] })}
              >
                <Text
                  style={{
                    color: formData.frequency === freq ? colors.primary : colors.onSurfaceVariant,
                    fontWeight: formData.frequency === freq ? '600' : '400',
                    fontSize: 12,
                  }}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
  totalCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  billCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  billInfo: {
    flex: 1,
  },
  billAmount: {
    alignItems: 'flex-end',
  },
  dueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
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
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  frequencyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
