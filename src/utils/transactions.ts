import { Transaction } from "../types";

export type TransferDirection = "in" | "out" | null;

/**
 * Direction of a transfer leg relative to the account it sits on.
 * The backend writes two rows per transfer with an immutable signed ledger
 * direction. User-editable notes are never used to infer money movement.
 */
export function getTransferDirection(
  t: Pick<Transaction, "type" | "balance_direction">,
): TransferDirection {
  if (t.type !== "transfer") return null;
  if (t.balance_direction === "credit") return "in";
  if (t.balance_direction === "debit") return "out";
  return null;
}

export interface CategoryShare {
  name: string;
  amount: number;
}

/**
 * How much of a transaction belongs to each category. The pivot rows
 * (transaction_categories) only record WHICH categories touch the transaction;
 * the actual money split lives on the item rows via their category_id. Same
 * allocation as the web dashboard and the backend reports: categorized item
 * totals go to their own category, any un-itemized remainder follows the
 * first (primary) category.
 */
export function splitTransactionByCategory(t: {
  amount: number | string;
  category?: { name?: string } | string | null;
  transaction_categories?: {
    category_id?: number;
    category?: { name?: string } | null;
  }[];
  items?: {
    category_id?: number | null;
    total?: number | string | null;
    price?: number | string | null;
    quantity?: number | string | null;
  }[];
}): CategoryShare[] {
  const amount = parseFloat(String(t.amount)) || 0;
  const pivotRows = Array.isArray(t.transaction_categories)
    ? t.transaction_categories
    : [];

  const nameById = new Map<number, string>();
  pivotRows.forEach((row) => {
    const name = row?.category?.name;
    if (row?.category_id && name) nameById.set(row.category_id, name);
  });

  const fallbackCategory =
    typeof t.category === "string" ? t.category : t.category?.name;
  const primaryName =
    pivotRows[0]?.category?.name || fallbackCategory || "Uncategorized";

  const items = Array.isArray(t.items) ? t.items : [];
  const hasItemSplit =
    nameById.size > 1 && items.some((item) => item?.category_id);

  if (!hasItemSplit) {
    return [{ name: primaryName, amount }];
  }

  const totals = new Map<string, number>();
  let allocated = 0;
  items.forEach((item) => {
    const itemAmount =
      (parseFloat(String(item.total ?? "")) || 0) ||
      (parseFloat(String(item.price ?? "")) || 0) *
        (parseFloat(String(item.quantity ?? "")) || 1);
    if (itemAmount <= 0) return;
    const name =
      (item.category_id != null && nameById.get(item.category_id)) ||
      primaryName;
    totals.set(name, (totals.get(name) ?? 0) + itemAmount);
    allocated += itemAmount;
  });

  const remainder = amount - allocated;
  if (remainder > 0.009) {
    totals.set(primaryName, (totals.get(primaryName) ?? 0) + remainder);
  }

  return Array.from(totals.entries()).map(([name, value]) => ({
    name,
    amount: value,
  }));
}

/**
 * "+" when the row increases its account's balance, "−" when it decreases it.
 *
 * Mirrors AccountBalanceService::calculateAccountBalance(), which checks
 * balance_direction BEFORE type:
 *
 *   WHEN balance_direction = 'credit' THEN  amount
 *   WHEN balance_direction = 'debit'  THEN -amount
 *   WHEN type IN ('income','asset')   THEN  amount
 *   WHEN type IN ('expense','liability') THEN -amount
 *   ELSE 0
 *
 * Switching on `type` first got loan rows backwards: "Loan Received" is stored
 * as type=liability with balance_direction=credit, so it rendered as money
 * leaving the account while the balance it feeds went up.
 */
export function getAmountSign(
  t: Pick<Transaction, "type" | "balance_direction">,
): "+" | "−" | "" {
  if (t.balance_direction === "credit") return "+";
  if (t.balance_direction === "debit") return "−";

  switch (t.type) {
    case "income":
    case "asset":
      return "+";
    case "expense":
    case "liability":
      return "−";
    default:
      // Legacy transfer with no backfilled direction: the server scores it 0,
      // so there is no honest sign to show.
      return "";
  }
}
