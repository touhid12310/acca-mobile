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
import categoryService from '../src/services/categoryService';
import { Bill } from '../src/types';

const frequencyOptions = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];

export default function BillsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    vendor: '',
    amount: '',
    frequency: 'Monthly' as string,
    next_due_date: '',
    notes: '',
    category_id: '',
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

  // Fetch expense categories for selection
  const { data: categories } = useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: async () => {
      const result = await categoryService.getForTransaction('expense');
      if (result.success && result.data) {
        const responseData = result.data as any;
        const payload = responseData?.data || responseData || [];
        return Array.isArray(payload) ? payload : [];
      }
      return [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await billService.create({
        name: data.vendor, // Use vendor as name
        vendor: data.vendor,
        contact_name: data.vendor,
        amount: parseFloat(data.amount) || 0,
        frequency: data.frequency,
        next_due_date: data.next_due_date || new Date().toISOString().split('T')[0],
        due_date: data.next_due_date || new Date().toISOString().split('T')[0],
        notes: data.notes,
        category_id: data.category_id ? parseInt(data.category_id) : undefined,
        status: 'scheduled',
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
      vendor: '',
      amount: '',
      frequency: 'Monthly',
      next_due_date: new Date().toISOString().split('T')[0],
      notes: '',
      category_id: '',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSave = () => {
    if (!formData.vendor.trim()) {
      Alert.alert('Error', 'Please enter a vendor name');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (bill: Bill) => {
    const billName = bill.name || bill.contact_name || bill.vendor || 'this bill';
    Alert.alert(
      'Delete Repeating Expense',
      `Are you sure you want to delete "${billName}"?`,
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
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDueStatusColor = (daysUntil: number | null) => {
    if (daysUntil === null) return colors.onSurfaceVariant;
    if (daysUntil < 0) return colors.error;
    if (daysUntil <= 3) return '#F59E0B';
    if (daysUntil <= 7) return colors.primary;
    return colors.tertiary;
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return colors.tertiary;
      case 'scheduled': return colors.primary;
      case 'overdue': return colors.error;
      default: return colors.onSurfaceVariant;
    }
  };

  const getCategoryName = (categoryId?: number | string) => {
    if (!categoryId || !categories) return null;
    const category = categories.find((c: any) => c.id === Number(categoryId));
    return category?.name || null;
  };

  // Calculate stats
  const viewBills = bills || [];
  const totalMonthlyBills = viewBills
    .filter((b: Bill) => b.frequency?.toLowerCase() === 'monthly')
    .reduce((sum: number, b: Bill) => sum + (parseFloat(String(b.amount)) || 0), 0);
  const totalWeeklyBills = viewBills
    .filter((b: Bill) => b.frequency?.toLowerCase() === 'weekly')
    .reduce((sum: number, b: Bill) => sum + (parseFloat(String(b.amount)) || 0), 0);
  const totalYearlyBills = viewBills
    .filter((b: Bill) => b.frequency?.toLowerCase() === 'yearly')
    .reduce((sum: number, b: Bill) => sum + (parseFloat(String(b.amount)) || 0), 0);

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
          Repeating Expenses
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
        {viewBills.length > 0 && (
          <View style={styles.statsContainer}>
            <Surface style={[styles.statCard, { backgroundColor: colors.primaryContainer }]} elevation={1}>
              <MaterialCommunityIcons name="calendar-month" size={20} color={colors.primary} />
              <Text variant="labelSmall" style={{ color: colors.primary }}>Monthly</Text>
              <Text variant="titleSmall" style={{ color: colors.primary, fontWeight: 'bold' }}>
                {formatAmount(totalMonthlyBills)}
              </Text>
            </Surface>
            <Surface style={[styles.statCard, { backgroundColor: colors.tertiaryContainer }]} elevation={1}>
              <MaterialCommunityIcons name="calendar-week" size={20} color={colors.tertiary} />
              <Text variant="labelSmall" style={{ color: colors.tertiary }}>Weekly</Text>
              <Text variant="titleSmall" style={{ color: colors.tertiary, fontWeight: 'bold' }}>
                {formatAmount(totalWeeklyBills)}
              </Text>
            </Surface>
            <Surface style={[styles.statCard, { backgroundColor: colors.secondaryContainer }]} elevation={1}>
              <MaterialCommunityIcons name="calendar" size={20} color={colors.secondary} />
              <Text variant="labelSmall" style={{ color: colors.secondary }}>Yearly</Text>
              <Text variant="titleSmall" style={{ color: colors.secondary, fontWeight: 'bold' }}>
                {formatAmount(totalYearlyBills)}
              </Text>
            </Surface>
          </View>
        )}

        {viewBills.length > 0 ? (
          viewBills.map((bill: Bill) => {
            const dueDate = bill.next_due_date || bill.due_date;
            const daysUntil = getDaysUntilDue(dueDate);
            const statusColor = getDueStatusColor(daysUntil);
            const billName = bill.name || bill.contact_name || bill.vendor || 'Unnamed Bill';
            const categoryName = getCategoryName(bill.category_id);
            const status = bill.status || 'scheduled';
            const isPaid = bill.is_paid || status.toLowerCase() === 'paid';

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
                        name={isPaid ? 'check-circle' : 'repeat'}
                        size={24}
                        color={statusColor}
                      />
                    </View>
                    <View style={styles.billInfo}>
                      <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                        {billName}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Chip
                          compact
                          style={{ backgroundColor: colors.surfaceVariant, height: 22 }}
                          textStyle={{ color: colors.onSurfaceVariant, fontSize: 10 }}
                        >
                          {bill.frequency || 'Monthly'}
                        </Chip>
                        {categoryName && (
                          <Chip
                            compact
                            style={{ backgroundColor: colors.primaryContainer, height: 22 }}
                            textStyle={{ color: colors.primary, fontSize: 10 }}
                          >
                            {categoryName}
                          </Chip>
                        )}
                        <Chip
                          compact
                          style={{ backgroundColor: `${getStatusColor(status)}20`, height: 22 }}
                          textStyle={{ color: getStatusColor(status), fontSize: 10 }}
                        >
                          {status}
                        </Chip>
                      </View>
                    </View>
                    <View style={styles.billAmount}>
                      <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                        {formatAmount(bill.amount)}
                      </Text>
                    </View>
                  </View>

                  {bill.notes && (
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>
                      {bill.notes}
                    </Text>
                  )}

                  <View style={[styles.dueInfo, { borderTopColor: colors.surfaceVariant }]}>
                    <MaterialCommunityIcons name="calendar" size={16} color={colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginLeft: 4 }}>
                      Next Due: {dueDate ? new Date(dueDate).toLocaleDateString() : 'Not set'}
                    </Text>
                    {!isPaid && daysUntil !== null && (
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
            <MaterialCommunityIcons name="repeat" size={64} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 16 }}>
              No repeating expenses yet
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
              Track your recurring expenses and never miss a payment
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
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
              Create Repeating Expense
            </Text>

            <TextInput
              label="Vendor *"
              value={formData.vendor}
              onChangeText={(text) => setFormData({ ...formData, vendor: text })}
              mode="outlined"
              placeholder="Netflix, Electricity, etc."
              style={styles.input}
            />

            <TextInput
              label="Amount *"
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
                  onPress={() => setFormData({ ...formData, frequency: freq })}
                >
                  <Text
                    style={{
                      color: formData.frequency === freq ? colors.primary : colors.onSurfaceVariant,
                      fontWeight: formData.frequency === freq ? '600' : '400',
                      fontSize: 12,
                    }}
                  >
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {categories && categories.length > 0 && (
              <>
                <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginTop: 8, marginBottom: 8 }}>
                  Category
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: !formData.category_id ? colors.primaryContainer : colors.surfaceVariant,
                          borderColor: !formData.category_id ? colors.primary : 'transparent',
                        },
                      ]}
                      onPress={() => setFormData({ ...formData, category_id: '' })}
                    >
                      <Text
                        style={{
                          color: !formData.category_id ? colors.primary : colors.onSurfaceVariant,
                          fontSize: 12,
                        }}
                      >
                        None
                      </Text>
                    </TouchableOpacity>
                    {categories.map((cat: any) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: formData.category_id === String(cat.id) ? colors.primaryContainer : colors.surfaceVariant,
                            borderColor: formData.category_id === String(cat.id) ? colors.primary : 'transparent',
                          },
                        ]}
                        onPress={() => setFormData({ ...formData, category_id: String(cat.id) })}
                      >
                        <Text
                          style={{
                            color: formData.category_id === String(cat.id) ? colors.primary : colors.onSurfaceVariant,
                            fontSize: 12,
                          }}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <TextInput
              label="Next Due Date"
              value={formData.next_due_date}
              onChangeText={(text) => setFormData({ ...formData, next_due_date: text })}
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
              numberOfLines={2}
              placeholder="Account number, reference, etc."
              style={styles.input}
            />

            <View style={styles.modalButtons}>
              <Button mode="text" onPress={closeModal}>Cancel</Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={createMutation.isPending}
              >
                Save
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
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 2,
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
    maxHeight: '85%',
  },
  input: {
    marginBottom: 12,
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  frequencyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChip: {
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
