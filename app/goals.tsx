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
import goalService from '../src/services/goalService';
import categoryService from '../src/services/categoryService';
import { Goal } from '../src/types';

export default function GoalsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [addAmountModalVisible, setAddAmountModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [amountToAdd, setAmountToAdd] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    target_date: '',
    category: '',
    description: '',
  });

  const {
    data: goals,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const result = await goalService.getAll();
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData || [];
      }
      return [];
    },
  });

  // Fetch categories for selection
  const { data: categories } = useQuery({
    queryKey: ['categories', 'grouped'],
    queryFn: async () => {
      const result = await categoryService.getGrouped();
      if (result.success && result.data) {
        const data = result.data as any;
        const payload = data?.data || data;
        return {
          income: Array.isArray(payload?.income) ? payload.income : [],
          expense: Array.isArray(payload?.expense) ? payload.expense : [],
        };
      }
      return { income: [], expense: [] };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await goalService.create({
        name: data.name,
        target_amount: parseFloat(data.target_amount) || 0,
        current_amount: parseFloat(data.current_amount) || 0,
        target_date: data.target_date || undefined,
        category: data.category || undefined,
        description: data.description || undefined,
      });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      closeModal();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const addAmountMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const result = await goalService.addAmount(id, { amount });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      closeAddAmountModal();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await goalService.delete(id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const openModal = () => {
    setFormData({
      name: '',
      target_amount: '',
      current_amount: '',
      target_date: '',
      category: '',
      description: '',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const openAddAmountModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setAmountToAdd('');
    setAddAmountModalVisible(true);
  };

  const closeAddAmountModal = () => {
    setAddAmountModalVisible(false);
    setSelectedGoal(null);
    setAmountToAdd('');
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a goal name');
      return;
    }
    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleAddAmount = () => {
    if (!selectedGoal) return;
    const amount = parseFloat(amountToAdd);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    addAmountMutation.mutate({ id: selectedGoal.id, amount });
  };

  const handleDelete = (goal: Goal) => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(goal.id),
        },
      ]
    );
  };

  const getDaysRemaining = (targetDate: string) => {
    if (!targetDate) return null;
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgressColor = (percentage: number, status?: string) => {
    if (status === 'completed' || percentage >= 100) return colors.tertiary;
    if (percentage >= 75) return '#F59E0B';
    return colors.primary;
  };

  // Calculate stats
  const viewGoals = goals || [];
  const totalTargetAmount = viewGoals.reduce(
    (sum: number, goal: Goal) => sum + (parseFloat(String(goal.target_amount)) || 0),
    0
  );
  const totalCurrentAmount = viewGoals.reduce(
    (sum: number, goal: Goal) => sum + (parseFloat(String(goal.current_amount)) || 0),
    0
  );
  const totalRemaining = totalTargetAmount - totalCurrentAmount;
  const goalsCount = viewGoals.length;

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
          Goals
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
        <View style={styles.statsContainer}>
          <Surface style={[styles.statCard, { backgroundColor: colors.primaryContainer }]} elevation={1}>
            <MaterialCommunityIcons name="target" size={24} color={colors.primary} />
            <Text variant="labelSmall" style={{ color: colors.primary }}>Total Target</Text>
            <Text variant="titleMedium" style={{ color: colors.primary, fontWeight: 'bold' }}>
              {formatAmount(totalTargetAmount)}
            </Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.tertiaryContainer }]} elevation={1}>
            <MaterialCommunityIcons name="trending-up" size={24} color={colors.tertiary} />
            <Text variant="labelSmall" style={{ color: colors.tertiary }}>Total Saved</Text>
            <Text variant="titleMedium" style={{ color: colors.tertiary, fontWeight: 'bold' }}>
              {formatAmount(totalCurrentAmount)}
            </Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.secondaryContainer }]} elevation={1}>
            <MaterialCommunityIcons name="cash" size={24} color={colors.secondary} />
            <Text variant="labelSmall" style={{ color: colors.secondary }}>Remaining</Text>
            <Text variant="titleMedium" style={{ color: colors.secondary, fontWeight: 'bold' }}>
              {formatAmount(totalRemaining > 0 ? totalRemaining : 0)}
            </Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: colors.surfaceVariant }]} elevation={1}>
            <MaterialCommunityIcons name="format-list-bulleted" size={24} color={colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Active Goals</Text>
            <Text variant="titleMedium" style={{ color: colors.onSurfaceVariant, fontWeight: 'bold' }}>
              {goalsCount}
            </Text>
          </Surface>
        </View>

        {viewGoals.length > 0 ? (
          viewGoals.map((goal: Goal) => {
            const percentage = goal.progress_percentage || 0;
            const isCompleted = goal.is_completed || percentage >= 100;
            const daysRemaining = getDaysRemaining(goal.target_date || goal.deadline);
            const progressColor = getProgressColor(percentage, goal.status);

            return (
              <Surface
                key={goal.id}
                style={[styles.goalCard, { backgroundColor: colors.surface }]}
                elevation={1}
              >
                <TouchableOpacity onLongPress={() => handleDelete(goal)}>
                  <View style={styles.goalHeader}>
                    <View
                      style={[
                        styles.goalIcon,
                        { backgroundColor: `${progressColor}15` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={isCompleted ? 'check-circle' : 'flag'}
                        size={24}
                        color={progressColor}
                      />
                    </View>
                    <View style={styles.goalInfo}>
                      <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                        {goal.name}
                      </Text>
                      {goal.category && (
                        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                          Category: {goal.category}
                        </Text>
                      )}
                    </View>
                    {isCompleted && (
                      <View style={[styles.completedBadge, { backgroundColor: colors.tertiaryContainer }]}>
                        <Text variant="labelSmall" style={{ color: colors.tertiary }}>
                          Complete
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.amountsContainer}>
                    <View style={styles.amountItem}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Target</Text>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                        {formatAmount(parseFloat(String(goal.target_amount || (goal as any).amount || 0)))}
                      </Text>
                    </View>
                    <View style={styles.amountItem}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Saved</Text>
                      <Text variant="bodyMedium" style={{ color: colors.tertiary, fontWeight: '600' }}>
                        {formatAmount(parseFloat(String(goal.current_amount || (goal as any).saved_amount || 0)))}
                      </Text>
                    </View>
                    <View style={styles.amountItem}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Remaining</Text>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                        {formatAmount(parseFloat(String((goal as any).remaining_amount ||
                          ((goal.target_amount || 0) - (goal.current_amount || 0)))))}
                      </Text>
                    </View>
                  </View>

                  {(goal.target_date || goal.deadline) && (
                    <View style={styles.dateRow}>
                      <MaterialCommunityIcons name="calendar" size={16} color={colors.onSurfaceVariant} />
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginLeft: 4 }}>
                        Target: {new Date(goal.target_date || goal.deadline).toLocaleDateString()}
                        {daysRemaining !== null && (
                          <Text style={{ color: daysRemaining < 0 ? colors.error : colors.primary }}>
                            {daysRemaining < 0 ? ` (${Math.abs(daysRemaining)} days overdue)` : ` (${daysRemaining} days left)`}
                          </Text>
                        )}
                      </Text>
                    </View>
                  )}

                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Progress</Text>
                      <Text variant="labelSmall" style={{ color: progressColor }}>
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>
                    <ProgressBar
                      progress={Math.min(percentage / 100, 1)}
                      color={progressColor}
                      style={[styles.progressBar, { backgroundColor: `${progressColor}20` }]}
                    />
                  </View>

                  {!isCompleted && (
                    <TouchableOpacity
                      style={[styles.addAmountButton, { backgroundColor: colors.primaryContainer }]}
                      onPress={() => openAddAmountModal(goal)}
                    >
                      <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
                      <Text variant="labelMedium" style={{ color: colors.primary, marginLeft: 4 }}>
                        Add Amount
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </Surface>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="flag-outline" size={64} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 16 }}>
              No goals yet
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
              Create your first goal to start tracking your progress
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

      {/* Add Goal Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
              Add New Goal
            </Text>

            <TextInput
              label="Goal Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Category"
              value={formData.category}
              onChangeText={(text) => setFormData({ ...formData, category: text })}
              mode="outlined"
              placeholder="e.g., Emergency Fund, Vacation"
              style={styles.input}
            />

            <TextInput
              label="Target Amount *"
              value={formData.target_amount}
              onChangeText={(text) => setFormData({ ...formData, target_amount: text })}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <TextInput
              label="Target Date"
              value={formData.target_date}
              onChangeText={(text) => setFormData({ ...formData, target_date: text })}
              mode="outlined"
              placeholder="YYYY-MM-DD"
              style={styles.input}
            />

            <TextInput
              label="Description"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <View style={styles.modalButtons}>
              <Button mode="text" onPress={closeModal}>Cancel</Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={createMutation.isPending}
              >
                Create Goal
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Add Amount Modal */}
      <Portal>
        <Modal
          visible={addAmountModalVisible}
          onDismiss={closeAddAmountModal}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 8 }}>
            Add Amount
          </Text>
          {selectedGoal && (
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 16 }}>
              {selectedGoal.name}
            </Text>
          )}

          {selectedGoal && (
            <Surface style={[styles.goalInfoCard, { backgroundColor: colors.surfaceVariant }]} elevation={0}>
              <View style={styles.goalInfoRow}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Target:</Text>
                <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                  {formatAmount(parseFloat(String(selectedGoal.target_amount || (selectedGoal as any).amount || 0)))}
                </Text>
              </View>
              <View style={styles.goalInfoRow}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Saved:</Text>
                <Text variant="bodyMedium" style={{ color: colors.tertiary, fontWeight: '600' }}>
                  {formatAmount(parseFloat(String(selectedGoal.current_amount || (selectedGoal as any).saved_amount || 0)))}
                </Text>
              </View>
              <View style={styles.goalInfoRow}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Remaining:</Text>
                <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                  {formatAmount(parseFloat(String((selectedGoal as any).remaining_amount ||
                    ((selectedGoal.target_amount || 0) - (selectedGoal.current_amount || 0)))))}
                </Text>
              </View>
            </Surface>
          )}

          <TextInput
            label="Amount to Add *"
            value={amountToAdd}
            onChangeText={setAmountToAdd}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <View style={styles.modalButtons}>
            <Button mode="text" onPress={closeAddAmountModal}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleAddAmount}
              loading={addAmountMutation.isPending}
            >
              Add Amount
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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  goalCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  completedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  amountsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  amountItem: {
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  addAmountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
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
  goalInfoCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  goalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
});
