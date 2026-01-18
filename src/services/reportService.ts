import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import {
  MonthlySummary,
  CategoryBreakdown,
  NetWorthData,
  IncomeStatement,
  BalanceSheet,
  ApiResponse,
} from '../types';

export const reportService = {
  getMonthlySummary: async (months: number = 6): Promise<ApiResponse<MonthlySummary[]>> => {
    const token = await getAuthToken();
    return apiRequest<MonthlySummary[]>(
      `${API_CONFIG.ENDPOINTS.REPORTS_MONTHLY_SUMMARY}?months=${months}`,
      {
        method: 'GET',
        token,
      }
    );
  },

  getCategoryBreakdown: async (params: {
    start_date?: string;
    end_date?: string;
    type?: 'income' | 'expense';
  } = {}): Promise<ApiResponse<CategoryBreakdown[]>> => {
    const token = await getAuthToken();
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.type) queryParams.append('type', params.type);

    const query = queryParams.toString();
    const endpoint = query
      ? `${API_CONFIG.ENDPOINTS.REPORTS_CATEGORY_BREAKDOWN}?${query}`
      : API_CONFIG.ENDPOINTS.REPORTS_CATEGORY_BREAKDOWN;

    return apiRequest<CategoryBreakdown[]>(endpoint, {
      method: 'GET',
      token,
    });
  },

  getNetWorthTimeline: async (months: number = 6): Promise<ApiResponse<NetWorthData[]>> => {
    const token = await getAuthToken();
    return apiRequest<NetWorthData[]>(
      `${API_CONFIG.ENDPOINTS.REPORTS_NET_WORTH_TIMELINE}?months=${months}`,
      {
        method: 'GET',
        token,
      }
    );
  },

  getSummaryStats: async (months: number = 6): Promise<
    ApiResponse<{
      total_income: number;
      total_expenses: number;
      net_savings: number;
      savings_rate: number;
      average_monthly_income: number;
      average_monthly_expense: number;
    }>
  > => {
    const token = await getAuthToken();
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.REPORTS_SUMMARY_STATS}?months=${months}`,
      {
        method: 'GET',
        token,
      }
    );
  },

  getIncomeStatement: async (params: {
    start_date?: string;
    end_date?: string;
    period?: 'monthly' | 'quarterly' | 'yearly';
  } = {}): Promise<ApiResponse<IncomeStatement>> => {
    const token = await getAuthToken();
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.period) queryParams.append('period', params.period);

    const query = queryParams.toString();
    const endpoint = query
      ? `${API_CONFIG.ENDPOINTS.REPORTS_INCOME_STATEMENT}?${query}`
      : API_CONFIG.ENDPOINTS.REPORTS_INCOME_STATEMENT;

    return apiRequest<IncomeStatement>(endpoint, {
      method: 'GET',
      token,
    });
  },

  getBalanceSheet: async (params: {
    as_of_date?: string;
  } = {}): Promise<ApiResponse<BalanceSheet>> => {
    const token = await getAuthToken();
    const queryParams = new URLSearchParams();
    if (params.as_of_date) queryParams.append('as_of_date', params.as_of_date);

    const query = queryParams.toString();
    const endpoint = query
      ? `${API_CONFIG.ENDPOINTS.REPORTS_BALANCE_SHEET}?${query}`
      : API_CONFIG.ENDPOINTS.REPORTS_BALANCE_SHEET;

    return apiRequest<BalanceSheet>(endpoint, {
      method: 'GET',
      token,
    });
  },
};

export default reportService;
