import { Transaction } from "../types";
import { parseCalendarDate } from "./date";

/**
 * Reconcile's "Match" picker (QA AE-54): which of the account's ledger rows a
 * statement line could be. The web twin is
 * acca-tanstack/src/utils/reconcileMatch.js — keep the two in step.
 */

/** A suggestion may be dated this many days before or after the line. */
export const MATCH_WINDOW_DAYS = 7;

/** ...and differ from the line's amount by up to this share of it. */
export const MATCH_AMOUNT_TOLERANCE = 0.1;

/** At most this many rows in the picker. */
export const MATCH_LIST_LIMIT = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The bits of a statement line the matcher reads. */
export interface MatchableLine {
  date?: string;
  amount?: number | string;
  type?: string;
  balance_direction?: string;
}

export interface MatchCandidate {
  transaction: Transaction;
  /** The row's date minus the line's, in days (negative = the row is earlier). */
  dayGap: number | null;
  amountDiff: number;
  sameAmount: boolean;
}

/** The unsigned amount of a row or statement line ("1,234.50" → 1234.5). */
export const amountOf = (value: unknown): number => {
  const number = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? Math.abs(number) : 0;
};

/** "credit" (money in), "debit" (money out), or null when it can't tell. */
export const directionOf = (transaction: unknown): string | null => {
  const tx = (transaction ?? {}) as { balance_direction?: string; type?: string };
  if (tx.balance_direction) return tx.balance_direction;
  if (tx.type === "income" || tx.type === "liability") return "credit";
  if (tx.type === "expense" || tx.type === "asset") return "debit";
  return null;
};

/** Days since 1970 for a calendar date (local day), or null. */
const dayNumber = (value: unknown): number | null => {
  if (!value) return null;
  const date = parseCalendarDate(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return Math.round(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS,
  );
};

/** A ledger row's day number, worked out once per row object. */
const rowDays = new WeakMap<object, number | null>();
const dayOfRow = (row: Transaction): number | null => {
  if (!rowDays.has(row)) rowDays.set(row, dayNumber(row.date));
  return rowDays.get(row) ?? null;
};

/** The row's category names, "Food › Groceries" style. */
export const categoryLabelOf = (row: Transaction): string => {
  const entries: any[] = Array.isArray((row as any)?.transaction_categories)
    ? (row as any).transaction_categories
    : [];
  const labels = entries
    .map((entry) => {
      const name = entry?.category?.name;
      if (!name) return null;
      return entry?.subcategory?.name
        ? `${name} › ${entry.subcategory.name}`
        : name;
    })
    .filter(Boolean) as string[];
  const unique = [...new Set(labels)];
  if (unique.length) return unique.join(", ");
  if (row?.type === "transfer") return "Transfer";
  return (row as any)?.category?.name || "";
};

const searchText = (row: Transaction): string =>
  [
    row?.merchant_name,
    row?.description,
    row?.notes,
    categoryLabelOf(row),
    amountOf(row?.amount).toFixed(2),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

/**
 * Ledger rows the statement line could be, best first.
 *
 * Without a search: same direction (money in / out), dated within
 * MATCH_WINDOW_DAYS of the line, amount within MATCH_AMOUNT_TOLERANCE.
 * With a search: any row whose merchant, description, notes, category or
 * amount contains it, nearest date first.
 * `excludeIds` are rows already matched to another line, confirmed or
 * created in this reconcile — never offered twice.
 */
export const findMatchCandidates = (
  line: MatchableLine | null | undefined,
  ledgerRows: Transaction[] | null | undefined,
  {
    excludeIds = [],
    query = "",
  }: { excludeIds?: (number | string | null | undefined)[]; query?: string } = {},
): MatchCandidate[] => {
  if (!line) return [];

  const excluded = new Set(
    excludeIds.filter((id) => id != null).map((id) => String(id)),
  );
  const lineAmount = amountOf(line.amount);
  const lineDay = dayNumber(line.date);
  const lineDirection = directionOf(line);
  const tolerance = Math.max(0.01, lineAmount * MATCH_AMOUNT_TOLERANCE);
  const needle = String(query || "").trim().toLowerCase();

  const results: MatchCandidate[] = [];
  (Array.isArray(ledgerRows) ? ledgerRows : []).forEach((row) => {
    if (!row || row.id == null || excluded.has(String(row.id))) return;

    const rowDay = dayOfRow(row);
    const dayGap = rowDay === null || lineDay === null ? null : rowDay - lineDay;
    const amountDiff = Math.abs(amountOf(row.amount) - lineAmount);

    if (needle) {
      if (!searchText(row).includes(needle)) return;
    } else {
      const rowDirection = directionOf(row);
      if (lineDirection && rowDirection && lineDirection !== rowDirection) {
        return;
      }
      if (dayGap === null || Math.abs(dayGap) > MATCH_WINDOW_DAYS) return;
      if (amountDiff > tolerance + 1e-9) return;
    }

    results.push({
      transaction: row,
      dayGap,
      amountDiff,
      sameAmount: amountDiff < 0.005,
    });
  });

  const distance = (gap: number | null) =>
    gap === null ? Number.MAX_SAFE_INTEGER : Math.abs(gap);

  return results
    .sort(
      (a, b) =>
        (needle ? 0 : Number(b.sameAmount) - Number(a.sameAmount)) ||
        distance(a.dayGap) - distance(b.dayGap) ||
        a.amountDiff - b.amountDiff ||
        (Number(b.transaction.id) || 0) - (Number(a.transaction.id) || 0),
    )
    .slice(0, MATCH_LIST_LIMIT);
};

/** "Same day", "2 days earlier", "1 day later" (the row against the line). */
export const describeDayGap = (dayGap: number | null | undefined): string => {
  if (dayGap === null || dayGap === undefined) return "";
  if (dayGap === 0) return "Same day";
  const days = Math.abs(dayGap);
  return `${days} ${days === 1 ? "day" : "days"} ${dayGap < 0 ? "earlier" : "later"}`;
};
