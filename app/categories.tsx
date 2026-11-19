import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Keyboard,
  Platform,
} from "react-native";
import {
  Text,
  Surface,
  FAB,
  ActivityIndicator,
  Portal,
  Button,
  Switch,
} from "react-native-paper";
import DialogModal from "../src/components/common/DialogModal";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRoute } from "expo-router";
import { TriangleAlert } from "lucide-react-native";

import { useTheme } from "../src/contexts/ThemeContext";
import { useToast } from "../src/contexts/NotificationContext";
import { BrandedHeader, BrandStrip } from "../src/components";
import { ConfirmDialog } from "../src/components/ui";
import categoryService from "../src/services/categoryService";
import { PaperTextInput as TextInput } from "../src/components/ui/SafeTextInput";
import {
  CATEGORY_ICON_CHOICES,
  categoryIconName,
} from "../src/utils/categoryIcons";
import { apiErrorMessage } from "../src/utils/apiError";

type CategoryType = "income" | "expense" | "asset" | "liability";

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
  is_default?: boolean;
  user_id?: number | null;
}

type EditTarget =
  | { kind: "category"; item: Category }
  | { kind: "subcategory"; item: Subcategory; parent: Category };

// Swatches offered when editing a category (stored as #RRGGBB, like the web).
const COLOR_CHOICES = [
  "#10B981",
  "#0D9488",
  "#0891B2",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#C026D3",
  "#EC4899",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#6B7280",
];

const pluralize = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

// A subcategory the user made (defaults and other users' rows can't be edited;
// the server refuses them too).
const isOwnSubcategory = (sub: Subcategory) =>
  !sub.is_default && sub.user_id !== null;

const typeConfig: Record<
  CategoryType,
  { label: string; icon: string; color: string }
> = {
  income: { label: "Income", icon: "trending-up", color: "#10B981" },
  expense: { label: "Expense", icon: "trending-down", color: "#EF4444" },
  asset: { label: "Asset", icon: "domain", color: "#3B82F6" },
  liability: { label: "Liability", icon: "credit-card", color: "#F59E0B" },
};

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  // Also opened as the "categories-modal" sheet from the transaction sheet.
  // On iOS anything pushed from there (the strip's Upgrade / bell) would land
  // underneath both sheets, so the strip is left out.
  const route = useRoute();
  const showBrandStrip = !(Platform.OS === "ios" && route.name === "categories-modal");

  const [activeTab, setActiveTab] = useState<CategoryType>("income");
  const [pullRefreshing, setPullRefreshing] = useState(false);
  // iOS: Paper's dialogs stay centred behind the keyboard, so they are lifted
  // above it (Android pans the window instead).
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "ios") return undefined;
    const show = Keyboard.addListener("keyboardWillShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardWillHide", () =>
      setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const [modalVisible, setModalVisible] = useState(false);
  const [subcategoryModalVisible, setSubcategoryModalVisible] = useState(false);
  const [selectedParentCategory, setSelectedParentCategory] =
    useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    item: Category | Subcategory;
    isSubcategory: boolean;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "income" as CategoryType,
    color: "#10B981",
    is_active: true,
  });
  const [subcategoryFormData, setSubcategoryFormData] = useState({
    name: "",
    color: "#10B981",
    is_active: true,
  });
  // Tapping a category / subcategory row opens this sheet (QA AE-107): edit
  // the user's own rows, read-only details for defaults.
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    icon: "",
    color: "",
    is_active: true,
  });

  const {
    data: categories,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["categories", "tree"],
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
      if (!result.success) throw new Error(apiErrorMessage(result));
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      closeModal();
      toast.success("Category created");
    },
    onError: (error: Error) => toast.error(error.message || "Could not save category"),
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: async ({
      parentId,
      data,
    }: {
      parentId: number;
      data: typeof subcategoryFormData;
    }) => {
      const result = await categoryService.createSubcategory({
        name: data.name,
        category_id: parentId,
        color: data.color,
        is_active: data.is_active ? 1 : 0,
      });
      if (!result.success) throw new Error(apiErrorMessage(result));
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      closeSubcategoryModal();
      toast.success("Subcategory created");
    },
    onError: (error: Error) => toast.error(error.message || "Could not save subcategory"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async ({
      id,
      isSubcategory,
    }: {
      id: number;
      isSubcategory: boolean;
    }) => {
      const result = isSubcategory
        ? await categoryService.deleteSubcategory(id)
        : await categoryService.delete(id);
      if (!result.success) throw new Error(apiErrorMessage(result));
      return result;
    },
    onSuccess: (_result, variables) => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(variables.isSubcategory ? "Subcategory deleted" : "Category deleted");
    },
    onError: (error: Error) => {
      setDeleteTarget(null);
      toast.error(error.message || "Could not delete category");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      target,
      data,
    }: {
      target: EditTarget;
      data: typeof editForm;
    }) => {
      const name = data.name.trim();
      const result =
        target.kind === "category"
          ? await categoryService.update(target.item.id, {
              name,
              icon: data.icon || undefined,
              color: data.color || undefined,
              is_active: data.is_active,
            })
          : await categoryService.updateSubcategory(target.item.id, {
              name,
              is_active: data.is_active,
            });
      if (!result.success) throw new Error(apiErrorMessage(result));
      return result;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditTarget(null);
      toast.success(
        variables.target.kind === "category"
          ? "Category saved"
          : "Subcategory saved",
      );
    },
    onError: (error: Error) =>
      toast.error(error.message || "Could not save changes"),
  });

  const openEdit = (target: EditTarget) => {
    const color =
      target.kind === "category"
        ? target.item.color || typeConfig[target.item.type].color
        : target.item.color ||
          target.parent.color ||
          typeConfig[target.parent.type].color;
    setEditForm({
      name: target.item.name,
      icon: target.kind === "category" ? target.item.icon || "" : "",
      color,
      is_active: target.item.is_active !== false,
    });
    setEditTarget(target);
  };

  const closeEdit = () => setEditTarget(null);

  const editIsOwn = editTarget
    ? editTarget.kind === "category"
      ? !editTarget.item.is_default
      : isOwnSubcategory(editTarget.item)
    : false;

  const handleSaveEdit = () => {
    if (!editTarget || updateMutation.isPending) return;
    if (!editForm.name.trim()) {
      toast.error(
        editTarget.kind === "category"
          ? "Please enter a category name"
          : "Please enter a subcategory name",
      );
      return;
    }
    updateMutation.mutate({ target: editTarget, data: editForm });
  };

  const handleDeleteFromEdit = () => {
    if (!editTarget) return;
    const target = editTarget;
    setEditTarget(null);
    handleDelete(target.item, target.kind === "subcategory");
  };

  const openModal = (type?: CategoryType) => {
    setFormData({
      name: "",
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
      name: "",
      color: parentCategory.color || typeConfig[parentCategory.type].color,
      is_active: true,
    });
    setSubcategoryModalVisible(true);
  };

  const closeSubcategoryModal = () => {
    setSubcategoryModalVisible(false);
    setSelectedParentCategory(null);
  };

  // Only a pull shows the spinner; background refetches after a save would
  // otherwise pop it open (and shift the list) on iOS.
  const handlePullRefresh = async () => {
    setPullRefreshing(true);
    try {
      await refetch();
    } finally {
      setPullRefreshing(false);
    }
  };

  const dialogStyle =
    keyboardHeight > 0
      ? { marginBottom: Math.max(insets.bottom, keyboardHeight) }
      : undefined;

  // While typing, a tap on the dimmed backdrop only hides the keyboard
  // instead of closing the dialog and losing the name.
  const dismissKeyboardOr = (close: () => void) => () =>
    keyboardHeight > 0 ? Keyboard.dismiss() : close();

  const handleSaveCategory = () => {
    if (createCategoryMutation.isPending) return;
    if (!formData.name.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    createCategoryMutation.mutate(formData);
  };

  const handleSaveSubcategory = () => {
    if (createSubcategoryMutation.isPending) return;
    if (!subcategoryFormData.name.trim()) {
      toast.error("Please enter a subcategory name");
      return;
    }
    if (!selectedParentCategory) return;
    createSubcategoryMutation.mutate({
      parentId: selectedParentCategory.id,
      data: subcategoryFormData,
    });
  };

  const handleDelete = (
    item: Category | Subcategory,
    isSubcategory: boolean,
  ) => {
    if ((item as Category).is_default) {
      toast.error("Default categories cannot be deleted");
      return;
    }
    setDeleteTarget({ item, isSubcategory });
  };

  const deleteItemType = deleteTarget?.isSubcategory ? "subcategory" : "category";
  const deleteSubcatCount = deleteTarget?.isSubcategory
    ? 0
    : (deleteTarget?.item as Category | undefined)?.subcategories?.length || 0;

  // Calculate stats
  const viewCategories: Category[] = categories || [];
  const totalCategories = viewCategories.length;
  const totalSubcategories = viewCategories.reduce(
    (sum, cat) => sum + (cat.subcategories?.length || 0),
    0,
  );
  const incomeCount = viewCategories.filter((c) => c.type === "income").length;
  const expenseCount = viewCategories.filter(
    (c) => c.type === "expense",
  ).length;
  const assetCount = viewCategories.filter((c) => c.type === "asset").length;
  const liabilityCount = viewCategories.filter(
    (c) => c.type === "liability",
  ).length;

  // Filter categories by active tab
  const filteredCategories = viewCategories.filter((c) => c.type === activeTab);

  const getTypeColor = (type: CategoryType) =>
    typeConfig[type]?.color || colors.primary;

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    // Own portal host: when this screen is presented as a native sheet, the
    // app-level host sits underneath it on iOS and the dialogs would be hidden.
    <Portal.Host>
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {showBrandStrip && <BrandStrip />}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={handlePullRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
      <BrandedHeader
        title="Categories"
        subtitle="Organize income, expenses, assets, and liabilities"
        showBack
        showBrand={false}
        inset={false}
      />

      {/* Stats Section */}
      <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
        <View style={styles.statItem}>
          <Text
            variant="titleMedium"
            style={{ color: colors.onSurface, fontWeight: "bold" }}
          >
            {totalCategories}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
            Categories
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text
            variant="titleMedium"
            style={{ color: colors.onSurface, fontWeight: "bold" }}
          >
            {totalSubcategories}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
            Subcategories
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text
            variant="titleMedium"
            style={{ color: "#10B981", fontWeight: "bold" }}
          >
            {incomeCount}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
            Income
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text
            variant="titleMedium"
            style={{ color: "#EF4444", fontWeight: "bold" }}
          >
            {expenseCount}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
            Expense
          </Text>
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
                color={isActive ? "#fff" : colors.onSurfaceVariant}
              />
              <Text
                style={{
                  color: isActive ? "#fff" : colors.onSurface,
                  fontWeight: "600",
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
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.25)"
                      : colors.surfaceVariant,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isActive ? "#fff" : colors.onSurfaceVariant,
                    fontSize: 11,
                    fontWeight: "600",
                  }}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.scrollContent}>
        {/* Tab Header */}
        <View style={styles.tabHeader}>
          <View>
            <Text variant="titleMedium" style={{ color: colors.onSurface }}>
              {typeConfig[activeTab].label} Categories
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: colors.onSurfaceVariant }}
            >
              {pluralize(filteredCategories.length, "category", "categories")}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: getTypeColor(activeTab) },
            ]}
            onPress={() => openModal(activeTab)}
          >
            <MaterialCommunityIcons name="plus" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "600", marginLeft: 4 }}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <Surface
              key={category.id}
              style={[styles.categoryCard, { backgroundColor: colors.surface }]}
              elevation={1}
            >
              {/* The row layout sits on an inner View: Android drops a
                  Pressable's flex-row layout when its style is a function. */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => openEdit({ kind: "category", item: category })}
                onLongPress={() =>
                  openEdit({ kind: "category", item: category })
                }
                accessibilityRole="button"
                accessibilityLabel={`${category.name}, ${
                  category.is_default ? "default category" : "edit category"
                }`}
              >
                <View style={styles.categoryHeader}>
                  <View
                    style={[
                      styles.categoryColor,
                      {
                        backgroundColor:
                          category.color || getTypeColor(category.type),
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.categoryIcon,
                      {
                        backgroundColor: `${category.color || getTypeColor(category.type)}15`,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={categoryIconName(category.icon) as any}
                      size={20}
                      color={category.color || getTypeColor(category.type)}
                    />
                  </View>
                  <View style={styles.categoryInfo}>
                    {/* Up to two lines, wrapped between words, so a long name
                        is never split in the middle of a word. */}
                    <Text
                      variant="titleMedium"
                      style={{ color: colors.onSurface }}
                      numberOfLines={2}
                      textBreakStrategy="simple"
                    >
                      {category.name}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.onSurfaceVariant }}
                      numberOfLines={1}
                    >
                      {[
                        category.is_default ? "Default" : null,
                        category.subcategories &&
                        category.subcategories.length > 0
                          ? pluralize(
                              category.subcategories.length,
                              "subcategory",
                              "subcategories",
                            )
                          : "No subcategories",
                        category.is_active === false ? "Inactive" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: `${colors.primary}15` },
                      ]}
                      onPress={() => openSubcategoryModal(category)}
                      accessibilityLabel={`Add a subcategory to ${category.name}`}
                      hitSlop={6}
                    >
                      <MaterialCommunityIcons
                        name="plus"
                        size={18}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    <MaterialCommunityIcons
                      name={
                        category.is_default ? "lock-outline" : "chevron-right"
                      }
                      size={18}
                      color={colors.onSurfaceVariant}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Subcategories */}
              {category.subcategories &&
                category.subcategories.length > 0 && (
                  <View
                    style={[
                      styles.subcategoriesContainer,
                      { borderTopColor: colors.surfaceVariant },
                    ]}
                  >
                    {category.subcategories.map((sub, index) => (
                      <TouchableOpacity
                        key={sub.id}
                        activeOpacity={0.7}
                        onPress={() =>
                          openEdit({
                            kind: "subcategory",
                            item: sub,
                            parent: category,
                          })
                        }
                        onLongPress={() =>
                          openEdit({
                            kind: "subcategory",
                            item: sub,
                            parent: category,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={sub.name}
                      >
                        <View
                          style={[
                            styles.subcategoryItem,
                            { borderBottomColor: colors.surfaceVariant },
                            index === category.subcategories!.length - 1 && {
                              borderBottomWidth: 0,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.subcategoryColor,
                              {
                                backgroundColor:
                                  sub.color ||
                                  category.color ||
                                  getTypeColor(category.type),
                              },
                            ]}
                          />
                          <Text
                            variant="bodyMedium"
                            style={{ color: colors.onSurface, flex: 1 }}
                            numberOfLines={2}
                            textBreakStrategy="simple"
                          >
                            {sub.name}
                            {sub.is_active === false ? (
                              <Text
                                variant="bodySmall"
                                style={{ color: colors.onSurfaceVariant }}
                              >
                                {"  · Inactive"}
                              </Text>
                            ) : null}
                          </Text>
                          <MaterialCommunityIcons
                            name={
                              isOwnSubcategory(sub)
                                ? "chevron-right"
                                : "lock-outline"
                            }
                            size={16}
                            color={colors.onSurfaceVariant}
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
            </Surface>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name={(typeConfig[activeTab]?.icon || "folder") as any}
              size={64}
              color={colors.onSurfaceVariant}
            />
            <Text
              variant="bodyLarge"
              style={{ color: colors.onSurfaceVariant, marginTop: 16 }}
            >
              No {typeConfig[activeTab].label.toLowerCase()} categories yet
            </Text>
            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: getTypeColor(activeTab) },
              ]}
              onPress={() => openModal(activeTab)}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", marginLeft: 4 }}>
                Create First {typeConfig[activeTab].label}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={[
          styles.fab,
          { backgroundColor: getTypeColor(activeTab), bottom: 16 + insets.bottom },
        ]}
        color="#fff"
        onPress={() => openModal()}
      />

      {/* Create Category Modal */}
      <Portal>
        <DialogModal
          visible={modalVisible}
          onDismiss={dismissKeyboardOr(closeModal)}
          style={dialogStyle}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: colors.surface },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text
              variant="titleLarge"
              style={{ color: colors.onSurface, marginBottom: 16 }}
            >
              Create New Category
            </Text>

            <TextInput
              label="Category Name *"
              defaultValue={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              mode="outlined"
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleSaveCategory}
            />

            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}
            >
              Type
            </Text>
            <View style={styles.typeButtons}>
              {(Object.keys(typeConfig) as CategoryType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor:
                        formData.type === type
                          ? `${typeConfig[type].color}20`
                          : colors.surfaceVariant,
                      borderColor:
                        formData.type === type
                          ? typeConfig[type].color
                          : "transparent",
                    },
                  ]}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      type,
                      color: typeConfig[type].color,
                    })
                  }
                >
                  <MaterialCommunityIcons
                    name={typeConfig[type].icon as any}
                    size={16}
                    color={
                      formData.type === type
                        ? typeConfig[type].color
                        : colors.onSurfaceVariant
                    }
                  />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={{
                      flexShrink: 1,
                      color:
                        formData.type === type
                          ? typeConfig[type].color
                          : colors.onSurfaceVariant,
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
              <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                Active
              </Text>
              <Switch
                value={formData.is_active}
                onValueChange={(value) =>
                  setFormData({ ...formData, is_active: value })
                }
              />
            </View>

            <View style={styles.modalButtons}>
              <Button mode="text" onPress={closeModal}>
                Cancel
              </Button>
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
        </DialogModal>
      </Portal>

      {/* Create Subcategory Modal */}
      <Portal>
        <DialogModal
          visible={subcategoryModalVisible}
          onDismiss={dismissKeyboardOr(closeSubcategoryModal)}
          style={dialogStyle}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text
            variant="titleLarge"
            style={{ color: colors.onSurface, marginBottom: 4 }}
          >
            Create Subcategory
          </Text>
          {selectedParentCategory && (
            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, marginBottom: 16 }}
            >
              Under: {selectedParentCategory.name}
            </Text>
          )}

          <TextInput
            label="Subcategory Name *"
            value={subcategoryFormData.name}
            onChangeText={(text) =>
              setSubcategoryFormData({ ...subcategoryFormData, name: text })
            }
            mode="outlined"
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={handleSaveSubcategory}
          />

          <View style={styles.switchRow}>
            <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
              Active
            </Text>
            <Switch
              value={subcategoryFormData.is_active}
              onValueChange={(value) =>
                setSubcategoryFormData({
                  ...subcategoryFormData,
                  is_active: value,
                })
              }
            />
          </View>

          <View style={styles.modalButtons}>
            <Button mode="text" onPress={closeSubcategoryModal}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveSubcategory}
              loading={createSubcategoryMutation.isPending}
            >
              Create
            </Button>
          </View>
        </DialogModal>
      </Portal>

      {/* Edit / details sheet (tap a category or subcategory row) */}
      <Portal>
        <DialogModal
          visible={!!editTarget}
          onDismiss={dismissKeyboardOr(closeEdit)}
          style={dialogStyle}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: colors.surface },
          ]}
        >
          {editTarget && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.editHeader}>
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: `${editForm.color}15` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      categoryIconName(
                        editTarget.kind === "category"
                          ? editForm.icon
                          : editTarget.parent.icon,
                      ) as any
                    }
                    size={20}
                    color={editForm.color}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    variant="titleLarge"
                    style={{ color: colors.onSurface }}
                    numberOfLines={2}
                    textBreakStrategy="simple"
                  >
                    {editIsOwn
                      ? editTarget.kind === "category"
                        ? "Edit category"
                        : "Edit subcategory"
                      : editTarget.item.name}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.onSurfaceVariant }}
                    numberOfLines={2}
                  >
                    {editTarget.kind === "category"
                      ? `${typeConfig[editTarget.item.type].label} category`
                      : `Subcategory of ${editTarget.parent.name}`}
                  </Text>
                </View>
              </View>

              {editIsOwn ? (
                <>
                  <TextInput
                    label={
                      editTarget.kind === "category"
                        ? "Category name *"
                        : "Subcategory name *"
                    }
                    value={editForm.name}
                    onChangeText={(text) =>
                      setEditForm((prev) => ({ ...prev, name: text }))
                    }
                    mode="outlined"
                    style={styles.input}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveEdit}
                  />

                  {editTarget.kind === "category" && (
                    <>
                      <Text
                        variant="bodyMedium"
                        style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}
                      >
                        Icon
                      </Text>
                      <View style={styles.iconGrid}>
                        {CATEGORY_ICON_CHOICES.map((choice) => {
                          const glyph = categoryIconName(choice);
                          const selected =
                            categoryIconName(editForm.icon) === glyph;
                          return (
                            <TouchableOpacity
                              key={choice}
                              onPress={() =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  icon: choice,
                                }))
                              }
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              accessibilityLabel={`Icon ${choice.replace(/-/g, " ")}`}
                            >
                              <View
                                style={[
                                  styles.iconChoice,
                                  {
                                    backgroundColor: selected
                                      ? `${editForm.color}22`
                                      : colors.surfaceVariant,
                                    borderColor: selected
                                      ? editForm.color
                                      : "transparent",
                                  },
                                ]}
                              >
                                <MaterialCommunityIcons
                                  name={glyph as any}
                                  size={20}
                                  color={
                                    selected
                                      ? editForm.color
                                      : colors.onSurfaceVariant
                                  }
                                />
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <Text
                        variant="bodyMedium"
                        style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}
                      >
                        Colour
                      </Text>
                      <View style={styles.colorGrid}>
                        {COLOR_CHOICES.map((choice) => {
                          const selected =
                            editForm.color.toLowerCase() ===
                            choice.toLowerCase();
                          return (
                            <TouchableOpacity
                              key={choice}
                              onPress={() =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  color: choice,
                                }))
                              }
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              accessibilityLabel={`Colour ${choice}`}
                            >
                              <View
                                style={[
                                  styles.colorChoice,
                                  {
                                    backgroundColor: choice,
                                    borderColor: selected
                                      ? colors.onSurface
                                      : "transparent",
                                  },
                                ]}
                              >
                                {selected && (
                                  <MaterialCommunityIcons
                                    name="check"
                                    size={16}
                                    color="#fff"
                                  />
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}

                  <View style={styles.switchRow}>
                    <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                      Active
                    </Text>
                    <Switch
                      value={editForm.is_active}
                      onValueChange={(value) =>
                        setEditForm((prev) => ({ ...prev, is_active: value }))
                      }
                    />
                  </View>

                  <View style={styles.editFooter}>
                    <Button
                      mode="text"
                      icon="delete-outline"
                      textColor={colors.error}
                      onPress={handleDeleteFromEdit}
                      disabled={updateMutation.isPending}
                    >
                      Delete
                    </Button>
                    <View style={styles.editFooterRight}>
                      <Button mode="text" onPress={closeEdit}>
                        Cancel
                      </Button>
                      <Button
                        mode="contained"
                        onPress={handleSaveEdit}
                        loading={updateMutation.isPending}
                        disabled={updateMutation.isPending}
                        buttonColor={
                          editTarget.kind === "category"
                            ? typeConfig[editTarget.item.type].color
                            : typeConfig[editTarget.parent.type].color
                        }
                      >
                        Save changes
                      </Button>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View
                    style={[
                      styles.noteBox,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="lock-outline"
                      size={18}
                      color={colors.onSurfaceVariant}
                    />
                    <Text
                      variant="bodyMedium"
                      style={{ color: colors.onSurfaceVariant, flex: 1 }}
                    >
                      {editTarget.kind === "category"
                        ? "This is a default category shared by everyone, so it can't be renamed or deleted. You can still add your own subcategories to it."
                        : "This is a default subcategory, so it can't be renamed or deleted."}
                    </Text>
                  </View>
                  <View style={styles.modalButtons}>
                    {editTarget.kind === "category" && (
                      <Button
                        mode="text"
                        onPress={() => {
                          const parent = editTarget.item;
                          setEditTarget(null);
                          openSubcategoryModal(parent);
                        }}
                      >
                        Add subcategory
                      </Button>
                    )}
                    <Button mode="contained" onPress={closeEdit}>
                      Close
                    </Button>
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </DialogModal>
      </Portal>

      <ConfirmDialog
        visible={!!deleteTarget}
        title={`Delete ${deleteItemType}?`}
        message={
          `"${deleteTarget?.item.name ?? ""}" will be permanently removed.` +
          (deleteSubcatCount > 0
            ? ` Its ${deleteSubcatCount} subcategor${deleteSubcatCount === 1 ? "y" : "ies"} will be deleted too.`
            : "") +
          " This action cannot be undone."
        }
        icon={TriangleAlert}
        confirmLabel="Delete"
        loading={deleteCategoryMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget &&
          deleteCategoryMutation.mutate({
            id: deleteTarget.item.id,
            isSubcategory: deleteTarget.isSubcategory,
          })
        }
      />
    </SafeAreaView>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontWeight: "bold",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
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
    alignItems: "center",
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  categoryCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    padding: 8,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  subcategoriesContainer: {
    marginLeft: 56,
    borderTopWidth: 1,
  },
  subcategoryItem: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    paddingVertical: 64,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: "80%",
  },
  input: {
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  iconChoice: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  colorChoice: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  editFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  editFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
