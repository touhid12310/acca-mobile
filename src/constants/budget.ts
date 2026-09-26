/**
 * Budget cut-offs, in percent of the budget spent. They match the server's
 * BudgetAlertService::WARN_THRESHOLD / LIMIT_THRESHOLD, so a budget shows as
 * "near limit" at the moment the "Budget nearing limit" alert goes out.
 * notification-settings.tsx prints the 75 in its copy — change both together.
 */
export const BUDGET_WARN_PERCENT = 75;
export const BUDGET_LIMIT_PERCENT = 100;
