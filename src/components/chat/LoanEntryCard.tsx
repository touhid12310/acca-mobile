import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Surface, Text } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, HandCoins } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useToast } from "../../contexts/NotificationContext";
import loanService from "../../services/loanService";
import chatService from "../../services/chatService";
import { invalidateMoneyQueries } from "../../services/moneyQueries";
import { apiErrorMessage } from "../../utils/apiError";
import { formatDate, todayDateInputValue } from "../../utils/date";
import { Sensitive } from "../common/Sensitive";
import type { Account } from "../../types";

/**
 * A money movement on an existing loan, read from a chat message ("Jake paid
 * me back 500 today"). The API sends up to three — best match first — in the
 * assistant message's `metadata.loan_entry_candidates` (contract C8). They are
 * alternatives for ONE entry: recording one settles the message.
 */
export type LoanEntryCandidate = {
  loan_id: number;
  loan_name: string;
  loan_type?: "Lent" | "Borrowed" | string;
  direction: "in" | "out";
  kind?: "repayment" | "top_up" | string;
  label?: string;
  amount: number;
  payment_date?: string | null;
  account_id?: number | null;
  remaining_balance?: number | null;
  notes?: string | null;
  recorded_at?: string | null;
};

/** What this phone remembers about one message's loan cards. */
export type LoanEntryLocalState = {
  /** Index of the candidate that was recorded. */
  recorded?: number;
  /** Candidates the user dismissed. */
  dismissed?: number[];
};

const storageKey = (userId?: number | string | null) =>
  `accounte_chat_loan_entries_v1_${userId ?? "anon"}`;
const MAX_REMEMBERED = 200;

/** Reads `metadata.loan_entry_candidates`, dropping anything unusable. */
export function getLoanEntryCandidates(metadata: unknown): LoanEntryCandidate[] {
  const raw = (metadata as { loan_entry_candidates?: unknown } | null | undefined)
    ?.loan_entry_candidates;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        Number(item.loan_id) > 0 &&
        Number(item.amount) > 0 &&
        (item.direction === "in" || item.direction === "out"),
    )
    .slice(0, 3)
    .map((item) => ({ ...item, loan_id: Number(item.loan_id), amount: Number(item.amount) }));
}

/**
 * Which candidate the server says was recorded already. The API appends
 * `{ index, loan_id, loan_payment_id, recorded_at }` to
 * `metadata.loan_entries_recorded[]` when POST /loans/{id}/payment carries
 * `chat_message_id` + `chat_loan_entry_index`. A bare index, a candidate's
 * own `recorded_at` and `transactions_saved_at` (-1: handled, candidate
 * unknown) are read too, like the web. Null when nothing is recorded.
 */
export function serverRecordedIndex(
  metadata: unknown,
  candidates: LoanEntryCandidate[],
): number | null {
  const meta = (metadata ?? {}) as {
    loan_entries_recorded?: unknown;
    transactions_saved_at?: unknown;
  };
  const recorded = meta.loan_entries_recorded;
  const list = Array.isArray(recorded)
    ? recorded
    : recorded && typeof recorded === "object"
      ? [recorded]
      : [];
  for (const entry of list) {
    if (typeof entry === "number" && entry >= 0) return entry;
    if (entry && typeof entry === "object") {
      const index = Number((entry as { index?: unknown }).index);
      if (Number.isInteger(index) && index >= 0) return index;
      const loanId = Number((entry as { loan_id?: unknown }).loan_id);
      const byLoan = candidates.findIndex((candidate) => candidate.loan_id === loanId);
      if (byLoan >= 0) return byLoan;
    }
  }
  const ownMark = candidates.findIndex((candidate) => !!candidate.recorded_at);
  if (ownMark >= 0) return ownMark;
  if (meta.transactions_saved_at) return -1;
  return null;
}

/** Indexes the API lists in `metadata.loan_entries_dismissed[]` ({ index, dismissed_at }). */
export function serverDismissedIndexes(metadata: unknown): number[] {
  const raw = (metadata as { loan_entries_dismissed?: unknown } | null | undefined)
    ?.loan_entries_dismissed;
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
  const indexes: number[] = [];
  list.forEach((entry) => {
    const index =
      typeof entry === "number" ? entry : Number((entry as { index?: unknown })?.index);
    if (Number.isInteger(index) && index >= 0) indexes.push(index);
  });
  return indexes;
}

/**
 * The phone's own memory of recorded / dismissed loan cards, per user. It
 * keeps a card done on an API that doesn't mark the message yet, and holds
 * dismissals (the server never hears about those).
 */
export function useLoanEntryMemory(userId?: number | string | null) {
  const [memory, setMemory] = useState<Record<string, LoanEntryLocalState>>({});

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(storageKey(userId))
      .then((raw) => {
        if (!alive || !raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setMemory(parsed);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [userId]);

  const remember = useCallback(
    (messageId: string | number, update: (prev: LoanEntryLocalState) => LoanEntryLocalState) => {
      setMemory((previous) => {
        const key = String(messageId);
        const next: Record<string, LoanEntryLocalState> = {
          ...previous,
          [key]: update(previous[key] ?? {}),
        };
        const keys = Object.keys(next);
        if (keys.length > MAX_REMEMBERED) {
          keys.slice(0, keys.length - MAX_REMEMBERED).forEach((old) => delete next[old]);
        }
        AsyncStorage.setItem(storageKey(userId), JSON.stringify(next)).catch(() => undefined);
        return next;
      });
    },
    [userId],
  );

  return { memory, remember };
}

type Props = {
  messageId: string | number;
  metadata: unknown;
  candidates: LoanEntryCandidate[];
  accounts: Account[];
  local?: LoanEntryLocalState;
  onRemember: (
    messageId: string | number,
    update: (prev: LoanEntryLocalState) => LoanEntryLocalState,
  ) => void;
};

/**
 * Confirm cards for a chat message about a loan: "Record on loan · Jake",
 * "Payment received · ৳500.00 · Nov 19", an account picker, Record / Dismiss.
 * Record posts the existing loan entry endpoint (POST /loans/{id}/payment).
 */
export function LoanEntryCards({
  messageId,
  metadata,
  candidates,
  accounts,
  local,
  onRemember,
}: Props) {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const serverIndex = serverRecordedIndex(metadata, candidates);
  const recordedIndex = serverIndex ?? (local?.recorded ?? null);
  const dismissed = [...serverDismissedIndexes(metadata), ...(local?.dismissed ?? [])];

  if (candidates.length === 0) return null;

  if (recordedIndex !== null) {
    const recorded = recordedIndex >= 0 ? candidates[recordedIndex] : undefined;
    return (
      <View style={styles.doneRow}>
        <Check size={14} color={colors.tertiary} strokeWidth={2.6} />
        <Text style={[styles.doneText, { color: colors.tertiary }]}>
          {recorded ? `Recorded on ${recorded.loan_name}` : "Recorded on the loan"}
        </Text>
      </View>
    );
  }

  const visible = candidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ index }) => !dismissed.includes(index));
  if (visible.length === 0) return null;

  const record = async (candidate: LoanEntryCandidate, index: number, accountId: number) => {
    if (savingIndex !== null) return;
    setSavingIndex(index);
    try {
      // `chat_message_id` + `chat_loan_entry_index` let the API mark the
      // message (older API builds ignore them; this phone remembers anyway).
      const payload = {
        payment_amount: candidate.amount,
        direction: candidate.direction,
        account_id: accountId,
        payment_date: candidate.payment_date || todayDateInputValue(),
        notes: candidate.notes || "Recorded from AI chat",
        chat_message_id: messageId,
        chat_loan_entry_index: index,
      };
      const result = await loanService.makePayment(candidate.loan_id, payload);
      if (!result.success) {
        toast.error(apiErrorMessage(result, "Couldn't record this on the loan. Please try again."));
        return;
      }
      onRemember(messageId, (prev) => ({ ...prev, recorded: index }));
      toast.success(`Recorded on ${candidate.loan_name}`);
      void invalidateMoneyQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["chat", "messages"] });
    } catch {
      toast.error("Couldn't record this on the loan. Please try again.");
    } finally {
      setSavingIndex(null);
    }
  };

  // Hidden at once; the API keeps it hidden on other devices (an API
  // without the endpoint still leaves it hidden on this phone).
  const dismiss = async (index: number) => {
    onRemember(messageId, (prev) => ({
      ...prev,
      dismissed: Array.from(new Set([...(prev.dismissed ?? []), index])),
    }));
    try {
      const result = await chatService.dismissLoanEntry(messageId, index);
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: ["chat", "messages"] });
      }
    } catch {
      // Remembered locally already.
    }
  };

  return (
    <View style={styles.wrap}>
      {visible.length > 1 && (
        <Text style={[styles.pickHint, { color: colors.onSurfaceVariant }]}>
          Which loan is this? Record it on one of these.
        </Text>
      )}
      {visible.map(({ candidate, index }) => (
        <LoanEntryCard
          key={`${candidate.loan_id}-${index}`}
          candidate={candidate}
          accounts={accounts}
          saving={savingIndex === index}
          disabled={savingIndex !== null}
          formatAmount={formatAmount}
          onRecord={(accountId) => void record(candidate, index, accountId)}
          onDismiss={() => void dismiss(index)}
        />
      ))}
    </View>
  );
}

function LoanEntryCard({
  candidate,
  accounts,
  saving,
  disabled,
  formatAmount,
  onRecord,
  onDismiss,
}: {
  candidate: LoanEntryCandidate;
  accounts: Account[];
  saving: boolean;
  disabled: boolean;
  formatAmount: (amount: number) => string;
  onRecord: (accountId: number) => void;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);

  const defaultAccountId = useMemo(() => {
    const suggested = Number(candidate.account_id);
    if (suggested > 0 && accounts.some((account) => account.id === suggested)) return suggested;
    return (accounts.find((account) => account.is_default) ?? accounts[0])?.id ?? null;
  }, [accounts, candidate.account_id]);
  // The picked account, else the suggested / default one (accounts may
  // load after the card first renders).
  const [pickedAccountId, setAccountId] = useState<number | null>(null);
  const accountId = pickedAccountId ?? defaultAccountId;

  const selected = accounts.find((account) => account.id === accountId);
  const label =
    candidate.label ||
    (candidate.direction === "in"
      ? candidate.kind === "top_up"
        ? "Amount borrowed"
        : "Payment received"
      : candidate.kind === "top_up"
        ? "Amount given"
        : "Repayment sent");
  const dateLabel = candidate.payment_date
    ? formatDate(String(candidate.payment_date).slice(0, 10), { month: "short", day: "numeric", year: "numeric" })
    : "Today";
  const accountLabel = candidate.direction === "in" ? "Into account" : "From account";

  return (
    <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
      <View style={styles.header}>
        <View style={[styles.iconTile, { backgroundColor: colors.primaryContainer }]}>
          <HandCoins size={18} color={colors.primary} strokeWidth={2.2} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={2}>
            Record on loan · {candidate.loan_name}
          </Text>
          <Sensitive>
            <Text style={[styles.line, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
              {label} · {formatAmount(candidate.amount)} · {dateLabel}
            </Text>
          </Sensitive>
          {candidate.remaining_balance != null && Number.isFinite(Number(candidate.remaining_balance)) && (
            <Sensitive>
              <Text style={[styles.subLine, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                Balance before this entry {formatAmount(Number(candidate.remaining_balance))}
              </Text>
            </Sensitive>
          )}
        </View>
      </View>

      {/* Account picker — inline, so it works inside the chat list. */}
      <Pressable
        onPress={() => setPickerOpen((open) => !open)}
        disabled={disabled || accounts.length === 0}
        accessibilityRole="button"
        accessibilityLabel={`${accountLabel}: ${selected?.account_name ?? "choose an account"}`}
      >
        <View style={[styles.accountRow, { borderColor: colors.outlineVariant }]}>
          <View style={styles.accountText}>
            <Text style={[styles.accountCaption, { color: colors.onSurfaceVariant }]}>
              {accountLabel}
            </Text>
            <Text style={[styles.accountName, { color: colors.onSurface }]} numberOfLines={1}>
              {selected?.account_name ?? (accounts.length ? "Choose an account" : "No accounts yet")}
            </Text>
          </View>
          {pickerOpen ? (
            <ChevronUp size={18} color={colors.onSurfaceVariant} />
          ) : (
            <ChevronDown size={18} color={colors.onSurfaceVariant} />
          )}
        </View>
      </Pressable>
      {pickerOpen && (
        <View style={[styles.accountList, { borderColor: colors.outlineVariant }]}>
          {accounts.map((account) => {
            const active = account.id === accountId;
            return (
              <Pressable
                key={account.id}
                onPress={() => {
                  setAccountId(account.id);
                  setPickerOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <View
                  style={[
                    styles.accountOption,
                    active && { backgroundColor: `${colors.primary}1F` },
                  ]}
                >
                  <Text
                    style={[
                      styles.accountOptionText,
                      { color: active ? colors.primary : colors.onSurface },
                    ]}
                    numberOfLines={1}
                  >
                    {account.account_name}
                  </Text>
                  {active && <Check size={16} color={colors.primary} strokeWidth={2.6} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.actions}>
        <Button mode="text" compact onPress={onDismiss} disabled={disabled}>
          Dismiss
        </Button>
        <Button
          mode="contained"
          compact
          onPress={() => accountId && onRecord(accountId)}
          disabled={disabled || !accountId}
          icon={saving ? () => <ActivityIndicator size={14} color={colors.onPrimary} /> : undefined}
        >
          {saving ? "Recording…" : "Record"}
        </Button>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginTop: 8,
  },
  pickHint: {
    fontSize: 12,
  },
  card: {
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  line: {
    fontSize: 13,
  },
  subLine: {
    fontSize: 12,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  accountText: {
    flex: 1,
    minWidth: 0,
  },
  accountCaption: {
    fontSize: 11,
    fontWeight: "600",
  },
  accountName: {
    fontSize: 14,
    fontWeight: "600",
  },
  accountList: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 4,
  },
  accountOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  accountOptionText: {
    flex: 1,
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  doneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  doneText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export default LoanEntryCards;
