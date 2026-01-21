import React, { useState, useEffect } from 'react';
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
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../src/contexts/ThemeContext';
import { useCurrency } from '../src/contexts/CurrencyContext';
import budgetService from '../src/services/budgetService';
import categoryService from '../src/services/categoryService';
import { Budget } from '../src/types';

interface SelectedCategory {
  categoryId: number;
  categoryName: string;
  subcategoryId: number | null;
  subcategoryName: string;
  displayName: string;
}

export default function BudgetsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    budgeted_amount: '',
    period: 'monthly' as 'monthly' | 'weekly' | 'quarterly' | 'yearly',
    start_date: new Date().toISOString().split('T')[0], // Today's date
    notes: '',
  });
  const [selectedCategories, setSelectedCategories] = useState<SelectedCategory[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Fetch expense categories for budget
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await categoryService.getForTransaction({ type: 'expense' });
        if (result.success && result.data) {
          const data = (result.data as any)?.data || result.data;
          setAvailableCategories(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  const {
    data: budgets,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const result = await budgetService.getAll();
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData || [];
      }
      return [];
    },
  });

  const viewBudgets = Array.isArray(budgets) ? budgets : [];

  // Calculate stats
  const totalBudgeted = viewBudgets.reduce(
    (sum, budget) => sum + (parseFloat(budget.budgeted_amount) || parseFloat(budget.amount) || 0),
    0
  );
  const totalSpent = viewBudgets.reduce(
    (sum, budget) => sum + (parseFloat(budget.spent_amount) || parseFloat(budget.spent) || 0),
    0
  );
  const totalRemaining = totalBudgeted - totalSpent;
  const budgetsCount = viewBudgets.length;

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { categories: SelectedCategory[] }) => {
      const payload: any = {
        name: data.name,
        budgeted_amount: parseFloat(data.budgeted_amount) || 0,
        period: data.period,
        start_date: data.start_date || new Date().toISOString().split('T')[0],
        notes: data.notes || '',
        categories: data.categories.map(cat => ({
          category_id: cat.categoryId,
          subcategory_id: cat.subcategoryId,
        })),
      };
      const result = await budgetService.create(payload);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      closeModal();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData & { categories: SelectedCategory[] } }) => {
      const payload: any = {
        name: data.name,
        budgeted_amount: parseFloat(data.budgeted_amount) || 0,
        period: data.period,
        start_date: data.start_date || new Date().toISOString().split('T')[0],
        notes: data.notes || '',
        categories: data.categories.map(cat => ({
          category_id: cat.categoryId,
          subcategory_id: cat.subcategoryId,
        })),
      };
      console.log('Update payload:', JSON.stringify(payload, null, 2));
      const result = await budgetService.update(id, payload);
      console.log('Update result:', JSON.stringify(result, null, 2));
      if (!result.success) {
        const errorData = result.data as any;
        const errorMsg = errorData?.message || result.error || 'Update failed';
        const validationErrors = errorData?.errors;
        if (validationErrors) {
          const errorDetails = Object.entries(validationErrors)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
            .join('\n');
          throw new Error(`${errorMsg}\n${errorDetails}`);
        }
        throw new Error(errorMsg);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      closeModal();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await budgetService.delete(id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const openModal = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        name: budget.name,
        budgeted_amount: String((budget as any).budgeted_amount || (budget as any).amount || 0),
        period: budget.period || 'monthly',
        start_date: (budget as any).start_date
          ? (budget as any).start_date.split('T')[0]  // Handle both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss' formats
          : new Date().toISOString().split('T')[0],
        notes: (budget as any).notes || '',
      });
      // Set selected categories from budget
      const budgetCategories = (budget as any).budget_categories_with_details || [];
      const categories: SelectedCategory[] = budgetCategories.map((bc: any) => ({
        categoryId: bc.category_id,
        categoryName: bc.category?.name || 'N/A',
        subcategoryId: bc.subcategory_id || null,
        subcategoryName: bc.subcategory?.name || '',
        displayName: `${bc.category?.name || 'N/A'}${bc.subcategory?.name ? ` › ${bc.subcategory.name}` : ''}`,
      }));
      setSelectedCategories(categories);
    } else {
      setEditingBudget(null);
      setFormData({
        name: '',
        budgeted_amount: '',
        period: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setSelectedCategories([]);
    }
    setShowCategoryPicker(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingBudget(null);
    setSelectedCategories([]);
    setShowCategoryPicker(false);
  };

  const handleAddCategory = (category: any, subcategory?: any) => {
    const newCategory: SelectedCategory = {
      categoryId: category.id,
      categoryName: category.name,
      subcategoryId: subcategory?.id || null,
      subcategoryName: subcategory?.name || '',
      displayName: `${category.name}${subcategory?.name ? ` › ${subcategory.name}` : ''}`,
    };

    // Check if already exists
    const exists = selectedCategories.some(
      cat => cat.categoryId === newCategory.categoryId && cat.subcategoryId === newCategory.subcategoryId
    );

    if (!exists) {
      setSelectedCategories(prev => [...prev, newCategory]);
    }
    setShowCategoryPicker(false);
  };

  const handleRemoveCategory = (index: number) => {
    setSelectedCategories(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a budget name');
      return;
    }
    if (selectedCategories.length === 0) {
      Alert.alert('Error', 'Please select at least one category');
      return;
    }
    if (!formData.budgeted_amount || parseFloat(formData.budgeted_amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const payload = { ...formData, categories: selectedCategories };

    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (budget: Budget) => {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete "${budget.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(budget.id),
        },
      ]
    );
  };

  const getProgressColor = (percentage: number, status?: string) => {
    if (status === 'over_budget' || status === 'over' || percentage >= 100) return colors.error;
    if (status === 'warning' || percentage >= 80) return '#F59E0B';
    return colors.tertiary;
  };

  const getStatusText = (status?: string, percentage?: number) => {
    if (status === 'over_budget' || status === 'over') return 'Over Budget';
    if (status === 'warning') return 'Warning';
    if ((percentage || 0) >= 100) return 'Over Budget';
    if ((percentage || 0) >= 80) return 'Near Limit';
    return 'On Track';
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
          Budgets
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
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <View style={[styles.statIconWrapper, { backgroundColor: `${colors.primary}15` }]}>
              <MaterialCommunityIcons name="chart-pie" size={20} color={colors.primary} />
            </View>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Total Budgeted</Text>
            <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
              {formatAmount(totalBudgeted)}
            </Text>
          </Surface>

          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <View style={[styles.statIconWrapper, { backgroundColor: `${colors.error}15` }]}>
              <MaterialCommunityIcons name="cash-minus" size={20} color={colors.error} />
            </View>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Total Spent</Text>
            <Text variant="titleSmall" style={{ color: colors.error, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
              {formatAmount(totalSpent)}
            </Text>
          </Surface>

          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <View style={[styles.statIconWrapper, { backgroundColor: `${colors.tertiary}15` }]}>
              <MaterialCommunityIcons name="cash-check" size={20} color={colors.tertiary} />
            </View>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Remaining</Text>
            <Text
              variant="titleSmall"
              style={{ color: totalRemaining >= 0 ? colors.tertiary : colors.error, fontWeight: 'bold' }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatAmount(totalRemaining)}
            </Text>
          </Surface>

          <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={1}>
            <View style={[styles.statIconWrapper, { backgroundColor: `${colors.secondary}15` }]}>
              <MaterialCommunityIcons name="format-list-bulleted" size={20} color={colors.secondary} />
            </View>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Budgets</Text>
            <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: 'bold' }}>
              {budgetsCount}
            </Text>
          </Surface>
        </View>

        {/* Budget List */}
        {viewBudgets.length > 0 ? (
          viewBudgets.map((budget: any) => {
            const budgetedAmount = parseFloat(budget.budgeted_amount) || parseFloat(budget.amount) || 0;
            const spentAmount = parseFloat(budget.spent_amount) || parseFloat(budget.spent) || 0;
            const remainingAmount = parseFloat(budget.remaining_amount) || parseFloat(budget.remaining) || (budgetedAmount - spentAmount);
            const percentage = budget.progress_percentage || (budgetedAmount > 0 ? (spentAmount / budgetedAmount) * 100 : 0);
            const progressColor = getProgressColor(percentage, budget.status);
            const categories = budget.budget_categories_with_details || [];

            return (
              <Surface
                key={budget.id}
                style={[styles.budgetCard, { backgroundColor: colors.surface }]}
                elevation={1}
              >
                <TouchableOpacity
                  onPress={() => openModal(budget)}
                  onLongPress={() => handleDelete(budget)}
                >
                  {/* Header */}
                  <View style={styles.budgetHeader}>
                    <View style={[styles.budgetIcon, { backgroundColor: `${progressColor}15` }]}>
                      <MaterialCommunityIcons name="target" size={24} color={progressColor} />
                    </View>
                    <View style={styles.budgetInfo}>
                      <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                        {budget.name}
                      </Text>
                      <View style={[styles.periodBadge, { backgroundColor: `${colors.primary}15` }]}>
                        <Text variant="labelSmall" style={{ color: colors.primary }}>
                          {budget.period ? budget.period.charAt(0).toUpperCase() + budget.period.slice(1) : 'Monthly'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.percentageCircle}>
                      <Text variant="titleMedium" style={{ color: progressColor, fontWeight: 'bold' }}>
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </View>

                  {/* Categories */}
                  {categories.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                      <View style={styles.categoriesContainer}>
                        {categories.map((bc: any, index: number) => (
                          <View key={index} style={[styles.categoryTag, { backgroundColor: `${colors.secondary}15` }]}>
                            <Text variant="labelSmall" style={{ color: colors.secondary }}>
                              {bc.category?.name || 'N/A'}
                              {bc.subcategory?.name && ` › ${bc.subcategory.name}`}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  )}

                  {/* Amount Info */}
                  <View style={styles.amountRow}>
                    <View style={styles.amountItem}>
                      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Budget</Text>
                      <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                        {formatAmount(budgetedAmount)}
                      </Text>
                    </View>
                    <View style={styles.amountItem}>
                      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Spent</Text>
                      <Text variant="titleMedium" style={{ color: colors.error, fontWeight: '600' }}>
                        {formatAmount(spentAmount)}
                      </Text>
                    </View>
                    <View style={styles.amountItem}>
                      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Remaining</Text>
                      <Text
                        variant="titleMedium"
                        style={{
                          color: remainingAmount >= 0 ? colors.tertiary : colors.error,
                          fontWeight: '600'
                        }}
                      >
                        {formatAmount(remainingAmount)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <ProgressBar
                      progress={Math.min(percentage / 100, 1)}
                      color={progressColor}
                      style={[styles.progressBar, { backgroundColor: `${progressColor}20` }]}
                    />
                    <View style={styles.progressFooter}>
                      <Text variant="labelSmall" style={{ color: progressColor }}>
                        {getStatusText(budget.status, percentage)}
                      </Text>
                      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                        {percentage.toFixed(0)}% used
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Surface>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="target" size={64} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 16 }}>
              No budgets yet
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
              Create budgets to track your spending
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
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
              {editingBudget ? 'Edit Budget' : 'Add Budget'}
            </Text>

            <TextInput
              label="Budget Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              mode="outlined"
              style={styles.input}
            />

            {/* Categories Section */}
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
              Categories *
            </Text>

            {/* Selected Categories */}
            {selectedCategories.length > 0 && (
              <View style={styles.selectedCategoriesContainer}>
                {selectedCategories.map((cat, index) => (
                  <Chip
                    key={index}
                    onClose={() => handleRemoveCategory(index)}
                    style={[styles.selectedCategoryChip, { backgroundColor: colors.primaryContainer }]}
                    textStyle={{ color: colors.primary, fontSize: 12 }}
                  >
                    {cat.displayName}
                  </Chip>
                ))}
              </View>
            )}

            {/* Category Picker Button */}
            <TouchableOpacity
              style={[styles.categoryPickerButton, { borderColor: colors.outline, backgroundColor: colors.surfaceVariant }]}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={{ color: colors.onSurfaceVariant }}>Select categories...</Text>
              <MaterialCommunityIcons
                name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>

            {/* Category Picker Dropdown */}
            {showCategoryPicker && (
              <Surface style={[styles.categoryDropdown, { backgroundColor: colors.surface }]} elevation={2}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {availableCategories.map((category) => (
                    <View key={category.id}>
                      <TouchableOpacity
                        style={styles.categoryOption}
                        onPress={() => handleAddCategory(category)}
                      >
                        <Text style={{ color: colors.onSurface, fontWeight: '500' }}>{category.name}</Text>
                      </TouchableOpacity>
                      {category.subcategories && category.subcategories.length > 0 && (
                        <View style={styles.subcategoriesList}>
                          {category.subcategories.map((sub: any) => (
                            <TouchableOpacity
                              key={sub.id}
                              style={styles.subcategoryOption}
                              onPress={() => handleAddCategory(category, sub)}
                            >
                              <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
                                › {sub.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </Surface>
            )}

            <TextInput
              label="Budget Amount *"
              value={formData.budgeted_amount}
              onChangeText={(text) => setFormData({ ...formData, budgeted_amount: text })}
              mode="outlined"
              keyboardType="decimal-pad"
              style={[styles.input, { marginTop: 12 }]}
            />

            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
              Period *
            </Text>
            <View style={styles.periodButtons}>
              {['weekly', 'monthly', 'quarterly', 'yearly'].map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    {
                      backgroundColor: formData.period === period ? colors.primaryContainer : colors.surfaceVariant,
                      borderColor: formData.period === period ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, period: period as any })}
                >
                  <Text
                    style={{
                      color: formData.period === period ? colors.primary : colors.onSurfaceVariant,
                      fontWeight: formData.period === period ? '600' : '400',
                      fontSize: 11,
                    }}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              label="Notes"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="Optional notes about this budget"
            />

            <View style={styles.modalButtons}>
              <Button mode="text" onPress={closeModal}>Cancel</Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingBudget ? 'Update' : 'Add'}
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
  budgetCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  budgetInfo: {
    flex: 1,
    gap: 4,
  },
  periodBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  percentageCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesScroll: {
    marginTop: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  amountItem: {
    alignItems: 'center',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
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
  periodButtons: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  selectedCategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  selectedCategoryChip: {
    marginBottom: 4,
  },
  categoryPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryDropdown: {
    borderRadius: 8,
    marginTop: 4,
    padding: 8,
    maxHeight: 220,
  },
  categoryOption: {
    padding: 10,
    borderRadius: 6,
  },
  subcategoriesList: {
    paddingLeft: 16,
  },
  subcategoryOption: {
    padding: 8,
    borderRadius: 6,
  },
});
