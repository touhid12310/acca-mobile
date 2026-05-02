import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
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
} from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TriangleAlert } from "lucide-react-native";

import { useTheme } from "../src/contexts/ThemeContext";
import { useCurrency } from "../src/contexts/CurrencyContext";
import { useToast } from "../src/contexts/NotificationContext";
import { BrandedHeader } from "../src/components";
import { ConfirmDialog } from "../src/components/ui";
import scheduleService from "../src/services/scheduleService";
import categoryService from "../src/services/categoryService";
import DateField from "../src/components/common/DateField";
import { Schedule } from "../src/types";

// Helper function to extract detailed validation errors from API response
const formatApiError = (result: any): string => {
  const errorData = result.data;
  let errorMsg = errorData?.message || result.error || "Request failed";

  // Check for Laravel validation errors
  const validationErrors = errorData?.errors;
  if (validationErrors && typeof validationErrors === "object") {
    const errorDetails = Object.entries(validationErrors)
      .map(
        ([field, msgs]) =>
          `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`,
      )
      .join("\n");
    if (errorDetails) {
      errorMsg = `${errorMsg}\n\n${errorDetails}`;
    }
  }

  return errorMsg;
};

const frequencyOptions = ["Weekly", "Monthly", "Quarterly", "Yearly"];

// Helper to unwrap API response
const unwrap = (response: any): any[] => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.data?.data)) return response.data.data.data;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

export default function SchedulesScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [modalVisible, setModalVisible] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [formData, setFormData] = useState({
    vendor: "",
    amount: "",
    type: "expense" as "income" | "expense",
    frequency: "Monthly" as string,
    next_due_date: new Date().toISOString().split("T")[0],
    notes: "",
    category_id: "",
    subcategory_id: "",
  });
  const isEditing = editingId !== null;

  const {
    data: schedules,
    isLoading,
    refetch,
    isRefetching,
    error,
  } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      try {
        const result = await scheduleService.getAll();

        if (result.success && result.data) {
          const responseData = result.data as any;

          let schedulesArray: any[] = [];

          if (responseData?.data?.current_page !== undefined) {
            schedulesArray = responseData.data.data || [];
          } else if (Array.isArray(responseData?.data)) {
            schedulesArray = responseData.data;
          } else if (Array.isArray(responseData)) {
            schedulesArray = responseData;
          }

          return schedulesArray;
        }

        return [];
      } catch (err) {
        return [];
      }
    },
  });

  // Fetch categories for selection
  const { data: categories } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: async () => {
      const result = await categoryService.getForTransaction();
      if (result.success && result.data) {
        return unwrap(result.data);
      }
      return [];
    },
  });

  const viewCategories = Array.isArray(categories) ? categories : [];
  const typedCategories = useMemo(
    () => viewCategories.filter((c: any) => c?.type === formData.type),
    [viewCategories, formData.type],
  );
  const filteredCategories = useMemo(() => {
    const query = categorySearchQuery.trim().toLowerCase();
    if (!query) return typedCategories;
    return typedCategories
      .map((category: any) => {
        const nameMatches = String(category?.name || "")
          .toLowerCase()
          .includes(query);
        const subs = Array.isArray(category?.subcategories)
          ? category.subcategories
          : [];
        const matchingSubs = subs.filter((sub: any) =>
          String(sub?.name || "")
            .toLowerCase()
            .includes(query),
        );
        if (nameMatches) return category;
        if (matchingSubs.length > 0) {
          return { ...category, subcategories: matchingSubs };
        }
        return null;
      })
      .filter(Boolean);
  }, [typedCategories, categorySearchQuery]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await scheduleService.create({
        vendor: data.vendor,
        contact_name: data.vendor,
        amount: parseFloat(data.amount) || 0,
        type: data.type,
        frequency: data.frequency,
        next_due_date:
          data.next_due_date || new Date().toISOString().split("T")[0],
        notes: data.notes,
        category_id: data.category_id ? parseInt(data.category_id) : undefined,
        subcategory_id: data.subcategory_id
          ? parseInt(data.subcategory_id)
          : undefined,
        status: "scheduled",
      } as any);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      closeModal();
      const date = variables.next_due_date
        ? new Date(variables.next_due_date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null;
      toast.success(date ? `Schedule saved — next on ${date}` : "Schedule saved");
    },
    onError: (error: Error) => toast.error(error.message || "Could not save schedule"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: typeof formData;
    }) => {
      const result = await scheduleService.update(id, {
        vendor: data.vendor,
        contact_name: data.vendor,
        amount: parseFloat(data.amount) || 0,
        type: data.type,
        frequency: data.frequency,
        next_due_date:
          data.next_due_date || new Date().toISOString().split("T")[0],
        notes: data.notes,
        category_id: data.category_id ? parseInt(data.category_id) : null,
        subcategory_id: data.subcategory_id
          ? parseInt(data.subcategory_id)
          : null,
      } as any);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      closeModal();
      toast.success("Schedule updated");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Could not update schedule"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await scheduleService.delete(id);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Schedule deleted");
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete schedule"),
  });

  // Inline-create a category from the picker search
  const createInlineCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = String(name || "").trim();
      if (!trimmed) throw new Error("Please type a category name");
      const result = await categoryService.create({
        name: trimmed,
        type: formData.type,
        is_active: 1,
      } as any);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: async (result) => {
      const created: any = (result as any)?.data?.data || (result as any)?.data || {};
      await queryClient.invalidateQueries({ queryKey: ["categories", "all"] });
      if (created?.id) {
        setFormData((prev) => ({
          ...prev,
          category_id: String(created.id),
          subcategory_id: "",
        }));
      }
      setCategorySearchQuery("");
      setShowCategoryPicker(false);
      toast.success(`Category "${created?.name || "new"}" created`);
    },
    onError: (err: Error) =>
      toast.error(err?.message || "Could not create category"),
  });

  const openModal = () => {
    setEditingId(null);
    setFormData({
      vendor: "",
      amount: "",
      type: "expense",
      frequency: "Monthly",
      next_due_date: new Date().toISOString().split("T")[0],
      notes: "",
      category_id: "",
      subcategory_id: "",
    });
    setShowCategoryPicker(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setShowCategoryPicker(false);
    setEditingId(null);
    setCategorySearchQuery("");
  };

  const handleSave = () => {
    if (!formData.vendor.trim()) {
      toast.error("Please enter a vendor name");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (isEditing && editingId !== null) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const showScheduleActions = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowActionSheet(true);
  };

  const toDateInputValue = (value?: string) => {
    if (!value) return new Date().toISOString().split("T")[0];
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) return new Date().toISOString().split("T")[0];
    return date.toISOString().split("T")[0];
  };

  const handleEditPress = () => {
    if (!selectedSchedule) return;
    const schedule = selectedSchedule;
    setShowActionSheet(false);
    setEditingId(schedule.id);
    setFormData({
      vendor: schedule.contact_name || schedule.vendor || "",
      amount:
        schedule.amount !== undefined && schedule.amount !== null
          ? String(schedule.amount)
          : "",
      type: (String(schedule.type || "expense").toLowerCase() === "income"
        ? "income"
        : "expense") as "income" | "expense",
      frequency: schedule.frequency || "Monthly",
      next_due_date: toDateInputValue(schedule.next_due_date),
      notes: schedule.notes || "",
      category_id: schedule.category_id ? String(schedule.category_id) : "",
      subcategory_id: schedule.subcategory_id
        ? String(schedule.subcategory_id)
        : "",
    });
    setShowCategoryPicker(false);
    setTimeout(() => setModalVisible(true), 200);
  };

  const handleDeletePress = () => {
    setShowActionSheet(false);
    setTimeout(() => setShowDeleteConfirm(true), 200);
  };

  const handleConfirmDelete = () => {
    if (selectedSchedule) {
      deleteMutation.mutate(selectedSchedule.id);
    }
    setShowDeleteConfirm(false);
    setSelectedSchedule(null);
  };

  const closeActionSheet = () => {
    setShowActionSheet(false);
    setSelectedSchedule(null);
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
    if (daysUntil <= 3) return "#F59E0B";
    if (daysUntil <= 7) return colors.primary;
    return colors.tertiary;
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return colors.tertiary;
      case "scheduled":
        return colors.primary;
      case "overdue":
        return colors.error;
      default:
        return colors.onSurfaceVariant;
    }
  };

  const getCategoryName = (
    categoryId?: number | string,
    subcategoryId?: number | string,
  ) => {
    if (!categoryId) return null;
    const category: any = viewCategories.find(
      (c: any) => c.id === Number(categoryId),
    );
    if (!category) return null;
    if (!subcategoryId) return category.name;
    const sub = (Array.isArray(category.subcategories)
      ? category.subcategories
      : []
    ).find((s: any) => Number(s.id) === Number(subcategoryId));
    return sub ? `${category.name} › ${sub.name}` : category.name;
  };

  const getSelectedCategoryName = () => {
    if (!formData.category_id) return "";
    const cat = filteredCategories.find(
      (c: any) => String(c.id) === String(formData.category_id),
    );
    if (!cat) return "";
    if (!formData.subcategory_id) return cat.name;
    const sub = (Array.isArray(cat.subcategories) ? cat.subcategories : []).find(
      (s: any) => String(s.id) === String(formData.subcategory_id),
    );
    return sub ? `${cat.name} › ${sub.name}` : cat.name;
  };

  const formatDisplayDate = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate stats
  const viewSchedules = Array.isArray(schedules) ? schedules : [];

  const totalRepeatingSchedules = viewSchedules.reduce(
    (sum: number, s: Schedule) => sum + (parseFloat(String(s.amount)) || 0),
    0,
  );

  const statsFrequencyLabel = useMemo(() => {
    const normalizedFrequencies = new Set(
      viewSchedules
        .map((schedule: Schedule) =>
          String(schedule.frequency || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    );

    if (normalizedFrequencies.size === 1) {
      const [onlyFrequency] = Array.from(normalizedFrequencies);
      return `${onlyFrequency.charAt(0).toUpperCase()}${onlyFrequency.slice(1)} Repeats`;
    }

    return "All Frequency Repeats";
  }, [viewSchedules]);

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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <BrandedHeader
        title="Repeating Transactions"
        subtitle="Schedule recurring money movement"
        showBack
      />

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
        <Surface
          style={[
            styles.statsCard,
            { backgroundColor: colors.primaryContainer },
          ]}
          elevation={1}
        >
          <View style={styles.statsContent}>
            <View
              style={[
                styles.statsIcon,
                { backgroundColor: `${colors.primary}20` },
              ]}
            >
              <MaterialCommunityIcons
                name="repeat"
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.statsText}>
              <Text variant="labelMedium" style={{ color: colors.primary }}>
                {statsFrequencyLabel}
              </Text>
              <Text
                variant="headlineSmall"
                style={{ color: colors.primary, fontWeight: "bold" }}
              >
                {formatAmount(totalRepeatingSchedules)}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.primary }}>
                {viewSchedules.length} schedules
              </Text>
            </View>
          </View>
        </Surface>

        {/* Schedules List */}
        {viewSchedules.length > 0 ? (
          viewSchedules.map((schedule: Schedule) => {
            const dueDate = schedule.next_due_date;
            const daysUntil = getDaysUntilDue(dueDate);
            const statusColor = getDueStatusColor(daysUntil);
            const scheduleName = schedule.contact_name || schedule.vendor || "Unnamed Schedule";
            const categoryName = getCategoryName(
              schedule.category_id,
              schedule.subcategory_id,
            );
            const status = schedule.status || "scheduled";
            const scheduleType = String(schedule.type || "expense").toLowerCase();
            const scheduleTypeColor =
              scheduleType === "income" ? colors.tertiary : colors.error;
            const scheduleAmount = parseFloat(String(schedule.amount)) || 0;

            return (
              <Surface
                key={schedule.id}
                style={[styles.scheduleCard, { backgroundColor: colors.surface }]}
                elevation={1}
              >
                <TouchableOpacity onLongPress={() => showScheduleActions(schedule)}>
                  <View style={styles.scheduleHeader}>
                    <View
                      style={[
                        styles.scheduleIcon,
                        { backgroundColor: `${statusColor}15` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="repeat"
                        size={24}
                        color={statusColor}
                      />
                    </View>
                    <View style={styles.scheduleInfo}>
                      <View style={styles.scheduleTitleRow}>
                        <Text
                          variant="titleMedium"
                          style={{ color: colors.onSurface, flex: 1 }}
                          numberOfLines={1}
                        >
                          {scheduleName}
                        </Text>
                        <Text
                          variant="titleMedium"
                          style={{ color: colors.onSurface, fontWeight: "600" }}
                        >
                          {formatAmount(scheduleAmount)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => showScheduleActions(schedule)}
                          style={styles.menuButton}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <MaterialCommunityIcons
                            name="dots-vertical"
                            size={20}
                            color={colors.onSurfaceVariant}
                          />
                        </TouchableOpacity>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                          marginTop: 4,
                        }}
                      >
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: `${scheduleTypeColor}20` },
                          ]}
                        >
                          <Text style={{ color: scheduleTypeColor, fontSize: 11 }}>
                            {scheduleType.charAt(0).toUpperCase() +
                              scheduleType.slice(1)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: colors.surfaceVariant },
                          ]}
                        >
                          <Text
                            style={{
                              color: colors.onSurfaceVariant,
                              fontSize: 11,
                            }}
                          >
                            {schedule.frequency || "Monthly"}
                          </Text>
                        </View>
                        {categoryName && (
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: colors.primaryContainer },
                            ]}
                          >
                            <Text
                              style={{ color: colors.primary, fontSize: 11 }}
                            >
                              {categoryName}
                            </Text>
                          </View>
                        )}
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: `${getStatusColor(status)}20` },
                          ]}
                        >
                          <Text
                            style={{
                              color: getStatusColor(status),
                              fontSize: 11,
                            }}
                          >
                            {status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {schedule.notes && (
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.onSurfaceVariant, marginTop: 8 }}
                    >
                      {schedule.notes}
                    </Text>
                  )}

                  <View
                    style={[
                      styles.dueInfo,
                      { borderTopColor: colors.surfaceVariant },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="calendar"
                      size={16}
                      color={colors.onSurfaceVariant}
                    />
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.onSurfaceVariant, marginLeft: 4 }}
                    >
                      Next Due: {formatDisplayDate(dueDate)}
                    </Text>
                    {daysUntil !== null && (
                      <Text
                        variant="labelSmall"
                        style={{
                          color: statusColor,
                          marginLeft: "auto",
                          fontWeight: "600",
                        }}
                      >
                        {daysUntil < 0
                          ? `${Math.abs(daysUntil)} days overdue`
                          : daysUntil === 0
                            ? "Due today"
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
            <MaterialCommunityIcons
              name="repeat"
              size={64}
              color={colors.onSurfaceVariant}
            />
            <Text
              variant="bodyLarge"
              style={{ color: colors.onSurfaceVariant, marginTop: 16 }}
            >
              No repeating transactions yet
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, textAlign: "center" }}
            >
              Track your recurring transactions and never miss a payment
            </Text>
            <TouchableOpacity
              style={[
                styles.createFirstButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={openModal}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.createFirstButtonText}>
                Create Repeating Transactions
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: 16 + insets.bottom },
        ]}
        color={colors.onPrimary}
        onPress={openModal}
      />

      {/* Add Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
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
              {isEditing ? "Edit schedule" : "Repeating transaction"}
            </Text>

            <TextInput
              label="Vendor *"
              value={formData.vendor}
              onChangeText={(text) =>
                setFormData({ ...formData, vendor: text })
              }
              mode="outlined"
              placeholder="Netflix, Electricity, etc."
              style={styles.input}
            />

            <TextInput
              label="Amount *"
              value={formData.amount}
              onChangeText={(text) =>
                setFormData({ ...formData, amount: text })
              }
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}
            >
              Type
            </Text>
            <View style={styles.typeButtons}>
              {(["expense", "income"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor:
                        formData.type === type
                          ? colors.primaryContainer
                          : colors.surfaceVariant,
                      borderColor:
                        formData.type === type ? colors.primary : "transparent",
                    },
                  ]}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      type,
                      category_id: "",
                      subcategory_id: "",
                    })
                  }
                >
                  <Text
                    style={{
                      color:
                        formData.type === type
                          ? colors.primary
                          : colors.onSurfaceVariant,
                      fontWeight: formData.type === type ? "600" : "400",
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}
            >
              Frequency
            </Text>
            <View style={styles.frequencyButtons}>
              {frequencyOptions.map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyButton,
                    {
                      backgroundColor:
                        formData.frequency === freq
                          ? colors.primaryContainer
                          : colors.surfaceVariant,
                      borderColor:
                        formData.frequency === freq
                          ? colors.primary
                          : "transparent",
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, frequency: freq })}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color:
                        formData.frequency === freq
                          ? colors.primary
                          : colors.onSurfaceVariant,
                      fontWeight: formData.frequency === freq ? "600" : "400",
                      fontSize: 12,
                    }}
                  >
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category & Subcategory Selection */}
            <Text
              variant="bodyMedium"
              style={{
                color: colors.onSurfaceVariant,
                marginTop: 8,
                marginBottom: 8,
              }}
            >
              Category &amp; Subcategory
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  borderColor: colors.outline,
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text
                style={{
                  color: formData.category_id
                    ? colors.onSurface
                    : colors.onSurfaceVariant,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {formData.category_id
                  ? getSelectedCategoryName()
                  : "Select category..."}
              </Text>
              <MaterialCommunityIcons
                name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            {showCategoryPicker && (
              <Surface
                style={[
                  styles.dropdownList,
                  { backgroundColor: colors.surface },
                ]}
                elevation={2}
              >
                <View
                  style={[
                    styles.categorySearchWrap,
                    { borderBottomColor: colors.outline },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="magnify"
                    size={18}
                    color={colors.onSurfaceVariant}
                  />
                  <TextInput
                    value={categorySearchQuery}
                    onChangeText={setCategorySearchQuery}
                    placeholder="Search category or subcategory..."
                    placeholderTextColor={colors.onSurfaceVariant}
                    style={[
                      styles.categorySearchInput,
                      { color: colors.onSurface },
                    ]}
                    autoCorrect={false}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    dense
                  />
                </View>
                <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      !formData.category_id && {
                        backgroundColor: `${colors.primary}15`,
                      },
                    ]}
                    onPress={() => {
                      setFormData({
                        ...formData,
                        category_id: "",
                        subcategory_id: "",
                      });
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={{ color: colors.onSurfaceVariant }}>None</Text>
                  </TouchableOpacity>
                  {filteredCategories.length === 0 ? (
                    <View style={styles.categoryEmptyState}>
                      <Text
                        style={{
                          color: colors.onSurfaceVariant,
                          textAlign: "center",
                          fontSize: 13,
                        }}
                      >
                        {categorySearchQuery.trim()
                          ? `No category matches "${categorySearchQuery.trim()}"`
                          : `No ${formData.type} categories yet`}
                      </Text>
                      {categorySearchQuery.trim() ? (
                        <TouchableOpacity
                          style={[
                            styles.categoryCreateButton,
                            { borderColor: colors.primary },
                          ]}
                          disabled={createInlineCategoryMutation.isPending}
                          onPress={() =>
                            createInlineCategoryMutation.mutate(
                              categorySearchQuery,
                            )
                          }
                        >
                          <MaterialCommunityIcons
                            name="plus"
                            size={16}
                            color={colors.primary}
                          />
                          <Text
                            style={{
                              color: colors.primary,
                              fontWeight: "600",
                              marginLeft: 4,
                              fontSize: 13,
                            }}
                          >
                            {createInlineCategoryMutation.isPending
                              ? "Creating…"
                              : `Create "${categorySearchQuery.trim()}"`}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.categoryCreateButton,
                            { borderColor: colors.primary },
                          ]}
                          onPress={() => {
                            setShowCategoryPicker(false);
                            router.push("/categories");
                          }}
                        >
                          <MaterialCommunityIcons
                            name="plus"
                            size={16}
                            color={colors.primary}
                          />
                          <Text
                            style={{
                              color: colors.primary,
                              fontWeight: "600",
                              marginLeft: 4,
                              fontSize: 13,
                            }}
                          >
                            Create your first category
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          setShowCategoryPicker(false);
                          router.push("/categories");
                        }}
                      >
                        <Text
                          style={{
                            color: colors.onSurfaceVariant,
                            fontSize: 12,
                            textDecorationLine: "underline",
                          }}
                        >
                          Manage categories →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    filteredCategories.map((cat: any) => {
                      const subs: any[] = Array.isArray(cat.subcategories)
                        ? cat.subcategories
                        : [];
                      const catSelected =
                        String(formData.category_id) === String(cat.id) &&
                        !formData.subcategory_id;
                      return (
                        <View key={cat.id}>
                          <TouchableOpacity
                            style={[
                              styles.dropdownItem,
                              catSelected && {
                                backgroundColor: `${colors.primary}15`,
                              },
                            ]}
                            onPress={() => {
                              setFormData({
                                ...formData,
                                category_id: String(cat.id),
                                subcategory_id: "",
                              });
                              setShowCategoryPicker(false);
                            }}
                          >
                            <Text
                              style={{
                                color: colors.onSurface,
                                fontWeight: "600",
                              }}
                            >
                              {cat.name}
                            </Text>
                            {catSelected && (
                              <MaterialCommunityIcons
                                name="check"
                                size={18}
                                color={colors.primary}
                              />
                            )}
                          </TouchableOpacity>
                          {subs.map((sub: any) => {
                            const subSelected =
                              String(formData.category_id) ===
                                String(cat.id) &&
                              String(formData.subcategory_id) ===
                                String(sub.id);
                            return (
                              <TouchableOpacity
                                key={sub.id}
                                style={[
                                  styles.dropdownItem,
                                  styles.subcategoryDropdownItem,
                                  subSelected && {
                                    backgroundColor: `${colors.primary}15`,
                                  },
                                ]}
                                onPress={() => {
                                  setFormData({
                                    ...formData,
                                    category_id: String(cat.id),
                                    subcategory_id: String(sub.id),
                                  });
                                  setShowCategoryPicker(false);
                                }}
                              >
                                <Text
                                  style={{
                                    color: colors.onSurfaceVariant,
                                    fontSize: 13,
                                  }}
                                >
                                  ›  {sub.name}
                                </Text>
                                {subSelected && (
                                  <MaterialCommunityIcons
                                    name="check"
                                    size={16}
                                    color={colors.primary}
                                  />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </Surface>
            )}

            <DateField
              label="Next Due Date"
              value={formData.next_due_date}
              onChange={(date) =>
                setFormData({ ...formData, next_due_date: date })
              }
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
              <Button mode="text" onPress={closeModal}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={createMutation.isPending || updateMutation.isPending}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEditing ? "Save changes" : "Save Repeating"}
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
          contentContainerStyle={[
            styles.actionSheetContainer,
            { backgroundColor: colors.surface },
          ]}
        >
          {selectedSchedule && (
            <>
              <View style={styles.actionSheetHeader}>
                <View
                  style={[
                    styles.actionSheetIcon,
                    { backgroundColor: `${colors.primary}20` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="repeat"
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.actionSheetInfo}>
                  <Text
                    variant="titleMedium"
                    style={{ color: colors.onSurface }}
                    numberOfLines={1}
                  >
                    {selectedSchedule.contact_name ||
                      selectedSchedule.vendor ||
                      "Unnamed Schedule"}
                  </Text>
                  <Text
                    variant="titleLarge"
                    style={{ color: colors.error, fontWeight: "bold" }}
                  >
                    {formatAmount(parseFloat(String(selectedSchedule.amount)) || 0)}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.onSurfaceVariant }}
                  >
                    {selectedSchedule.frequency || "Monthly"}
                  </Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 16 }} />

              <TouchableOpacity
                style={styles.actionSheetButton}
                onPress={handleEditPress}
              >
                <MaterialCommunityIcons
                  name="pencil"
                  size={24}
                  color={colors.primary}
                />
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.actionSheetButtonText,
                    { color: colors.onSurface },
                  ]}
                >
                  Edit Repeating transaction
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionSheetButton}
                onPress={handleDeletePress}
              >
                <MaterialCommunityIcons
                  name="delete"
                  size={24}
                  color={colors.error}
                />
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.actionSheetButtonText,
                    { color: colors.error },
                  ]}
                >
                  Delete Repeating transaction
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={colors.error}
                />
              </TouchableOpacity>

              <Button
                mode="outlined"
                onPress={closeActionSheet}
                style={styles.actionSheetCancel}
              >
                Cancel
              </Button>
            </>
          )}
        </Modal>
      </Portal>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete repeating transaction?"
        message="This action cannot be undone. The repeating transaction will be permanently removed."
        icon={TriangleAlert}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
      />
    </SafeAreaView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statsContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  statsText: {
    flex: 1,
  },
  scheduleCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  scheduleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  scheduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dueInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 64,
  },
  createFirstButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    minHeight: 44,
    marginTop: 20,
  },
  createFirstButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: 20,
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
    maxHeight: "70%",
  },
  input: {
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  frequencyButtons: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 6,
    marginBottom: 12,
  },
  frequencyButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 6,
  },
  subcategoryDropdownItem: {
    paddingLeft: 28,
    paddingVertical: 9,
  },
  categorySearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  categorySearchInput: {
    flex: 1,
    backgroundColor: "transparent",
    fontSize: 14,
    height: 38,
    paddingHorizontal: 0,
  },
  categoryEmptyState: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
    alignItems: "center",
  },
  categoryCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
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
    marginTop: "auto",
    borderRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  actionSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionSheetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionSheetInfo: {
    flex: 1,
  },
  actionSheetButton: {
    flexDirection: "row",
    alignItems: "center",
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
    textAlign: "center",
    marginTop: 16,
    fontWeight: "bold",
  },
  deleteConfirmText: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  deleteConfirmButtons: {
    flexDirection: "row",
    gap: 12,
  },
  deleteConfirmButton: {
    flex: 1,
    borderRadius: 12,
  },
});
