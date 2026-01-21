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
import budgetService from '../src/services/budgetService';
import { Budget } from '../src/types';

export default function BudgetsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    period: 'monthly' as 'monthly' | 'weekly' | 'yearly',
  });

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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await budgetService.create({
        name: data.name,
        amount: parseFloat(data.amount) || 0,
        period: data.period,
      });
      if (!result.success) throw new Error(result.error);
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
        amount: String(budget.amount || 0),
        period: budget.period || 'monthly',
      });
    } else {
      setEditingBudget(null);
      setFormData({
        name: '',
        amount: '',
        period: 'monthly',
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingBudget(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a budget name');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    createMutation.mutate(formData);
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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return colors.error;
    if (percentage >= 80) return '#F59E0B';
    return colors.tertiary;
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
        {budgets && budgets.length > 0 ? (
          budgets.map((budget: Budget) => {
            const percentage = budget.progress_percentage || 0;
            const progressColor = getProgressColor(percentage);

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
                  <View style={styles.budgetHeader}>
                    <View style={[styles.budgetIcon, { backgroundColor: `${progressColor}15` }]}>
                      <MaterialCommunityIcons name="target" size={24} color={progressColor} />
                    </View>
                    <View style={styles.budgetInfo}>
                      <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                        {budget.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        {budget.period ? budget.period.charAt(0).toUpperCase() + budget.period.slice(1) : 'Monthly'}
                      </Text>
                    </View>
                    <View style={styles.budgetAmount}>
                      <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                        {formatAmount(budget.spent || 0)}
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        of {formatAmount(budget.amount)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressContainer}>
                    <ProgressBar
                      progress={Math.min(percentage / 100, 1)}
                      color={progressColor}
                      style={[styles.progressBar, { backgroundColor: `${progressColor}20` }]}
                    />
                    <Text
                      variant="labelSmall"
                      style={{ color: progressColor, marginTop: 4, textAlign: 'right' }}
                    >
                      {percentage.toFixed(0)}% used
                    </Text>
                  </View>

                  <View style={styles.budgetFooter}>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      Remaining: {formatAmount(budget.remaining || 0)}
                    </Text>
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
          <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
            {editingBudget ? 'Edit Budget' : 'Add Budget'}
          </Text>

          <TextInput
            label="Budget Name"
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
            Period
          </Text>
          <View style={styles.periodButtons}>
            {['weekly', 'monthly', 'yearly'].map((period) => (
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
                  }}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
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
              {editingBudget ? 'Update' : 'Add'}
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
  },
  budgetAmount: {
    alignItems: 'flex-end',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  budgetFooter: {
    marginTop: 8,
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
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
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
});
