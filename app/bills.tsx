import React, { useMemo, useState } from 'react';
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
  Divider,
} from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../src/contexts/ThemeContext';
import { useCurrency } from '../src/contexts/CurrencyContext';
import billService from '../src/services/billService';
import categoryService from '../src/services/categoryService';
import DateField from '../src/components/common/DateField';
import { Bill } from '../src/types';

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

const frequencyOptions = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];

// Helper to unwrap API response
const unwrap = (response: any): any[] => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.data?.data)) return response.data.data.data;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

export default function BillsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    vendor: '',
    amount: '',
    frequency: 'Monthly' as string,
    next_due_date: new Date().toISOString().split('T')[0],
    notes: '',
    category_id: '',
  });

  const {
    data: bills,
    isLoading,
    refetch,
    isRefetching,
    error,
  } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      try {
        const result = await billService.getAll();

        if (result.success && result.data) {
          const responseData = result.data as any;

          // Laravel returns paginated data: { data: { current_page, data: [...], ... } }
          // The actual bills array is at responseData.data.data (pagination)
          // Or responseData.data if not paginated

          let billsArray: any[] = [];

          // Check if it's paginated (has current_page)
          if (responseData?.data?.current_page !== undefined) {
            // Paginated response: bills are at responseData.data.data
            billsArray = responseData.data.data || [];
          } else if (Array.isArray(responseData?.data)) {
            // Non-paginated: bills are at responseData.data
            billsArray = responseData.data;
          } else if (Array.isArray(responseData)) {
            // Direct array
            billsArray = responseData;
          }

          return billsArray;
        }

        return [];
      } catch (err) {
        return [];
      }
    },
  });

  // Fetch expense categories for selection
  const { data: categories } = useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: async () => {
      const result = await categoryService.getForTransaction('expense');
      if (result.success && result.data) {
        return unwrap(result.data);
      }
      return [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await billService.create({
        vendor: data.vendor,
        contact_name: data.vendor,
        amount: parseFloat(data.amount) || 0,
        frequency: data.frequency,
        next_due_date: data.next_due_date || new Date().toISOString().split('T')[0],
        notes: data.notes,
        category_id: data.category_id ? parseInt(data.category_id) : undefined,
        status: 'scheduled',
      });
      if (!result.success) throw new Error(formatApiError(result));
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
      if (!result.success) throw new Error(formatApiError(result));
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
    setShowCategoryPicker(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setShowCategoryPicker(false);
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

  const showBillActions = (bill: Bill) => {
    setSelectedBill(bill);
    setShowActionSheet(true);
  };

  const handleDeletePress = () => {
    setShowActionSheet(false);
    setTimeout(() => setShowDeleteConfirm(true), 200);
  };

  const handleConfirmDelete = () => {
    if (selectedBill) {
      deleteMutation.mutate(selectedBill.id);
    }
    setShowDeleteConfirm(false);
    setSelectedBill(null);
  };

  const closeActionSheet = () => {
    setShowActionSheet(false);
    setSelectedBill(null);
  };

  const getDaysUntilDue = (dueDate?: string) => {
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
    const viewCategories = Array.isArray(categories) ? categories : [];
    const category = viewCategories.find((c: any) => c.id === Number(categoryId));
    return category?.name || null;
  };

  const getSelectedCategoryName = () => {
    if (!formData.category_id || !categories) return '';
    const viewCategories = Array.isArray(categories) ? categories : [];
    const cat = viewCategories.find((c: any) => String(c.id) === String(formData.category_id));
    return cat?.name || '';
  };

  const formatDisplayDate = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate stats
  const viewBills = Array.isArray(bills) ? bills : [];
  const viewCategories = Array.isArray(categories) ? categories : [];

  // Total of all repeating bills (same as web version)
  const totalRepeatingBills = viewBills
    .reduce((sum: number, b: Bill) => sum + (parseFloat(String(b.amount)) || 0), 0);

  const statsFrequencyLabel = useMemo(() => {
    const normalizedFrequencies = new Set(
      viewBills
        .map((bill: Bill) => String(bill.frequency || '').trim().toLowerCase())
        .filter(Boolean)
    );

    if (normalizedFrequencies.size === 1) {
      const [onlyFrequency] = Array.from(normalizedFrequencies);
      return `${onlyFrequency.charAt(0).toUpperCase()}${onlyFrequency.slice(1)} Repeats`;
    }

    return 'All Frequency Repeats';
  }, [viewBills]);

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
          Repating transctions
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
        <Surface style={[styles.statsCard, { backgroundColor: colors.primaryContainer }]} elevation={1}>
          <View style={styles.statsContent}>
            <View style={[styles.statsIcon, { backgroundColor: `${colors.primary}20` }]}>
              <MaterialCommunityIcons name="repeat" size={24} color={colors.primary} />
            </View>
            <View style={styles.statsText}>
              <Text variant="labelMedium" style={{ color: colors.primary }}>{statsFrequencyLabel}</Text>
              <Text variant="headlineSmall" style={{ color: colors.primary, fontWeight: 'bold' }}>
                {formatAmount(totalRepeatingBills)}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.primary }}>
                {viewBills.length} schedules
              </Text>
            </View>
          </View>
        </Surface>

        {/* Bills List */}
        {viewBills.length > 0 ? (
          viewBills.map((bill: Bill) => {
            const dueDate = bill.next_due_date;
            const daysUntil = getDaysUntilDue(dueDate);
            const statusColor = getDueStatusColor(daysUntil);
            const billName = bill.contact_name || bill.vendor || 'Unnamed Bill';
            const categoryName = getCategoryName(bill.category_id);
            const status = bill.status || 'scheduled';
            const billAmount = parseFloat(String(bill.amount)) || 0;

            return (
              <Surface
                key={bill.id}
                style={[styles.billCard, { backgroundColor: colors.surface }]}
                elevation={1}
              >
                <TouchableOpacity onLongPress={() => showBillActions(bill)}>
                  <View style={styles.billHeader}>
                    <View style={[styles.billIcon, { backgroundColor: `${statusColor}15` }]}>
                      <MaterialCommunityIcons
                        name="repeat"
                        size={24}
                        color={statusColor}
                      />
                    </View>
                    <View style={styles.billInfo}>
                      <View style={styles.billTitleRow}>
                        <Text variant="titleMedium" style={{ color: colors.onSurface, flex: 1 }} numberOfLines={1}>
                          {billName}
                        </Text>
                        <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                          {formatAmount(billAmount)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => showBillActions(bill)}
                          style={styles.menuButton}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.onSurfaceVariant} />
                        </TouchableOpacity>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <View style={[styles.badge, { backgroundColor: colors.surfaceVariant }]}>
                          <Text style={{ color: colors.onSurfaceVariant, fontSize: 11 }}>
                            {bill.frequency || 'Monthly'}
                          </Text>
                        </View>
                        {categoryName && (
                          <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
                            <Text style={{ color: colors.primary, fontSize: 11 }}>
                              {categoryName}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.badge, { backgroundColor: `${getStatusColor(status)}20` }]}>
                          <Text style={{ color: getStatusColor(status), fontSize: 11 }}>
                            {status}
                          </Text>
                        </View>
                      </View>
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
                      Next Due: {formatDisplayDate(dueDate)}
                    </Text>
                    {daysUntil !== null && (
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
              No repeating transactions yet
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
              Track your recurring transactions and never miss a payment
            </Text>
            <TouchableOpacity
              style={[styles.createFirstButton, { backgroundColor: colors.primary }]}
              onPress={openModal}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8 }}>
                Create Repeatings transctions
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.primary, bottom: 16 + insets.bottom }]}
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
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
              Repeating transaction
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
                    numberOfLines={1}
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

            {/* Category Selection */}
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginTop: 8, marginBottom: 8 }}>
              Category
            </Text>
            <TouchableOpacity
              style={[styles.pickerButton, { borderColor: colors.outline, backgroundColor: colors.surfaceVariant }]}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={{ color: formData.category_id ? colors.onSurface : colors.onSurfaceVariant }}>
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
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      !formData.category_id && { backgroundColor: `${colors.primary}15` }
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, category_id: '' });
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={{ color: colors.onSurfaceVariant }}>None</Text>
                  </TouchableOpacity>
                  {viewCategories.length === 0 ? (
                    <Text style={{ padding: 12, color: colors.onSurfaceVariant, textAlign: 'center' }}>
                      No categories available
                    </Text>
                  ) : (
                    viewCategories.map((cat: any) => (
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

            <DateField
              label="Next Due Date"
              value={formData.next_due_date}
              onChange={(date) => setFormData({ ...formData, next_due_date: date })}
              style={[styles.input, { marginTop: 12 }]}
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
                Save Repeating
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
          {selectedBill && (
            <>
              <View style={styles.actionSheetHeader}>
                <View style={[styles.actionSheetIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <MaterialCommunityIcons name="repeat" size={28} color={colors.primary} />
                </View>
                <View style={styles.actionSheetInfo}>
                  <Text variant="titleMedium" style={{ color: colors.onSurface }} numberOfLines={1}>
                    {selectedBill.contact_name || selectedBill.vendor || 'Unnamed Bill'}
                  </Text>
                  <Text variant="titleLarge" style={{ color: colors.error, fontWeight: 'bold' }}>
                    {formatAmount(parseFloat(String(selectedBill.amount)) || 0)}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    {selectedBill.frequency || 'Monthly'}
                  </Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 16 }} />

              <TouchableOpacity style={styles.actionSheetButton} onPress={handleDeletePress}>
                <MaterialCommunityIcons name="delete" size={24} color={colors.error} />
                <Text variant="bodyLarge" style={[styles.actionSheetButtonText, { color: colors.error }]}>
                  Delete Repeating transaction
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
            Delete Repeating transaction?
          </Text>
          <Text variant="bodyMedium" style={[styles.deleteConfirmText, { color: colors.onSurfaceVariant }]}>
            This action cannot be undone. The repeating transaction will be permanently removed.
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
  statsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statsText: {
    flex: 1,
  },
  billCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  billTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
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
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
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
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    marginBottom: 12,
  },
  frequencyButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  menuButton: {
    padding: 4,
    marginLeft: 4,
    marginRight: -4,
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

