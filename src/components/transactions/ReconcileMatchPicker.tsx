import React, { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, IconButton, Portal, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import DialogModal from "../common/DialogModal";
import { Sensitive } from "../common/Sensitive";
import { PaperTextInput as TextInput } from "../ui/SafeTextInput";
import { useTheme } from "../../contexts/ThemeContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { Transaction } from "../../types";
import { formatDate } from "../../utils/date";
import {
  MATCH_WINDOW_DAYS,
  MatchableLine,
  amountOf,
  categoryLabelOf,
  describeDayGap,
  directionOf,
  findMatchCandidates,
} from "../../utils/reconcileMatch";

export interface ReconcileMatchLine extends MatchableLine {
  merchant_name?: string;
  description?: string;
}

interface ReconcileMatchPickerProps {
  line: ReconcileMatchLine;
  ledgerRows: Transaction[];
  /** Rows already matched to another line, confirmed or created here. */
  excludeIds: (number | string | null | undefined)[];
  currentMatchId?: number | null;
  accountName?: string;
  onPick: (transaction: Transaction) => void;
  /** Offered when nothing is close; only for an unmatched line. */
  onCreateInstead?: () => void;
  onDismiss: () => void;
}

const signFor = (transaction: unknown) => {
  const direction = directionOf(transaction);
  if (direction === "credit") return "+";
  if (direction === "debit") return "−";
  return "";
};

const showDate = (value?: string) =>
  value ? formatDate(String(value).slice(0, 10)) : "";

/**
 * Reconcile → "Match" on a statement card (QA AE-54): pick the transaction
 * already in this account that the line is. Nothing is saved — the card just
 * counts as matched. Mounted only while open, so each opening starts fresh.
 */
export default function ReconcileMatchPicker({
  line,
  ledgerRows,
  excludeIds,
  currentMatchId = null,
  accountName = "this account",
  onPick,
  onCreateInstead,
  onDismiss,
}: ReconcileMatchPickerProps) {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const [query, setQuery] = useState("");

  const candidates = useMemo(
    () => findMatchCandidates(line, ledgerRows, { excludeIds, query }),
    [line, ledgerRows, excludeIds, query],
  );

  // Start on the current match, or else the best suggestion.
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (currentMatchId != null) return currentMatchId;
    const best = findMatchCandidates(line, ledgerRows, { excludeIds })[0];
    return best ? best.transaction.id : null;
  });

  const selected = candidates.find(
    (candidate) => String(candidate.transaction.id) === String(selectedId),
  );
  const searching = query.trim() !== "";
  const lineAmount = amountOf(line.amount);
  const lineMerchant = line.merchant_name?.trim() || "Statement line";
  const lineDescription =
    line.description && line.description !== lineMerchant ? line.description : "";

  const amountColor = (transaction: unknown) =>
    directionOf(transaction) === "credit" ? colors.tertiary : colors.error;

  return (
    <Portal>
      <DialogModal
        visible
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="titleLarge" style={{ color: colors.onSurface }}>
              Match to a transaction
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: colors.onSurfaceVariant, marginTop: 2 }}
            >
              Pick the {accountName} transaction this statement line already is.
              Nothing new is saved.
            </Text>
          </View>
          <IconButton
            icon="close"
            onPress={onDismiss}
            accessibilityLabel="Close"
            style={{ margin: -6 }}
          />
        </View>

        {/* The statement line being matched. */}
        <View
          style={[
            styles.lineBox,
            { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant },
          ]}
        >
          <Text
            style={[styles.lineLabel, { color: colors.onSurfaceVariant }]}
          >
            STATEMENT LINE
          </Text>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                variant="titleSmall"
                numberOfLines={1}
                style={{ color: colors.onSurface }}
              >
                {lineMerchant}
              </Text>
              <Text
                variant="bodySmall"
                numberOfLines={1}
                style={{ color: colors.onSurfaceVariant }}
              >
                {showDate(line.date)}
                {lineDescription ? ` · ${lineDescription}` : ""}
              </Text>
            </View>
            <Sensitive>
              <Text
                variant="titleSmall"
                style={{ color: amountColor(line), fontWeight: "700" }}
              >
                {signFor(line)}
                {formatAmount(lineAmount)}
              </Text>
            </Sensitive>
          </View>
        </View>

        <TextInput
          mode="outlined"
          dense
          value={query}
          onChangeText={setQuery}
          placeholder="Search merchant, note or amount"
          left={<TextInput.Icon icon="magnify" />}
          right={
            query ? (
              <TextInput.Icon
                icon="close-circle"
                onPress={() => setQuery("")}
                accessibilityLabel="Clear search"
              />
            ) : undefined
          }
          returnKeyType="search"
          style={{ marginTop: 12 }}
        />

        <Text
          variant="bodySmall"
          style={{ color: colors.onSurfaceVariant, marginTop: 8, marginBottom: 6 }}
        >
          {searching
            ? `Searching all of ${accountName}.`
            : `Suggestions: within ${MATCH_WINDOW_DAYS} days and close in amount. Transactions already matched to another line aren't shown.`}
        </Text>

        <ScrollView
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode={Platform.OS === "ios" ? "on-drag" : "none"}
        >
          {candidates.map((candidate) => {
            const row = candidate.transaction;
            const isSelected = String(row.id) === String(selectedId);
            const rowAmount = amountOf(row.amount);
            const merchant = row.merchant_name || row.description || "No name";
            const category = categoryLabelOf(row);
            const amountHint = candidate.sameAmount
              ? "Same amount"
              : `${formatAmount(candidate.amountDiff)} ${rowAmount > lineAmount ? "more" : "less"}`;
            const dayHint = describeDayGap(candidate.dayGap);

            return (
              <Pressable
                key={row.id}
                onPress={() => setSelectedId(row.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.option,
                  {
                    borderColor: isSelected ? colors.primary : colors.outline,
                    backgroundColor: isSelected
                      ? `${colors.primary}14`
                      : colors.surface,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={isSelected ? "radiobox-marked" : "radiobox-blank"}
                  size={20}
                  color={isSelected ? colors.primary : colors.onSurfaceVariant}
                />
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text
                    variant="titleSmall"
                    numberOfLines={1}
                    style={{ color: colors.onSurface }}
                  >
                    {merchant}
                  </Text>
                  <Text
                    variant="bodySmall"
                    numberOfLines={1}
                    style={{ color: colors.onSurfaceVariant }}
                  >
                    {showDate(row.date)}
                    {category ? ` · ${category}` : ""}
                  </Text>
                  <View style={styles.chips}>
                    <Text
                      style={[
                        styles.chip,
                        candidate.sameAmount
                          ? { backgroundColor: `${colors.tertiary}22`, color: colors.tertiary }
                          : {
                              backgroundColor: colors.surfaceVariant,
                              color: colors.onSurfaceVariant,
                            },
                      ]}
                    >
                      {amountHint}
                    </Text>
                    {!!dayHint && (
                      <Text
                        style={[
                          styles.chip,
                          candidate.dayGap === 0
                            ? { backgroundColor: `${colors.tertiary}22`, color: colors.tertiary }
                            : {
                                backgroundColor: colors.surfaceVariant,
                                color: colors.onSurfaceVariant,
                              },
                        ]}
                      >
                        {dayHint}
                      </Text>
                    )}
                  </View>
                </View>
                <Sensitive>
                  <Text
                    variant="titleSmall"
                    style={{ color: amountColor(row), fontWeight: "700" }}
                  >
                    {signFor(row)}
                    {formatAmount(rowAmount)}
                  </Text>
                </Sensitive>
              </Pressable>
            );
          })}

          {candidates.length === 0 && (
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name={searching ? "magnify-close" : "link-variant-off"}
                size={28}
                color={colors.onSurfaceVariant}
              />
              <Text
                variant="titleSmall"
                style={{ color: colors.onSurface, marginTop: 6, textAlign: "center" }}
              >
                {searching
                  ? `Nothing matches “${query.trim()}”`
                  : `No close match in ${accountName}`}
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: colors.onSurfaceVariant,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                {searching
                  ? "Try the merchant name or the amount, or clear the search to see the suggestions."
                  : `Nothing within ${MATCH_WINDOW_DAYS} days has a similar amount. Search for it above${onCreateInstead ? ", or add it as a new transaction." : "."}`}
              </Text>
              {!searching && onCreateInstead && (
                <Button
                  mode="outlined"
                  icon="plus"
                  onPress={onCreateInstead}
                  compact
                  style={{ marginTop: 10 }}
                >
                  Create it instead
                </Button>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button mode="text" onPress={onDismiss}>
            Cancel
          </Button>
          <Button
            mode="contained"
            icon="link-variant"
            disabled={!selected}
            onPress={() => selected && onPick(selected.transaction)}
            style={{ marginLeft: 8 }}
          >
            Match
          </Button>
        </View>
      </DialogModal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 16,
    padding: 18,
    borderRadius: 16,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  lineBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  lineLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  chip: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
});
