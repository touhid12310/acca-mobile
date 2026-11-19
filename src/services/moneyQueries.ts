import type { QueryClient } from '@tanstack/react-query';

/**
 * First query-key segments whose data depends on transactions, balances or
 * loans. After any write that moves money (save / edit / archive / restore /
 * delete a transaction, record a loan entry, reconcile create, goal
 * contribution, transfer…) every one of these must be refetched, otherwise a
 * screen keeps showing old totals for up to the 5-minute staleTime
 * (QA AE-07, AE-95, AE-96, AE-98).
 */
const MONEY_QUERY_ROOTS = new Set<string>([
  'transactions',
  'transaction',
  'dashboard',
  'dashboard-period',
  'dashboard-last-month',
  'dashboard-cashflow',
  'dashboard-expense-breakdown',
  'accounts',
  'account',
  'paymentMethods',
  'reports',
  'loans',
  'budgets',
  'goals',
  'schedules',
  'notifications',
  'duplicate-check',
]);

export function isMoneyQueryKey(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  return typeof root === 'string' && MONEY_QUERY_ROOTS.has(root);
}

/** Refetch every money-related query (active ones now, inactive ones on next use). */
export function invalidateMoneyQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => isMoneyQueryKey(query.queryKey),
  });
}
