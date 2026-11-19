import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Portal, Text } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import DialogModal from "../common/DialogModal";
import { Sensitive } from "../common/Sensitive";
import { useTheme } from "../../contexts/ThemeContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import budgetService from "../../services/budgetService";
import { parseCalendarDate, toDateInputValue } from "../../utils/date";

/** A budget's category condition: a whole category, or one subcategory of it. */
type BudgetCondition = { category_id: number; subcategory_id: number | null };

/**
 * The period the budget counts right now. Same windows as the API's
 * BudgetAlertService::periodWindow(): calendar week (Monday start), month,
 * quarter or year. A `period_start` / `period_end` from the API wins.
 */
export function budgetPeriodWindow(
  budget: any,
  now: Date = new Date(),
): { start: string; end: string } {
  if (budget?.period_start && budget?.period_end) {
    return {
      start: String(budget.period_start).slice(0, 10),
      end: String(budget.period_end).slice(0, 10),
    };
  }
  const y = now.getFullYear();
  const m = now.getMonth();
  let start: Date;
  let end: Date;
  switch (String(budget?.period || "monthly").toLowerCase()) {
    case "weekly": {
      const sinceMonday = (now.getDay() + 6) % 7;
      start = new Date(y, m, now.getDate() - sinceMonday);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      break;
    }
    case "quarterly": {
      const first = Math.floor(m / 3) * 3;
      start = new Date(y, first, 1);
      end = new Date(y, first + 3, 0);
      break;
    }
    case "yearly":
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31);
      break;
    default:
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0);
  }
  return { start: toDateInputValue(start), end: toDateInputValue(end) };
}

const toCents = (value: unknown) =>
  Math.max(0, Math.round(Math.abs(parseFloat(String(value ?? 0)) || 0) * 100));

/**
 * The part of a transaction that counts toward the budget — the client twin
 * of TransactionAllocationService::amountForConditions(): categorised item
 * totals go to their own category, any un-itemised remainder to the primary
 * category, so a split purchase only counts its matching share.
 */
export function countedAmount(tx: any, wanted: BudgetCondition[]): number {
  const totalCents = toCents(tx?.amount);
  if (totalCents === 0 || wanted.length === 0) return 0;

  const primary = Array.isArray(tx?.transaction_categories)
    ? tx.transaction_categories[0]
    : null;
  const primaryCategory = primary?.category_id ? Number(primary.category_id) : null;
  const primarySub = primary?.subcategory_id ? Number(primary.subcategory_id) : null;

  const weighted = (Array.isArray(tx?.items) ? tx.items : [])
    .filter((item: any) => item?.category_id)
    .map((item: any) => ({
      category_id: Number(item.category_id),
      subcategory_id: item.subcategory_id ? Number(item.subcategory_id) : null,
      weight: toCents(
        item.total ??
          (parseFloat(String(item.price ?? 0)) || 0) *
            (parseFloat(String(item.quantity ?? 1)) || 1),
      ),
    }))
    .filter((item: { weight: number }) => item.weight > 0);

  const allocations: { category_id: number | null; subcategory_id: number | null; cents: number }[] = [];
  if (weighted.length === 0) {
    allocations.push({ category_id: primaryCategory, subcategory_id: primarySub, cents: totalCents });
  } else {
    const weightTotal = weighted.reduce((sum: number, item: { weight: number }) => sum + item.weight, 0);
    const itemBudget = Math.min(totalCents, weightTotal);
    let remainingCents = itemBudget;
    let remainingWeight = weightTotal;
    weighted.forEach((item: { category_id: number; subcategory_id: number | null; weight: number }, index: number) => {
      const isLast = index === weighted.length - 1;
      const cents =
        isLast || remainingWeight <= 0
          ? remainingCents
          : Math.floor((remainingCents * item.weight) / remainingWeight);
      remainingCents -= cents;
      remainingWeight -= item.weight;
      if (cents > 0) allocations.push({ category_id: item.category_id, subcategory_id: item.subcategory_id, cents });
    });
    const remainder = totalCents - itemBudget;
    if (remainder > 0) {
      allocations.push({ category_id: primaryCategory, subcategory_id: primarySub, cents: remainder });
    }
  }

  let counted = 0;
  allocations.forEach((allocation) => {
    const hit = wanted.some(
      (condition) =>
        condition.category_id === allocation.category_id &&
        (condition.subcategory_id === null ||
          condition.subcategory_id === allocation.subcategory_id),
    );
    if (hit) counted += allocation.cents;
  });
  return counted / 100;
}

/** Same candidate rule as the API: any of the transaction's categories matches. */
const touchesBudget = (tx: any, wanted: BudgetCondition[]) =>
  (Array.isArray(tx?.transaction_categories) ? tx.transaction_categories : []).some(
    (row: any) =>
      wanted.some(
        (condition) =>
          Number(row?.category_id) === condition.category_id &&
          (condition.subcategory_id === null ||
            Number(row?.subcategory_id) === condition.subcategory_id),
      ),
  );

const formatDay = (value: string, withYear = true) =>
  parseCalendarDate(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });

const capitalise = (value?: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "Monthly";

type Props = {
  budget: any | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (budget: any) => void;
};

/**
 * Tapping a budget opens this (QA AE-115): the period it is counting, and
 * every expense counted in it, with Edit one tap away.
 */
export default function BudgetDetailModal({ budget, visible, onClose, onEdit }: Props) {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();

  const conditions: BudgetCondition[] = useMemo(
    () =>
      (Array.isArray(budget?.budget_categories_with_details)
        ? budget.budget_categories_with_details
        : []
      )
        .filter((row: any) => row?.category_id)
        .map((row: any) => ({
          category_id: Number(row.category_id),
          subcategory_id: row.subcategory_id ? Number(row.subcategory_id) : null,
        })),
    [budget],
  );
  const period = useMemo(() => budgetPeriodWindow(budget), [budget]);

  // One category → let the API narrow by its name (it filters by name only).
  const singleCategoryName: string | undefined = useMemo(() => {
    const rows = Array.isArray(budget?.budget_categories_with_details)
      ? budget.budget_categories_with_details
      : [];
    const names = new Set(rows.map((row: any) => row?.category?.name).filter(Boolean));
    return names.size === 1 ? (Array.from(names)[0] as string) : undefined;
  }, [budget]);

  // Under "budgets" so a money write (invalidateMoneyQueries) refreshes it.
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["budgets", "detail", budget?.id, period.start, period.end],
    enabled: visible && !!budget?.id && conditions.length > 0,
    queryFn: async () => {
      const result = await budgetService.getPeriodTransactions({
        start_date: period.start,
        end_date: period.end,
        category: singleCategoryName,
      });
      if (!result.success) throw new Error("Could not load the transactions");
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const rows = useMemo(
    () =>
      (data || [])
        .filter((tx: any) => touchesBudget(tx, conditions))
        .map((tx: any) => ({ tx, counted: countedAmount(tx, conditions) }))
        .filter((row) => row.counted > 0.004),
    [data, conditions],
  );

  if (!budget) return null;

  const budgeted = parseFloat(budget.budgeted_amount) || parseFloat(budget.amount) || 0;
  const spent = parseFloat(budget.spent_amount) || parseFloat(budget.spent) || 0;
  const remaining = budgeted - spent;
  const categoryLabels: string[] = (budget.budget_categories_with_details || []).map(
    (row: any) =>
      `${row.category?.name || "—"}${row.subcategory?.name ? ` › ${row.subcategory.name}` : ""}`,
  );

  return (
    <Portal>
      <DialogModal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text variant="titleLarge" style={{ color: colors.onSurface }}>
            {budget.name}
          </Text>
          <View style={styles.periodRow}>
            <MaterialCommunityIcons name="calendar-range" size={16} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginLeft: 6, flex: 1 }}>
              {capitalise(budget.period)} · {formatDay(period.start, false)} – {formatDay(period.end)}
            </Text>
          </View>

          <Sensitive style={styles.totals}>
            {[
              { label: "Budget", value: budgeted, color: colors.onSurface },
              { label: "Spent", value: spent, color: colors.error },
              {
                label: remaining >= 0 ? "Remaining" : "Over by",
                value: Math.abs(remaining),
                color: remaining >= 0 ? colors.tertiary : colors.error,
              },
            ].map((item) => (
              <View key={item.label} style={[styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                  {item.label}
                </Text>
                <Text
                  variant="titleSmall"
                  style={{ color: item.color, fontWeight: "700" }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatAmount(item.value)}
                </Text>
              </View>
            ))}
          </Sensitive>

          {categoryLabels.length > 0 && (
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: 12 }}>
              Counts approved expenses in: {categoryLabels.join(", ")}
            </Text>
          )}

          <Text variant="titleSmall" style={{ color: colors.onSurface, marginBottom: 6 }}>
            Transactions counted{rows.length > 0 ? ` (${rows.length})` : ""}
          </Text>

          {isLoading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color={colors.primary} />
          ) : isError ? (
            <View style={styles.emptyBox}>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: "center" }}>
                Couldn't load the transactions.
              </Text>
              <Button mode="text" onPress={() => refetch()} loading={isFetching}>
                Try again
              </Button>
            </View>
          ) : rows.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: "center" }}>
                Nothing counted in this period yet.
              </Text>
            </View>
          ) : (
            <Sensitive>
              {rows.map(({ tx, counted }) => {
                const amount = parseFloat(String(tx.amount)) || 0;
                const categoryNames = (Array.isArray(tx.transaction_categories) ? tx.transaction_categories : [])
                  .map((row: any) =>
                    row?.category?.name
                      ? `${row.category.name}${row?.subcategory?.name ? ` › ${row.subcategory.name}` : ""}`
                      : "",
                  )
                  .filter(Boolean)
                  .join(", ");
                return (
                  <View
                    key={tx.id}
                    style={[styles.txRow, { borderBottomColor: colors.outlineVariant ?? colors.outline }]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface }} numberOfLines={1}>
                        {tx.merchant_name || tx.description || "Expense"}
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }} numberOfLines={1}>
                        {tx.date ? formatDay(String(tx.date)) : ""}
                        {categoryNames ? ` · ${categoryNames}` : ""}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                      <Text variant="bodyMedium" style={{ color: colors.error, fontWeight: "600" }}>
                        {formatAmount(counted)}
                      </Text>
                      {Math.abs(amount - counted) > 0.004 && (
                        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                          of {formatAmount(amount)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </Sensitive>
          )}

          <View style={styles.buttons}>
            <Button mode="text" onPress={onClose}>
              Close
            </Button>
            <Button mode="contained" icon="pencil" onPress={() => onEdit(budget)}>
              Edit Budget
            </Button>
          </View>
        </ScrollView>
      </DialogModal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: "80%",
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  totals: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  totalCell: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    gap: 2,
  },
  emptyBox: {
    paddingVertical: 20,
    alignItems: "center",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
});
