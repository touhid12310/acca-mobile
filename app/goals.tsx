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
  ProgressBar,
  Switch,
  Chip,
} from "react-native-paper";
import DialogModal from "../src/components/common/DialogModal";
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
import { BrandedHeader, BrandStrip } from "../src/components";
import { ConfirmDialog } from "../src/components/ui";
import goalService, { GoalRecord } from "../src/services/goalService";
import categoryService from "../src/services/categoryService";
import accountService from "../src/services/accountService";
import { invalidateMoneyQueries } from "../src/services/moneyQueries";
import DateField from "../src/components/common/DateField";
import { maybeAskForReview } from "../src/services/appReviewService";
import { PaperTextInput as TextInput } from "../src/components/ui/SafeTextInput";
import { apiErrorMessage } from "../src/utils/apiError";
import {
  formatDate,
  parseCalendarDate,
  toDateInputValue,
} from "../src/utils/date";
import { parseDecimalInput, toDecimalInput } from "../src/utils/number";

/**
 * Target dates arrive as UTC midnight; show that calendar day, not the local
 * time of the instant (a day early west of UTC).
 */
const formatCalendarDate = (value: string) =>
  formatDate(toDateInputValue(parseCalendarDate(value)));

// Plain words only: the field messages, never "Validation failed / field: …"
// (QA AE-108).
const formatApiError = (result: any): string => apiErrorMessage(result);

export default function GoalsScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [addAmountModalVisible, setAddAmountModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalRecord | null>(null);
  // The goal being edited, or null when the goal modal is creating one.
  const [editingGoal, setEditingGoal] = useState<GoalRecord | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<GoalRecord | null>(null);
  const [amountToAdd, setAmountToAdd] = useState("");
  // "Also move this money between my accounts" (QA AE-108): off, the
  // contribution only tracks progress; on, it is also a transfer.
  const [moveMoney, setMoveMoney] = useState(false);
  const [fromAccountId, setFromAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    target_amount: "",
    current_amount: "",
    target_date: "",
    category: "",
    description: "",
  });

  // Paper's Modal centres its sheet and ignores the keyboard, and iOS does not
  // pan the window the way Android's softwareKeyboardLayoutMode "pan" does.
  // The contribution sheet is lifted above the keyboard with this height.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
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

  const {
    data: goals,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const result = await goalService.getAll();
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData || [];
      }
      return [];
    },
  });

  // The category is picked from the user's own categories, the same list as
  // the web (QA AE-108 / AE-51) — savings (asset) first, since a goal is
  // money being put aside. A goal stores the category's name.
  const goalCategoriesKey = ["categories", "goal-picker"];
  const { data: categories } = useQuery({
    queryKey: goalCategoriesKey,
    queryFn: async () => {
      const result = await categoryService.getGrouped();
      if (result.success && result.data) {
        const data = result.data as any;
        const payload = data?.data || data;
        return {
          asset: Array.isArray(payload?.asset) ? payload.asset : [],
          expense: Array.isArray(payload?.expense) ? payload.expense : [],
          income: Array.isArray(payload?.income) ? payload.income : [],
        };
      }
      return { asset: [], expense: [], income: [] };
    },
  });

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  const categoryGroups: { title: string; items: any[] }[] = [
    { title: "Savings & assets", items: categories?.asset ?? [] },
    { title: "Expenses", items: categories?.expense ?? [] },
    { title: "Income", items: categories?.income ?? [] },
  ];
  const allCategoryNames = new Set(
    categoryGroups.flatMap((group) =>
      group.items.map((cat: any) => String(cat?.name || "").trim().toLowerCase()),
    ),
  );
  const searchTerm = categorySearch.trim().toLowerCase();
  const filteredCategoryGroups = categoryGroups
    .map((group) => ({
      ...group,
      items: searchTerm
        ? group.items.filter((cat: any) =>
            String(cat?.name || "").toLowerCase().includes(searchTerm),
          )
        : group.items,
    }))
    .filter((group) => group.items.length > 0);
  const exactCategoryMatch = searchTerm ? allCategoryNames.has(searchTerm) : true;

  const closeCategoryPicker = () => {
    setShowCategoryPicker(false);
    setCategorySearch("");
  };

  const pickCategory = (name: string) => {
    setFormData((prev) => ({ ...prev, category: name }));
    closeCategoryPicker();
  };

  // "+ Create '<name>'" — a savings (asset) category, picked straight away.
  const createInlineCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = String(name || "").trim();
      if (!trimmed) throw new Error("Type a category name first");
      const result = await categoryService.create({
        name: trimmed,
        type: "asset",
        is_active: 1,
      } as any);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: (result) => {
      const created: any = (result as any)?.data?.data || (result as any)?.data || {};
      if (created?.name) {
        queryClient.setQueryData<any>(goalCategoriesKey, (prev: any) =>
          prev
            ? { ...prev, asset: [...(prev.asset ?? []), created] }
            : { asset: [created], expense: [], income: [] },
        );
        pickCategory(created.name);
      }
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Category "${created?.name || "new"}" created`);
    },
    onError: (err: Error) => toast.error(err?.message || "Could not create category"),
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Category and target date are optional (QA AE-108): left out, not "".
      const result = await goalService.create({
        name: data.name.trim(),
        target_amount: parseDecimalInput(data.target_amount),
        current_amount: parseDecimalInput(data.current_amount),
        target_date: data.target_date || undefined,
        category: data.category.trim() || undefined,
        description: data.description.trim() || undefined,
      });
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      closeModal();
      const name = variables.name?.trim();
      toast.success(name ? `Goal "${name}" created` : "Goal created");
    },
    onError: (error: Error) => toast.error(error.message || "Could not save goal"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      // null clears an optional field the user emptied.
      const result = await goalService.update(id, {
        name: data.name.trim(),
        target_amount: parseDecimalInput(data.target_amount),
        target_date: data.target_date || null,
        category: data.category.trim() || null,
        description: data.description.trim() || null,
      });
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      closeModal();
      // The server re-derives the status after every edit
      // (Goal::updateStatus), so say so when it changed on its own.
      const status = (result.data as any)?.data?.status;
      if (status === "completed") {
        toast.success("Goal updated — you've already saved enough to reach it");
      } else if (status === "paused") {
        toast.success("Goal updated. Its target date has passed, so it's paused");
      } else {
        toast.success("Goal updated");
      }
    },
    onError: (error: Error) => toast.error(error.message || "Could not update goal"),
  });

  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const result = await accountService.getAll();
      if (result.success && result.data) {
        const responseData = result.data as any;
        const list = responseData?.data || responseData || [];
        return Array.isArray(list) ? list : [];
      }
      return [];
    },
  });

  const addAmountMutation = useMutation({
    mutationFn: async ({
      id,
      amount,
      fromId,
      toId,
    }: {
      id: number;
      amount: number;
      fromId?: number | null;
      toId?: number | null;
    }) => {
      const result = await goalService.addAmount(id, {
        amount,
        ...(fromId && toId ? { from_account_id: fromId, to_account_id: toId } : {}),
      });
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: (result, variables) => {
      const goal = selectedGoal;
      const moved = Boolean(variables.fromId && variables.toId);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      // A moved contribution is a transfer: balances and Activity changed.
      if (moved) void invalidateMoneyQueries(queryClient);
      closeAddAmountModal();
      if (goal) {
        const newTotal = (Number(goal.current_amount) || 0) + variables.amount;
        const target = Number(goal.target_amount) || 0;
        if (target > 0 && newTotal >= target) {
          toast.success(`You reached your goal "${goal.name}"!`, {
            title: "Goal complete",
            duration: 5000,
          });
          void maybeAskForReview("goal_reached");
        } else if (moved && result?.message) {
          toast.success(result.message);
        } else {
          toast.success(`${formatAmount(variables.amount)} added to ${goal.name}`);
        }
      } else {
        toast.success("Amount added");
      }
    },
    onError: (error: Error) => toast.error(error.message || "Could not add amount"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await goalService.delete(id);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      setGoalToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal deleted");
    },
    onError: (error: Error) => {
      setGoalToDelete(null);
      toast.error(error.message || "Could not delete goal");
    },
  });

  const openModal = () => {
    setEditingGoal(null);
    closeCategoryPicker();
    setFormData({
      name: "",
      target_amount: "",
      current_amount: "",
      target_date: "",
      category: "",
      description: "",
    });
    setModalVisible(true);
  };

  const openEditModal = (goal: GoalRecord) => {
    setEditingGoal(goal);
    closeCategoryPicker();
    setFormData({
      name: goal.name || "",
      target_amount: String(goal.target_amount ?? ""),
      current_amount: "",
      // The API sends a full timestamp; DateField wants YYYY-MM-DD.
      target_date: String(goal.target_date || goal.deadline || "").slice(0, 10),
      category: goal.category || "",
      description: goal.description || "",
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingGoal(null);
    closeCategoryPicker();
  };

  const openAddAmountModal = (goal: GoalRecord) => {
    setSelectedGoal(goal);
    setAmountToAdd("");
    setMoveMoney(false);
    setFromAccountId(null);
    setToAccountId(null);
    setAddAmountModalVisible(true);
  };

  const closeAddAmountModal = () => {
    setAddAmountModalVisible(false);
    setSelectedGoal(null);
    setAmountToAdd("");
    setMoveMoney(false);
    setFromAccountId(null);
    setToAccountId(null);
  };

  const toggleMoveMoney = (on: boolean) => {
    setMoveMoney(on);
    if (on && fromAccountId == null) {
      const preferred = accounts.find((a) => a.is_default) ?? accounts[0];
      setFromAccountId(preferred ? Number(preferred.id) : null);
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a goal name");
      return;
    }
    if (!formData.target_amount || parseDecimalInput(formData.target_amount) <= 0) {
      toast.error("Please enter a valid target amount");
      return;
    }
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data: formData });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleAddAmount = () => {
    if (!selectedGoal) return;
    const amount = parseDecimalInput(amountToAdd);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (moveMoney) {
      if (!fromAccountId || !toAccountId) {
        toast.error("Pick the account the money comes from and the one it goes to.");
        return;
      }
      if (fromAccountId === toAccountId) {
        toast.error("Pick two different accounts.");
        return;
      }
    }
    addAmountMutation.mutate({
      id: selectedGoal.id,
      amount,
      fromId: moveMoney ? fromAccountId : null,
      toId: moveMoney ? toAccountId : null,
    });
  };

  const handleDelete = (goal: GoalRecord) => {
    setGoalToDelete(goal);
  };

  /**
   * Whole days to the target date, and whether it has passed. The API's
   * figures (contract C3: counted in the user's timezone) win; older API
   * builds get the same count from the device's calendar.
   */
  const getDueInfo = (goal: GoalRecord) => {
    const targetDate = goal.target_date || goal.deadline;
    if (!targetDate) return null;
    if (typeof goal.is_overdue === "boolean") {
      return {
        overdue: goal.is_overdue,
        days: goal.is_overdue
          ? Math.max(0, Math.round(Number(goal.days_overdue) || 0))
          : Math.max(0, Math.round(Number(goal.days_remaining) || 0)),
      };
    }
    // Whole calendar days between local midnights (round absorbs DST hours).
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round(
      (parseCalendarDate(targetDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diffDays < 0
      ? { overdue: true, days: Math.abs(diffDays) }
      : { overdue: false, days: diffDays };
  };

  const dayCount = (days: number) => `${days} ${days === 1 ? "day" : "days"}`;

  // Only a pull shows the spinner; refetches after a save stay silent (on iOS
  // a programmatic refresh would also push the list down).
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const handlePullRefresh = async () => {
    setPullRefreshing(true);
    try {
      await refetch();
    } finally {
      setPullRefreshing(false);
    }
  };

  const getProgressColor = (percentage: number, status?: string) => {
    if (status === "completed" || percentage >= 100) return colors.tertiary;
    if (percentage >= 75) return "#F59E0B";
    return colors.primary;
  };

  // Calculate stats
  const viewGoals = goals || [];
  const totalTargetAmount = viewGoals.reduce(
    (sum: number, goal: GoalRecord) =>
      sum + (parseFloat(String(goal.target_amount)) || 0),
    0,
  );
  const totalCurrentAmount = viewGoals.reduce(
    (sum: number, goal: GoalRecord) =>
      sum + (parseFloat(String(goal.current_amount)) || 0),
    0,
  );
  // Saving past the target (or lowering the target below what's saved)
  // leaves nothing to save — show 0, never a negative amount.
  const remainingFor = (goal: GoalRecord) =>
    Math.max(
      0,
      (parseFloat(String(goal.target_amount)) || 0) -
        (parseFloat(String(goal.current_amount)) || 0),
    );
  const totalRemaining = viewGoals.reduce(
    (sum: number, goal: GoalRecord) => sum + remainingFor(goal),
    0,
  );
  const goalsCount = viewGoals.length;

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
      <BrandStrip />
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
          title="Goals"
          subtitle="Follow savings targets and progress"
          showBack
          showBrand={false}
          inset={false}
        />

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <Surface
            style={[
              styles.statCard,
              { backgroundColor: colors.primaryContainer },
            ]}
            elevation={1}
          >
            <MaterialCommunityIcons
              name="target"
              size={18}
              color={colors.primary}
            />
            <View style={styles.statTextCol}>
              <Text
                variant="labelSmall"
                style={{ color: colors.primary }}
                numberOfLines={1}
              >
                Total Target
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: colors.primary, fontWeight: "bold" }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatAmount(totalTargetAmount)}
              </Text>
            </View>
          </Surface>
          <Surface
            style={[
              styles.statCard,
              { backgroundColor: colors.tertiaryContainer },
            ]}
            elevation={1}
          >
            <MaterialCommunityIcons
              name="trending-up"
              size={18}
              color={colors.tertiary}
            />
            <View style={styles.statTextCol}>
              <Text
                variant="labelSmall"
                style={{ color: colors.tertiary }}
                numberOfLines={1}
              >
                Total Saved
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: colors.tertiary, fontWeight: "bold" }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatAmount(totalCurrentAmount)}
              </Text>
            </View>
          </Surface>
          <Surface
            style={[
              styles.statCard,
              { backgroundColor: colors.secondaryContainer },
            ]}
            elevation={1}
          >
            <MaterialCommunityIcons
              name="cash"
              size={18}
              color={colors.secondary}
            />
            <View style={styles.statTextCol}>
              <Text
                variant="labelSmall"
                style={{ color: colors.secondary }}
                numberOfLines={1}
              >
                Remaining
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: colors.secondary, fontWeight: "bold" }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatAmount(totalRemaining > 0 ? totalRemaining : 0)}
              </Text>
            </View>
          </Surface>
          <Surface
            style={[
              styles.statCard,
              { backgroundColor: colors.surfaceVariant },
            ]}
            elevation={1}
          >
            <MaterialCommunityIcons
              name="format-list-bulleted"
              size={18}
              color={colors.onSurfaceVariant}
            />
            <View style={styles.statTextCol}>
              <Text
                variant="labelSmall"
                style={{ color: colors.onSurfaceVariant }}
                numberOfLines={1}
              >
                Active Goals
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: colors.onSurfaceVariant, fontWeight: "bold" }}
              >
                {goalsCount}
              </Text>
            </View>
          </Surface>
        </View>

        {viewGoals.length > 0 ? (
          viewGoals.map((goal: GoalRecord) => {
            const percentage = goal.progress_percentage || 0;
            const isCompleted =
              goal.is_completed || goal.status === "completed" || percentage >= 100;
            // A reached goal is never "overdue".
            const due = isCompleted ? null : getDueInfo(goal);
            const isOverdue = !!due?.overdue;
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
                        name={isCompleted ? "check-circle" : "flag"}
                        size={24}
                        color={progressColor}
                      />
                    </View>
                    <View style={styles.goalInfo}>
                      <Text
                        variant="titleMedium"
                        style={{ color: colors.onSurface }}
                      >
                        {goal.name}
                      </Text>
                      {goal.category && (
                        <Text
                          variant="bodySmall"
                          style={{ color: colors.onSurfaceVariant }}
                        >
                          Category: {goal.category}
                        </Text>
                      )}
                    </View>
                    {isCompleted && (
                      <View
                        style={[
                          styles.completedBadge,
                          { backgroundColor: colors.tertiaryContainer },
                        ]}
                      >
                        <Text
                          variant="labelSmall"
                          style={{ color: colors.tertiary }}
                        >
                          Complete
                        </Text>
                      </View>
                    )}
                    {isOverdue && (
                      <View
                        style={[
                          styles.completedBadge,
                          { backgroundColor: colors.errorContainer },
                        ]}
                      >
                        <Text
                          variant="labelSmall"
                          style={{ color: colors.error }}
                        >
                          Overdue
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.amountsContainer}>
                    <View style={styles.amountItem}>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.onSurfaceVariant }}
                      >
                        Target
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{ color: colors.onSurface, fontWeight: "600" }}
                      >
                        {formatAmount(
                          parseFloat(
                            String(
                              goal.target_amount || (goal as any).amount || 0,
                            ),
                          ),
                        )}
                      </Text>
                    </View>
                    <View style={styles.amountItem}>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.onSurfaceVariant }}
                      >
                        Saved
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{ color: colors.tertiary, fontWeight: "600" }}
                      >
                        {formatAmount(
                          parseFloat(
                            String(
                              goal.current_amount ||
                                (goal as any).saved_amount ||
                                0,
                            ),
                          ),
                        )}
                      </Text>
                    </View>
                    <View style={styles.amountItem}>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.onSurfaceVariant }}
                      >
                        Remaining
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{ color: colors.onSurface, fontWeight: "600" }}
                      >
                        {formatAmount(remainingFor(goal))}
                      </Text>
                    </View>
                  </View>

                  {(goal.target_date || goal.deadline) && (
                    <View style={styles.dateRow}>
                      <MaterialCommunityIcons
                        name="calendar"
                        size={16}
                        color={colors.onSurfaceVariant}
                      />
                      <Text
                        variant="bodySmall"
                        style={{
                          color: colors.onSurfaceVariant,
                          marginLeft: 4,
                        }}
                      >
                        Target:{" "}
                        {formatCalendarDate(
                          goal.target_date || goal.deadline || "",
                        )}
                        {due && (
                          <Text
                            style={{
                              color: due.overdue ? colors.error : colors.primary,
                            }}
                          >
                            {due.overdue
                              ? ` · Overdue by ${dayCount(due.days)}`
                              : due.days === 0
                                ? " · Due today"
                                : ` · ${dayCount(due.days)} left`}
                          </Text>
                        )}
                      </Text>
                    </View>
                  )}

                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.onSurfaceVariant }}
                      >
                        Progress
                      </Text>
                      <Text
                        variant="labelSmall"
                        style={{ color: progressColor }}
                      >
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>
                    <ProgressBar
                      progress={Math.min(percentage / 100, 1)}
                      color={progressColor}
                      style={[
                        styles.progressBar,
                        { backgroundColor: `${progressColor}20` },
                      ]}
                    />
                  </View>

                  {!isCompleted && (
                    <TouchableOpacity
                      style={[
                        styles.addAmountButton,
                        { backgroundColor: colors.primaryContainer },
                      ]}
                      onPress={() => openAddAmountModal(goal)}
                    >
                      <MaterialCommunityIcons
                        name="plus"
                        size={18}
                        color={colors.primary}
                      />
                      <Text
                        variant="labelMedium"
                        style={{ color: colors.primary, marginLeft: 4 }}
                      >
                        Add Contribution
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Visible edit / delete — long-press still deletes too. */}
                  <View style={styles.goalActions}>
                    <TouchableOpacity
                      style={[
                        styles.goalActionButton,
                        { borderColor: colors.outlineVariant },
                      ]}
                      onPress={() => openEditModal(goal)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${goal.name}`}
                    >
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={16}
                        color={colors.onSurfaceVariant}
                      />
                      <Text
                        variant="labelMedium"
                        style={{ color: colors.onSurfaceVariant, marginLeft: 6 }}
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.goalActionButton,
                        { borderColor: colors.outlineVariant },
                      ]}
                      onPress={() => handleDelete(goal)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${goal.name}`}
                    >
                      <MaterialCommunityIcons
                        name="delete-outline"
                        size={16}
                        color={colors.error}
                      />
                      <Text
                        variant="labelMedium"
                        style={{ color: colors.error, marginLeft: 6 }}
                      >
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Surface>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="flag-outline"
              size={64}
              color={colors.onSurfaceVariant}
            />
            <Text
              variant="bodyLarge"
              style={{ color: colors.onSurfaceVariant, marginTop: 16 }}
            >
              No goals yet
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, textAlign: "center" }}
            >
              Create your first goal to start tracking your progress
            </Text>
            <TouchableOpacity
              style={[
                styles.createFirstButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => openModal()}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.createFirstButtonText}>Create goal</Text>
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

      {/* Add Goal Modal */}
      <Portal>
        <DialogModal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: colors.surface },
          ]}
        >
          {/* automaticallyAdjustKeyboardInsets: on iOS the keyboard covers the
              lower part of this centred sheet; the inset lets Description and
              the buttons scroll above it. */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
            <Text
              variant="titleLarge"
              style={{ color: colors.onSurface, marginBottom: 16 }}
            >
              {editingGoal ? "Edit Goal" : "Add New Goal"}
            </Text>

            <TextInput
              label="Goal Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              mode="outlined"
              style={styles.input}
            />

            {/* Picked from the user's categories, like the web (QA AE-108 /
                AE-51). Optional: "No category" clears it. */}
            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}
            >
              Category (optional)
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  borderColor: colors.outline,
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
              onPress={() =>
                showCategoryPicker ? closeCategoryPicker() : setShowCategoryPicker(true)
              }
              accessibilityRole="button"
              accessibilityLabel="Choose a category"
            >
              <Text
                style={{
                  color: formData.category
                    ? colors.onSurface
                    : colors.onSurfaceVariant,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {formData.category || "No category"}
              </Text>
              <MaterialCommunityIcons
                name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            {/* A goal saved before categories came from a list can carry a
                name that isn't one of the user's categories (AE-51). */}
            {!!formData.category.trim() &&
              !!categories &&
              !allCategoryNames.has(formData.category.trim().toLowerCase()) && (
                <View style={styles.categoryNotice}>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.onSurfaceVariant, flex: 1 }}
                  >
                    "{formData.category.trim()}" isn't one of your categories.
                  </Text>
                  <Button
                    mode="text"
                    compact
                    onPress={() =>
                      createInlineCategoryMutation.mutate(formData.category)
                    }
                    loading={createInlineCategoryMutation.isPending}
                    disabled={createInlineCategoryMutation.isPending}
                  >
                    Add it
                  </Button>
                </View>
              )}
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
                    value={categorySearch}
                    onChangeText={setCategorySearch}
                    placeholder="Search or type a new category"
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
                <ScrollView
                  style={{ maxHeight: 240 }}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {!searchTerm && (
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        !formData.category && {
                          backgroundColor: `${colors.primary}15`,
                        },
                      ]}
                      onPress={() => pickCategory("")}
                    >
                      <Text style={{ color: colors.onSurfaceVariant }}>
                        No category
                      </Text>
                    </TouchableOpacity>
                  )}
                  {!exactCategoryMatch && (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      disabled={createInlineCategoryMutation.isPending}
                      onPress={() =>
                        createInlineCategoryMutation.mutate(categorySearch)
                      }
                    >
                      <Text style={{ color: colors.primary, fontWeight: "600" }}>
                        {createInlineCategoryMutation.isPending
                          ? "Creating…"
                          : `+ Create "${categorySearch.trim()}"`}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {filteredCategoryGroups.length === 0 && !searchTerm && (
                    <Text
                      style={{
                        padding: 12,
                        color: colors.onSurfaceVariant,
                        textAlign: "center",
                        fontSize: 13,
                      }}
                    >
                      No categories yet — type a name above to create one.
                    </Text>
                  )}
                  {filteredCategoryGroups.map((group) => (
                    <View key={group.title}>
                      <Text
                        variant="labelSmall"
                        style={[
                          styles.categoryGroupTitle,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {group.title.toUpperCase()}
                      </Text>
                      {group.items.map((cat: any) => {
                        const selected =
                          formData.category.trim().toLowerCase() ===
                          String(cat.name || "").trim().toLowerCase();
                        return (
                          <TouchableOpacity
                            key={`${group.title}-${cat.id}`}
                            style={[
                              styles.dropdownItem,
                              selected && {
                                backgroundColor: `${colors.primary}15`,
                              },
                            ]}
                            onPress={() => pickCategory(String(cat.name || ""))}
                          >
                            <Text style={{ color: colors.onSurface, flex: 1 }}>
                              {cat.name}
                            </Text>
                            {selected && (
                              <MaterialCommunityIcons
                                name="check"
                                size={18}
                                color={colors.primary}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </ScrollView>
              </Surface>
            )}
            <View style={{ height: 12 }} />

            <TextInput
              label="Target Amount *"
              value={formData.target_amount}
              onChangeText={(text) =>
                setFormData({ ...formData, target_amount: toDecimalInput(text) })
              }
              mode="outlined"
              keyboardType="decimal-pad"
              returnKeyType="done"
              style={styles.input}
            />

            {/* Optional (QA AE-108); "Clear" removes a date already set. */}
            <DateField
              label="Target Date (optional)"
              value={formData.target_date}
              onChange={(date) =>
                setFormData({ ...formData, target_date: date })
              }
              style={formData.target_date ? styles.inputWithAction : styles.input}
            />
            {!!formData.target_date && (
              <Button
                mode="text"
                compact
                icon="close"
                onPress={() => setFormData({ ...formData, target_date: "" })}
                style={styles.clearDateButton}
              >
                No target date
              </Button>
            )}

            {editingGoal && (
              <Text
                variant="bodySmall"
                style={[
                  styles.editNote,
                  {
                    color: colors.onSurfaceVariant,
                    backgroundColor: colors.surfaceVariant,
                  },
                ]}
              >
                Saved so far:{" "}
                {formatAmount(
                  parseFloat(String(editingGoal.current_amount || 0)),
                )}
                . Use Add Contribution on the card to add more.
              </Text>
            )}

            <TextInput
              label="Description"
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              mode="outlined"
              multiline
              numberOfLines={3}
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
                {editingGoal ? "Save changes" : "Create goal"}
              </Button>
            </View>
          </ScrollView>
        </DialogModal>
      </Portal>

      {/* Add Contribution Modal */}
      <Portal>
        <DialogModal
          visible={addAmountModalVisible}
          onDismiss={closeAddAmountModal}
          // Re-centres the sheet in the space above the iOS keyboard; on
          // Android keyboardHeight stays 0 and this is Paper's own margin.
          style={{ marginBottom: Math.max(insets.bottom, keyboardHeight) }}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: colors.surface },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text
              variant="titleLarge"
              style={{ color: colors.onSurface, marginBottom: 16 }}
            >
              {selectedGoal ? `Add Contribution — ${selectedGoal.name}` : "Add Contribution"}
            </Text>

            {selectedGoal && (
              <Surface
                style={[
                  styles.goalInfoCard,
                  { backgroundColor: colors.surfaceVariant },
                ]}
                elevation={0}
              >
                <View style={styles.goalInfoRow}>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.onSurfaceVariant }}
                  >
                    Target:
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: colors.onSurface, fontWeight: "600" }}
                  >
                    {formatAmount(
                      parseFloat(
                        String(
                          selectedGoal.target_amount ||
                            (selectedGoal as any).amount ||
                            0,
                        ),
                      ),
                    )}
                  </Text>
                </View>
                <View style={styles.goalInfoRow}>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.onSurfaceVariant }}
                  >
                    Saved:
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: colors.tertiary, fontWeight: "600" }}
                  >
                    {formatAmount(
                      parseFloat(
                        String(
                          selectedGoal.current_amount ||
                            (selectedGoal as any).saved_amount ||
                            0,
                        ),
                      ),
                    )}
                  </Text>
                </View>
                <View style={styles.goalInfoRow}>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.onSurfaceVariant }}
                  >
                    Remaining:
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: colors.onSurface, fontWeight: "600" }}
                  >
                    {formatAmount(remainingFor(selectedGoal))}
                  </Text>
                </View>
              </Surface>
            )}

            <TextInput
              label="Amount to Add *"
              value={amountToAdd}
              onChangeText={(text) => setAmountToAdd(toDecimalInput(text))}
              mode="outlined"
              keyboardType="decimal-pad"
              returnKeyType="done"
              style={styles.input}
            />

            {/* Optional: really move the money (QA AE-108). */}
            <View
              style={[
                styles.moveCard,
                { backgroundColor: colors.surfaceVariant, borderColor: colors.outline },
              ]}
            >
              <View style={styles.moveHeader}>
                <Text
                  variant="bodyMedium"
                  style={[styles.moveTitle, { color: colors.onSurface }]}
                  onPress={accounts.length >= 2 ? () => toggleMoveMoney(!moveMoney) : undefined}
                >
                  Also move this money between my accounts
                </Text>
                <Switch
                  value={moveMoney}
                  onValueChange={toggleMoveMoney}
                  disabled={accounts.length < 2}
                  color={colors.primary}
                />
              </View>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {accounts.length < 2
                  ? "Add a second account (for example, Savings) to move money into it."
                  : moveMoney
                    ? "It's recorded as a transfer, so both balances update. Your net worth stays the same."
                    : "Leave this off to only track your progress. No balance changes."}
              </Text>

              {moveMoney && accounts.length >= 2 && (
                <>
                  <Text
                    variant="labelLarge"
                    style={[styles.moveLabel, { color: colors.onSurfaceVariant }]}
                  >
                    From
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.moveChips}
                    keyboardShouldPersistTaps="handled"
                  >
                    {accounts.map((account) => {
                      const id = Number(account.id);
                      return (
                        <Chip
                          key={`from-${id}`}
                          selected={fromAccountId === id}
                          showSelectedCheck
                          onPress={() => {
                            setFromAccountId(id);
                            if (toAccountId === id) setToAccountId(null);
                          }}
                          style={
                            fromAccountId === id
                              ? { backgroundColor: colors.primaryContainer }
                              : undefined
                          }
                        >
                          {account.account_name}
                        </Chip>
                      );
                    })}
                  </ScrollView>

                  <Text
                    variant="labelLarge"
                    style={[styles.moveLabel, { color: colors.onSurfaceVariant }]}
                  >
                    To
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.moveChips}
                    keyboardShouldPersistTaps="handled"
                  >
                    {accounts
                      .filter((account) => Number(account.id) !== fromAccountId)
                      .map((account) => {
                        const id = Number(account.id);
                        return (
                          <Chip
                            key={`to-${id}`}
                            selected={toAccountId === id}
                            showSelectedCheck
                            onPress={() => setToAccountId(id)}
                            style={
                              toAccountId === id
                                ? { backgroundColor: colors.primaryContainer }
                                : undefined
                            }
                          >
                            {account.account_name}
                          </Chip>
                        );
                      })}
                  </ScrollView>
                </>
              )}
            </View>

            <View style={styles.modalButtons}>
              <Button mode="text" onPress={closeAddAmountModal}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleAddAmount}
                loading={addAmountMutation.isPending}
              >
                Add Contribution
              </Button>
            </View>
          </ScrollView>
        </DialogModal>
      </Portal>

      <ConfirmDialog
        visible={!!goalToDelete}
        title="Delete goal?"
        message={`"${goalToDelete?.name ?? "This goal"}" will be permanently removed. This action cannot be undone.`}
        icon={TriangleAlert}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setGoalToDelete(null)}
        onConfirm={() => goalToDelete && deleteMutation.mutate(goalToDelete.id)}
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
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  // Two tiles a row. Paper's Surface on iOS keeps only some layout props
  // (width, flexGrow…) on its outer shadow view, so a minWidth never reached
  // the row there and all tiles squeezed onto one line.
  statCard: {
    flexGrow: 1,
    width: "47%",
    padding: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statTextCol: {
    flex: 1,
    minWidth: 0,
  },
  goalCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  amountItem: {
    alignItems: "center",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  addAmountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  goalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  goalActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  editNote: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    lineHeight: 18,
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
    maxHeight: "80%",
  },
  input: {
    marginBottom: 12,
  },
  moveCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  moveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  moveTitle: {
    flex: 1,
    fontWeight: "600",
  },
  moveLabel: {
    marginTop: 12,
    marginBottom: 6,
  },
  moveChips: {
    gap: 8,
    paddingRight: 4,
  },
  inputWithAction: {
    marginBottom: 2,
  },
  clearDateButton: {
    alignSelf: "flex-end",
    marginBottom: 6,
  },
  // Picker styles follow schedules.tsx (the shared inline-create picker).
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryNotice: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  dropdownList: {
    borderRadius: 8,
    marginTop: 4,
    padding: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryGroupTitle: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    letterSpacing: 0.4,
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
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  goalInfoCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  goalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
});
