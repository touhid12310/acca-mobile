import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { ApiResponse } from '../types';
import transactionService from './transactionService';
import accountService from './accountService';
import reportService from './reportService';
import budgetService from './budgetService';
import { toDateInputValue } from '../utils/date';

// Helper to get current month date range
const getMonthRange = (offset = 0) => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  return {
    start: toDateInputValue(startDate),
    end: toDateInputValue(endDate),
  };
};

// Helper to safely convert to number
const toNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

// Normalize array response from API
const normalizeArrayResponse = (response: any, fallback: any[] = []): any[] => {
  if (!response || response.success === false) return fallback;
  if (response.data?.success === false) return fallback;
  const payload = response.data?.data ?? response.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return fallback;
};

// Normalize paginated response
const normalizePaginatedResponse = (response: any, fallback: any[] = []): any[] => {
  if (!response || response.success === false) return fallback;
  if (response.data?.success === false) return fallback;
  const payload = response.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return fallback;
};

export interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netWorth: number;
  /**
   * Net worth at the end of last month, from the net-worth timeline (the
   * figure Home compares today's net worth with). Null when the timeline
   * couldn't be loaded.
   */
  netWorthLastMonth: number | null;
  accounts: any[];
  recentTransactions: any[];
  budgetSummary: {
    total_budgeted: number;
    total_spent: number;
    remaining: number;
  } | null;
}

export const dashboardService = {
  getDashboardData: async (): Promise<ApiResponse<DashboardData>> => {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { start, end } = getMonthRange(0);
      const today = toDateInputValue(new Date());

      // Fetch all data in parallel. Recent activity is the newest by
      // transaction date, then by when it was added (the API breaks a date tie
      // by id) — not simply the last ids, which hid newer-dated rows (AE-20).
      const [
        accountsRes,
        monthlyTransactionsRes,
        recentTransactionsRes,
        netWorthRes,
        budgetsSummaryRes,
        netWorthTimelineRes,
      ] = await Promise.allSettled([
        accountService.getAll(),
        transactionService.getAll({ start_date: start, end_date: end, per_page: 1 }),
        transactionService.getAll({ per_page: 10, sort_by: 'date', sort_order: 'desc' }),
        reportService.getNetWorth({ as_of_date: today }),
        budgetService.getSummary(),
        // [end of last month, today]
        reportService.getNetWorthTimeline(2),
      ]);

      // Process accounts
      const accountsData = accountsRes.status === 'fulfilled'
        ? normalizeArrayResponse(accountsRes.value)
        : [];

      // Use the server's full-set stats block, not the paginated row array.
      const monthlyPayload: any =
        monthlyTransactionsRes.status === 'fulfilled' ? monthlyTransactionsRes.value?.data : null;
      const monthlyStats = monthlyPayload?.stats ?? {};
      const monthlyIncome = toNumber(monthlyStats.total_income);
      const monthlyExpenses = toNumber(monthlyStats.total_expenses);

      // Process recent transactions
      const recentTransactionsData = recentTransactionsRes.status === 'fulfilled'
        ? normalizePaginatedResponse(recentTransactionsRes.value)
        : [];

      // Calculate totals
      const totalBalance = accountsData.reduce(
        (sum: number, account: any) => sum + toNumber(account.current_balance),
        0
      );

      const netWorthPayload: any =
        netWorthRes.status === 'fulfilled' ? netWorthRes.value?.data : null;
      const serverNetWorth =
        netWorthPayload?.data?.net_worth ?? netWorthPayload?.net_worth;

      const summaryPayload: any =
        budgetsSummaryRes.status === 'fulfilled' ? budgetsSummaryRes.value?.data : null;
      const summaryBlock = summaryPayload?.data ?? summaryPayload ?? null;
      const totalBudgeted = toNumber(summaryBlock?.total_budgeted);
      const totalSpent = toNumber(summaryBlock?.total_spent);
      const remaining = toNumber(
        summaryBlock?.total_remaining ?? summaryBlock?.remaining ?? totalBudgeted - totalSpent,
      );
      const budgetSummary =
        budgetsSummaryRes.status === 'fulfilled' && summaryBlock
          ? {
              total_budgeted: totalBudgeted,
              total_spent: totalSpent,
              remaining,
            }
          : null;

      // Net worth timeline: { labels, netWorth: [lastMonthEnd, today] }.
      const timelinePayload: any =
        netWorthTimelineRes.status === 'fulfilled' && netWorthTimelineRes.value?.success
          ? netWorthTimelineRes.value.data
          : null;
      const timelineBlock = timelinePayload?.data ?? timelinePayload;
      const timelineSeries: unknown[] = Array.isArray(timelineBlock?.netWorth)
        ? timelineBlock.netWorth
        : Array.isArray(timelineBlock?.net_worth)
          ? timelineBlock.net_worth
          : [];
      const netWorthLastMonth =
        timelineSeries.length >= 2 ? toNumber(timelineSeries[timelineSeries.length - 2]) : null;

      // Same calendar day → keep the server's order (date, then id).
      const recentSorted = [...recentTransactionsData].sort((a: any, b: any) => {
        const dateA = String(a?.date ?? '').slice(0, 10);
        const dateB = String(b?.date ?? '').slice(0, 10);
        if (dateA !== dateB) return dateA < dateB ? 1 : -1;
        return toNumber(b?.id) - toNumber(a?.id);
      });

      const dashboardData: DashboardData = {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        netWorth:
          serverNetWorth !== undefined && serverNetWorth !== null
            ? toNumber(serverNetWorth)
            : totalBalance,
        netWorthLastMonth,
        accounts: accountsData.slice(0, 5),
        recentTransactions: recentSorted.slice(0, 6).map((t: any) => ({
          id: t.id,
          merchant_name: t.merchant_name || t.notes || t.description || 'Transaction',
          amount: toNumber(t.amount),
          type: t.type,
          balance_direction: t.balance_direction ?? null,
          transfer_pair_id: t.transfer_pair_id ?? null,
          notes: t.notes || null,
          date: t.date,
          // When it was added — "… ago" is measured from this, not from the
          // calendar date (which the API sends as UTC midnight).
          created_at: t.created_at ?? null,
          status: t.status ?? null,
          category: t.category?.name || t.transaction_categories?.[0]?.category?.name || null,
        })),
        budgetSummary,
      };

      return { success: true, data: dashboardData };
    } catch (error) {
      return { success: false, error: 'Failed to load dashboard data' };
    }
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    const token = await getAuthToken();
    return apiRequest(API_CONFIG.ENDPOINTS.DASHBOARD_STATS, {
      method: 'GET',
      token,
    });
  },
};

export default dashboardService;
