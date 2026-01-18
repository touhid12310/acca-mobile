import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { ApiResponse } from '../types';
import transactionService from './transactionService';
import accountService from './accountService';

// Helper to get current month date range
const getMonthRange = (offset = 0) => {
  const now = new Date();
  const startDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1)
  );
  const endDate = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0)
  );
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
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

      // Fetch all data in parallel
      const [accountsRes, monthlyTransactionsRes, recentTransactionsRes] = await Promise.allSettled([
        accountService.getAll(),
        transactionService.getAll({ start_date: start, end_date: end, per_page: 100 }),
        transactionService.getAll({ per_page: 10 }),
      ]);

      // Process accounts
      const accountsData = accountsRes.status === 'fulfilled'
        ? normalizeArrayResponse(accountsRes.value)
        : [];

      // Process monthly transactions and calculate stats
      const monthlyTransactions = monthlyTransactionsRes.status === 'fulfilled'
        ? normalizePaginatedResponse(monthlyTransactionsRes.value)
        : [];

      // Calculate monthly income and expenses from transactions
      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      monthlyTransactions.forEach((t: any) => {
        const amount = toNumber(t.amount);
        if (t.type === 'income') {
          monthlyIncome += amount;
        } else if (t.type === 'expense') {
          monthlyExpenses += amount;
        }
      });

      // Process recent transactions
      const recentTransactionsData = recentTransactionsRes.status === 'fulfilled'
        ? normalizePaginatedResponse(recentTransactionsRes.value)
        : [];

      // Calculate totals
      const totalBalance = accountsData.reduce(
        (sum: number, account: any) => sum + toNumber(account.current_balance),
        0
      );

      const dashboardData: DashboardData = {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        netWorth: totalBalance,
        accounts: accountsData.slice(0, 5),
        recentTransactions: recentTransactionsData.slice(0, 6).map((t: any) => ({
          id: t.id,
          merchant_name: t.merchant_name || t.notes || t.description || 'Transaction',
          amount: toNumber(t.amount),
          type: t.type,
          date: t.date,
          category: t.category?.name || t.expense_categories?.[0]?.category?.name || null,
        })),
        budgetSummary: null,
      };

      return { success: true, data: dashboardData };
    } catch (error) {
      console.error('Dashboard fetch error:', error);
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
