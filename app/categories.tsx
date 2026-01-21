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
  Switch,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../src/contexts/ThemeContext';
import categoryService from '../src/services/categoryService';

type CategoryType = 'income' | 'expense' | 'asset' | 'liability';

interface Category {
  id: number;
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  is_active?: boolean;
  is_default?: boolean;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: number;
  name: string;
  category_id: number;
  color?: string;
  icon?: string;
  is_active?: boolean;
}

const typeConfig: Record<CategoryType, { label: string; icon: string; color: string }> = {
  income: { label: 'Income', icon: 'trending-up', color: '#10B981' },
  expense: { label: 'Expense', icon: 'trending-down', color: '#EF4444' },
  asset: { label: 'Asset', icon: 'domain', color: '#3B82F6' },
  liability: { label: 'Liability', icon: 'credit-card', color: '#F59E0B' },
};

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<CategoryType>('income');
  const [modalVisible, setModalVisible] = useState(false);
  const [subcategoryModalVisible, setSubcategoryModalVisible] = useState(false);
  const [selectedParentCategory, setSelectedParentCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'income' as CategoryType,
    color: '#10B981',
    is_active: true,
  });
  const [subcategoryFormData, setSubcategoryFormData] = useState({
    name: '',
    color: '#10B981',
    is_active: true,
  });

  const {
    data: categories,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => {
      const result = await categoryService.getAll(null, true);
      if (result.success && result.data) {
        const responseData = result.data as any;
        const data = responseData?.data || responseData || [];
        return Array.isArray(data) ? data : [];
      }
      return [];
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await categoryService.create({
        name: data.name,
        type: data.type,
        color: data.color,
        is_active: data.is_active ? 1 : 0,
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

  const createSubcategoryMutation = useMutation({
    mutationFn: async ({ parentId, data }: { parentId: number; data: typeof subcategoryFormData }) => {
      const result = await categoryService.createSubcategory({
        name: data.name,
        category_id: parentId,
        color: data.color,
        is_active: data.is_active ? 1 : 0,
      });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      closeSubcategoryModal();
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async ({ id, isSubcategory }: { id: number; isSubcategory: boolean }) => {
      const result = isSubcategory
        ? await categoryService.deleteSubcategory(id)
        : await categoryService.delete(id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  const openModal = (type?: CategoryType) => {
    setFormData({
      name: '',
      type: type || activeTab,
      color: typeConfig[type || activeTab].color,
      is_active: true,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const openSubcategoryModal = (parentCategory: Category) => {
    setSelectedParentCategory(parentCategory);
    setSubcategoryFormData({
      name: '',
      color: parentCategory.color || typeConfig[parentCategory.type].color,
      is_active: true,
    });
    setSubcategoryModalVisible(true);
  };

  const closeSubcategoryModal = () => {
    setSubcategoryModalVisible(false);
    setSelectedParentCategory(null);
  };

  const handleSaveCategory = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    createCategoryMutation.mutate(formData);
  };

  const handleSaveSubcategory = () => {
    if (!subcategoryFormData.name.trim()) {
      Alert.alert('Error', 'Please enter a subcategory name');
      return;
    }
    if (!selectedParentCategory) return;
    createSubcategoryMutation.mutate({
      parentId: selectedParentCategory.id,
      data: subcategoryFormData,
    });
  };

  const handleDelete = (item: Category | Subcategory, isSubcategory: boolean) => {
    if ((item as Category).is_default) {
      Alert.alert('Cannot Delete', 'Default categories cannot be deleted');
      return;
    }
    const itemType = isSubcategory ? 'subcategory' : 'category';
    const hasSubcats = !isSubcategory && (item as Category).subcategories?.length;
    Alert.alert(
      `Delete ${itemType}`,
      `Are you sure you want to delete "${item.name}"?${hasSubcats ? '\n\nWarning: This will also delete all subcategories.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCategoryMutation.mutate({ id: item.id, isSubcategory }),
        },
      ]
    );
  };

  // Calculate stats
  const viewCategories: Category[] = categories || [];
  const totalCategories = viewCategories.length;
  const totalSubcategories = viewCategories.reduce(
    (sum, cat) => sum + (cat.subcategories?.length || 0),
    0
  );
  const incomeCount = viewCategories.filter((c) => c.type === 'income').length;
  const expenseCount = viewCategories.filter((c) => c.type === 'expense').length;
  const assetCount = viewCategories.filter((c) => c.type === 'asset').length;
  const liabilityCount = viewCategories.filter((c) => c.type === 'liability').length;

  // Filter categories by active tab
  const filteredCategories = viewCategories.filter((c) => c.type === activeTab);

  const getTypeColor = (type: CategoryType) => typeConfig[type]?.color || colors.primary;

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
          Categories
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Section */}
      <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
        <View style={styles.statItem}>
          <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: 'bold' }}>
            {totalCategories}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Categories</Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: 'bold' }}>
            {totalSubcategories}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Subcategories</Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="titleMedium" style={{ color: '#10B981', fontWeight: 'bold' }}>
            {incomeCount}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Income</Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="titleMedium" style={{ color: '#EF4444', fontWeight: 'bold' }}>
            {expenseCount}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Expense</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScrollView}
        contentContainerStyle={styles.tabsScrollContent}
      >
        {(Object.keys(typeConfig) as CategoryType[]).map((type) => {
          const config = typeConfig[type];
          const count = viewCategories.filter((c) => c.type === type).length;
          const isActive = activeTab === type;

          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.tabChip,
                {
                  backgroundColor: isActive ? config.color : colors.surface,
                  borderColor: isActive ? config.color : colors.surfaceVariant,
                },
              ]}
              onPress={() => setActiveTab(type)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={config.icon as any}
                size={16}
                color={isActive ? '#fff' : colors.onSurfaceVariant}
              />
              <Text
                style={{
                  color: isActive ? '#fff' : colors.onSurface,
                  fontWeight: '600',
                  fontSize: 13,
                  marginHorizontal: 6,
                }}
              >
                {config.label}
              </Text>
              <View
                style={[
                  styles.tabCount,
                  {
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.surfaceVariant,
                  },
                ]}
              >
                <Text style={{
                  color: isActive ? '#fff' : colors.onSurfaceVariant,
                  fontSize: 11,
                  fontWeight: '600'
                }}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
        {/* Tab Header */}
        <View style={styles.tabHeader}>
          <View>
            <Text variant="titleMedium" style={{ color: colors.onSurface }}>
              {typeConfig[activeTab].label} Categories
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {filteredCategories.length} categories
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: getTypeColor(activeTab) }]}
            onPress={() => openModal(activeTab)}
          >
            <MaterialCommunityIcons name="plus" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 4 }}>Add</Text>
          </TouchableOpacity>
        </View>

        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <Surface
              key={category.id}
              style={[styles.categoryCard, { backgroundColor: colors.surface }]}
              elevation={1}
            >
              <TouchableOpacity
                onLongPress={() => !category.is_default && handleDelete(category, false)}
              >
                <View style={styles.categoryHeader}>
                  <View
                    style={[
                      styles.categoryColor,
                      { backgroundColor: category.color || getTypeColor(category.type) },
                    ]}
                  />
                  <View style={[styles.categoryIcon, { backgroundColor: `${category.color || getTypeColor(category.type)}15` }]}>
                    <MaterialCommunityIcons
                      name={(category.icon || 'folder') as any}
                      size={20}
                      color={category.color || getTypeColor(category.type)}
                    />
                  </View>
                  <View style={styles.categoryInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text variant="titleMedium" style={{ color: colors.onSurface, flex: 1 }}>
                        {category.name}
                      </Text>
                      {category.is_default && (
                        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                          Default
                        </Text>
                      )}
                    </View>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      {category.subcategories && category.subcategories.length > 0
                        ? `${category.subcategories.length} subcategories`
                        : 'No subcategories'}
                    </Text>
                  </View>
                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: `${colors.primary}15`, borderRadius: 16 }]}
                      onPress={() => openSubcategoryModal(category)}
                    >
                      <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: category.is_active !== false ? colors.tertiary : colors.error },
                      ]}
                    />
                  </View>
                </View>

                {/* Subcategories */}
                {category.subcategories && category.subcategories.length > 0 && (
                  <View style={[styles.subcategoriesContainer, { borderTopColor: colors.surfaceVariant }]}>
                    {category.subcategories.map((sub, index) => (
                      <TouchableOpacity
                        key={sub.id}
                        style={[
                          styles.subcategoryItem,
                          { borderBottomColor: colors.surfaceVariant },
                          index === category.subcategories!.length - 1 && { borderBottomWidth: 0 },
                        ]}
                        onLongPress={() => handleDelete(sub, true)}
                      >
                        <View
                          style={[
                            styles.subcategoryColor,
                            { backgroundColor: sub.color || category.color || getTypeColor(category.type) },
                          ]}
                        />
                        <Text variant="bodyMedium" style={{ color: colors.onSurface, flex: 1 }}>
                          {sub.name}
                        </Text>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: sub.is_active !== false ? colors.tertiary : colors.error },
                          ]}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            </Surface>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name={(typeConfig[activeTab]?.icon || 'folder') as any}
              size={64}
              color={colors.onSurfaceVariant}
            />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 16 }}>
              No {typeConfig[activeTab].label.toLowerCase()} categories yet
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: getTypeColor(activeTab) }]}
              onPress={() => openModal(activeTab)}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 4 }}>
                Create First {typeConfig[activeTab].label}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: getTypeColor(activeTab) }]}
        color="#fff"
        onPress={() => openModal()}
      />

      {/* Create Category Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
              Create New Category
            </Text>

            <TextInput
              label="Category Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              mode="outlined"
              style={styles.input}
            />

            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
              Type
            </Text>
            <View style={styles.typeButtons}>
              {(Object.keys(typeConfig) as CategoryType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: formData.type === type ? `${typeConfig[type].color}20` : colors.surfaceVariant,
                      borderColor: formData.type === type ? typeConfig[type].color : 'transparent',
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, type, color: typeConfig[type].color })}
                >
                  <MaterialCommunityIcons
                    name={typeConfig[type].icon as any}
                    size={16}
                    color={formData.type === type ? typeConfig[type].color : colors.onSurfaceVariant}
                  />
                  <Text
                    style={{
                      color: formData.type === type ? typeConfig[type].color : colors.onSurfaceVariant,
                      fontSize: 11,
                      marginLeft: 2,
                    }}
                  >
                    {typeConfig[type].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text variant="bodyMedium" style={{ color: colors.onSurface }}>Active</Text>
              <Switch
                value={formData.is_active}
                onValueChange={(value) => setFormData({ ...formData, is_active: value })}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button mode="text" onPress={closeModal}>Cancel</Button>
              <Button
                mode="contained"
                onPress={handleSaveCategory}
                loading={createCategoryMutation.isPending}
                buttonColor={typeConfig[formData.type].color}
              >
                Create
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Create Subcategory Modal */}
      <Portal>
        <Modal
          visible={subcategoryModalVisible}
          onDismiss={closeSubcategoryModal}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 4 }}>
            Create Subcategory
          </Text>
          {selectedParentCategory && (
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 16 }}>
              Under: {selectedParentCategory.name}
            </Text>
          )}

          <TextInput
            label="Subcategory Name *"
            value={subcategoryFormData.name}
            onChangeText={(text) => setSubcategoryFormData({ ...subcategoryFormData, name: text })}
            mode="outlined"
            style={styles.input}
          />

          <View style={styles.switchRow}>
            <Text variant="bodyMedium" style={{ color: colors.onSurface }}>Active</Text>
            <Switch
              value={subcategoryFormData.is_active}
              onValueChange={(value) => setSubcategoryFormData({ ...subcategoryFormData, is_active: value })}
            />
          </View>

          <View style={styles.modalButtons}>
            <Button mode="text" onPress={closeSubcategoryModal}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleSaveSubcategory}
              loading={createSubcategoryMutation.isPending}
            >
              Create
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  tabsScrollView: {
    flexGrow: 0,
  },
  tabsScrollContent: {
    paddingLeft: 16,
    paddingRight: 32,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
    alignItems: 'center',
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  tabCount: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
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
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  categoryCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  categoryColor: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
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
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subcategoriesContainer: {
    marginLeft: 56,
    borderTopWidth: 1,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  subcategoryColor: {
    width: 3,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
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
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
