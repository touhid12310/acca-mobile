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
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../src/contexts/ThemeContext';
import categoryService from '../src/services/categoryService';
import { Category } from '../src/types';

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    icon: 'tag',
    color: '#3B82F6',
  });

  const {
    data: categories,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const result = await categoryService.getGrouped();
      if (result.success && result.data) {
        const responseData = result.data as any;
        const data = responseData?.data || responseData;
        // Flatten grouped categories
        const allCategories: Category[] = [];
        if (data.income) allCategories.push(...data.income);
        if (data.expense) allCategories.push(...data.expense);
        return allCategories;
      }
      return [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await categoryService.create({
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
      });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      closeModal();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await categoryService.delete(id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const openModal = () => {
    setFormData({
      name: '',
      type: 'expense',
      icon: 'tag',
      color: '#3B82F6',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (category: Category) => {
    if (category.is_default) {
      Alert.alert('Cannot Delete', 'Default categories cannot be deleted');
      return;
    }
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(category.id),
        },
      ]
    );
  };

  const filteredCategories = (categories || []).filter((cat: Category) => {
    if (typeFilter === 'all') return true;
    return cat.type === typeFilter;
  });

  const incomeCategories = filteredCategories.filter((c: Category) => c.type === 'income');
  const expenseCategories = filteredCategories.filter((c: Category) => c.type === 'expense');

  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#F97316', '#EC4899', '#06B6D4', '#84CC16', '#6366F1',
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const renderCategoryList = (categoryList: Category[], title: string, typeColor: string) => {
    if (categoryList.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>
          {title}
        </Text>
        <Surface style={[styles.listCard, { backgroundColor: colors.surface }]} elevation={1}>
          {categoryList.map((category: Category, index: number) => (
            <React.Fragment key={category.id}>
              <TouchableOpacity
                style={styles.categoryItem}
                onLongPress={() => handleDelete(category)}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: `${category.color || typeColor}20` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={(category.icon as any) || 'tag'}
                    size={20}
                    color={category.color || typeColor}
                  />
                </View>
                <View style={styles.categoryInfo}>
                  <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
                    {category.name}
                  </Text>
                  {category.subcategories && category.subcategories.length > 0 && (
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      {category.subcategories.length} subcategories
                    </Text>
                  )}
                </View>
                {category.is_default && (
                  <Chip
                    compact
                    style={{ backgroundColor: colors.surfaceVariant }}
                    textStyle={{ color: colors.onSurfaceVariant, fontSize: 10 }}
                  >
                    Default
                  </Chip>
                )}
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
              {index < categoryList.length - 1 && <Divider style={{ marginLeft: 56 }} />}
            </React.Fragment>
          ))}
        </Surface>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
          Categories
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterChips}>
            <Chip
              selected={typeFilter === 'all'}
              onPress={() => setTypeFilter('all')}
              style={styles.filterChip}
              mode={typeFilter === 'all' ? 'flat' : 'outlined'}
            >
              All
            </Chip>
            <Chip
              selected={typeFilter === 'income'}
              onPress={() => setTypeFilter('income')}
              style={styles.filterChip}
              mode={typeFilter === 'income' ? 'flat' : 'outlined'}
            >
              Income
            </Chip>
            <Chip
              selected={typeFilter === 'expense'}
              onPress={() => setTypeFilter('expense')}
              style={styles.filterChip}
              mode={typeFilter === 'expense' ? 'flat' : 'outlined'}
            >
              Expense
            </Chip>
          </View>
        </ScrollView>
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
        {filteredCategories.length > 0 ? (
          <>
            {typeFilter !== 'expense' && renderCategoryList(incomeCategories, 'Income Categories', colors.tertiary)}
            {typeFilter !== 'income' && renderCategoryList(expenseCategories, 'Expense Categories', colors.error)}
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="tag-off" size={64} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 16 }}>
              No categories found
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
            Add Category
          </Text>

          <TextInput
            label="Category Name"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            mode="outlined"
            style={styles.input}
          />

          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
            Type
          </Text>
          <View style={styles.typeButtons}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor: formData.type === 'income' ? colors.tertiaryContainer : colors.surfaceVariant,
                  borderColor: formData.type === 'income' ? colors.tertiary : 'transparent',
                },
              ]}
              onPress={() => setFormData({ ...formData, type: 'income' })}
            >
              <MaterialCommunityIcons
                name="arrow-up"
                size={20}
                color={formData.type === 'income' ? colors.tertiary : colors.onSurfaceVariant}
              />
              <Text
                style={{
                  color: formData.type === 'income' ? colors.tertiary : colors.onSurfaceVariant,
                  marginLeft: 4,
                }}
              >
                Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor: formData.type === 'expense' ? colors.errorContainer : colors.surfaceVariant,
                  borderColor: formData.type === 'expense' ? colors.error : 'transparent',
                },
              ]}
              onPress={() => setFormData({ ...formData, type: 'expense' })}
            >
              <MaterialCommunityIcons
                name="arrow-down"
                size={20}
                color={formData.type === 'expense' ? colors.error : colors.onSurfaceVariant}
              />
              <Text
                style={{
                  color: formData.type === 'expense' ? colors.error : colors.onSurfaceVariant,
                  marginLeft: 4,
                }}
              >
                Expense
              </Text>
            </TouchableOpacity>
          </View>

          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8, marginTop: 8 }}>
            Color
          </Text>
          <View style={styles.colorGrid}>
            {colorOptions.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  formData.color === color && styles.colorSelected,
                ]}
                onPress={() => setFormData({ ...formData, color })}
              >
                {formData.color === color && (
                  <MaterialCommunityIcons name="check" size={16} color="white" />
                )}
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
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    height: 32,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  listCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
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
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
