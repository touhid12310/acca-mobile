import API_CONFIG, { apiRequest, buildApiUrl, getAuthToken } from '../config/api';
import { Transaction, TransactionFormData, ApiResponse, PaginatedResponse } from '../types';

interface TransactionFilters {
  page?: number;
  per_page?: number;
  type?: string;
  category_id?: number;
  account_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export const transactionService = {
  getAll: async (
    filters: TransactionFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<Transaction>>> => {
    const token = await getAuthToken();
    const queryString = new URLSearchParams(
      Object.entries(filters)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString();

    const endpoint = queryString
      ? `${API_CONFIG.ENDPOINTS.TRANSACTIONS}?${queryString}`
      : API_CONFIG.ENDPOINTS.TRANSACTIONS;

    return apiRequest<PaginatedResponse<Transaction>>(endpoint, {
      method: 'GET',
      token,
    });
  },

  getById: async (id: number): Promise<ApiResponse<Transaction>> => {
    const token = await getAuthToken();
    return apiRequest<Transaction>(`${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}`, {
      method: 'GET',
      token,
    });
  },

  create: async (data: TransactionFormData): Promise<ApiResponse<Transaction>> => {
    const token = await getAuthToken();
    return apiRequest<Transaction>(API_CONFIG.ENDPOINTS.TRANSACTION_CREATE, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  update: async (
    id: number,
    data: Partial<TransactionFormData>
  ): Promise<ApiResponse<Transaction>> => {
    const token = await getAuthToken();
    return apiRequest<Transaction>(`${API_CONFIG.ENDPOINTS.TRANSACTION_UPDATE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(`${API_CONFIG.ENDPOINTS.TRANSACTION_DELETE}/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  bulkCreate: async (transactions: TransactionFormData[]): Promise<ApiResponse<Transaction[]>> => {
    const token = await getAuthToken();
    return apiRequest<Transaction[]>(API_CONFIG.ENDPOINTS.TRANSACTION_BULK_CREATE, {
      method: 'POST',
      body: JSON.stringify({ transactions }),
      token,
    });
  },

  processReceipt: async (file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<ApiResponse<{ expense_candidates: Transaction[] }>> => {
    const token = await getAuthToken();

    if (!token) {
      return {
        success: false,
        status: 401,
        error: 'Authentication required',
      };
    }

    const formData = new FormData();
    formData.append('receipt_file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.TRANSACTION_PROCESS_RECEIPT),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      return {
        success: response.ok,
        status: response.status,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  processCsv: async (file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<ApiResponse<{ transactions: Transaction[] }>> => {
    const token = await getAuthToken();

    if (!token) {
      return {
        success: false,
        status: 401,
        error: 'Authentication required',
      };
    }

    const formData = new FormData();
    formData.append('csv_file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.TRANSACTION_PROCESS_CSV),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      return {
        success: response.ok,
        status: response.status,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  searchMerchants: async (
    searchTerm: string = '',
    limit: number = 8
  ): Promise<ApiResponse<string[]>> => {
    const token = await getAuthToken();
    const queryParams = new URLSearchParams();
    if (searchTerm) {
      queryParams.append('search', searchTerm);
    }
    queryParams.append('limit', String(limit));

    return apiRequest<string[]>(
      `${API_CONFIG.ENDPOINTS.TRANSACTION_MERCHANTS}?${queryParams.toString()}`,
      {
        method: 'GET',
        token,
      }
    );
  },

  createTransfer: async (transferData: {
    from_account_id: number;
    to_account_id: number;
    amount: number;
    date: string;
    notes?: string;
  }): Promise<ApiResponse<Transaction>> => {
    const token = await getAuthToken();
    return apiRequest<Transaction>(API_CONFIG.ENDPOINTS.TRANSACTION_TRANSFER, {
      method: 'POST',
      body: JSON.stringify(transferData),
      token,
    });
  },
};

export default transactionService;
