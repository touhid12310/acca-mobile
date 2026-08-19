import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { ApiResponse } from '../types';
import transactionService from './transactionService';
import accountService from './accountService';
import reportService from './reportService';
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

      // Fetch all data in parallel
      const [accountsRes, monthlyTransactionsRes, recentTransactionsRes, netWorthRes] = await Promise.allSettled([
        accountService.getAll(),
        transactionService.getAll({ start_date: start, end_date: end, per_page: 1 }),
        transactionService.getAll({ per_page: 10 }),
        reportService.getNetWorth({ as_of_date: today }),
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

      const dashboardData: DashboardData = {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        netWorth:
          serverNetWorth !== undefined && serverNetWorth !== null
            ? toNumber(serverNetWorth)
            : totalBalance,
        accounts: accountsData.slice(0, 5),
        recentTransactions: recentTransactionsData.slice(0, 6).map((t: any) => ({
          id: t.id,
          merchant_name: t.merchant_name || t.notes || t.description || 'Transaction',
          amount: toNumber(t.amount),
          type: t.type,
          balance_direction: t.balance_direction ?? null,
          transfer_pair_id: t.transfer_pair_id ?? null,
          notes: t.notes || null,
          date: t.date,
          category: t.category?.name || t.transaction_categories?.[0]?.category?.name || null,
        })),
        budgetSummary: null,
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
