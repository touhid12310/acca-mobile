import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { Budget, ApiResponse, Transaction } from '../types';

export const budgetService = {
  getAll: async (filters: {
    month?: string;
    year?: number;
  } = {}): Promise<ApiResponse<Budget[]>> => {
    const token = await getAuthToken();
    const params = new URLSearchParams(
      Object.entries(filters)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();

    const endpoint = params
      ? `${API_CONFIG.ENDPOINTS.BUDGETS}?${params}`
      : API_CONFIG.ENDPOINTS.BUDGETS;

    return apiRequest<Budget[]>(endpoint, {
      method: 'GET',
      token,
    });
  },

  getById: async (id: number): Promise<ApiResponse<Budget>> => {
    const token = await getAuthToken();
    return apiRequest<Budget>(`${API_CONFIG.ENDPOINTS.BUDGETS}/${id}`, {
      method: 'GET',
      token,
    });
  },

  create: async (data: Partial<Budget>): Promise<ApiResponse<Budget>> => {
    const token = await getAuthToken();
    return apiRequest<Budget>(API_CONFIG.ENDPOINTS.BUDGETS, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  update: async (id: number, data: Partial<Budget>): Promise<ApiResponse<Budget>> => {
    const token = await getAuthToken();
    return apiRequest<Budget>(`${API_CONFIG.ENDPOINTS.BUDGETS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(`${API_CONFIG.ENDPOINTS.BUDGETS}/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  /**
   * Approved expenses dated inside one budget period, newest first, every
   * page (QA AE-115). The API filters categories by name only, so a
   * one-category budget narrows by name and the caller still matches each
   * row on category / subcategory ids.
   */
  getPeriodTransactions: async (params: {
    start_date: string;
    end_date: string;
    category?: string;
  }): Promise<ApiResponse<Transaction[]>> => {
    const token = await getAuthToken();
    const rows: Transaction[] = [];
    let page = 1;
    let lastPage = 1;

    do {
      const query = new URLSearchParams({
        type: 'expense',
        status: 'approved',
        start_date: params.start_date,
        end_date: params.end_date,
        sort_by: 'date',
        sort_order: 'desc',
        per_page: '500',
        page: String(page),
        ...(params.category ? { category: params.category } : {}),
      }).toString();

      const response = await apiRequest<any>(`${API_CONFIG.ENDPOINTS.TRANSACTIONS}?${query}`, {
        method: 'GET',
        token,
      });
      if (!response.success) return response as ApiResponse<Transaction[]>;

      const envelope: any = response.data;
      const paginator: any = envelope?.data?.data ? envelope.data : envelope;
      if (Array.isArray(paginator?.data)) rows.push(...paginator.data);
      lastPage = Math.min(Number(paginator?.last_page || 1), 20);
      page += 1;
    } while (page <= lastPage);

    return { success: true, data: rows } as ApiResponse<Transaction[]>;
  },

  getSummary: async (): Promise<
    ApiResponse<{
      total_budgeted: number;
      total_spent: number;
      remaining: number;
      budgets: Budget[];
    }>
  > => {
    const token = await getAuthToken();
    return apiRequest(`${API_CONFIG.ENDPOINTS.BUDGETS}/summary`, {
      method: 'GET',
      token,
    });
  },
};

export default budgetService;
