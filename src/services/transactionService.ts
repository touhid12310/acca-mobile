import API_CONFIG, {
  apiRequest,
  buildApiUrl,
  getAuthToken,
} from "../config/api";
import {
  Transaction,
  TransactionFormData,
  ApiResponse,
  PaginatedResponse,
} from "../types";

interface TransactionFilters {
  page?: number;
  per_page?: number;
  type?: string;
  category_id?: number;
  account_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
  sort_by?: "date" | "amount" | "id";
  sort_order?: "asc" | "desc";
}

export interface InboundEmailBody {
  from: string | null;
  subject: string | null;
  received_at: string | null;
  attachment_count: number;
  body_text: string | null;
}

const transactionService = {
  getAll: async (
    filters: TransactionFilters = {},
  ): Promise<ApiResponse<PaginatedResponse<Transaction>>> => {
    const token = await getAuthToken();
    const queryString = new URLSearchParams(
      Object.entries(filters)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)]),
    ).toString();

    const endpoint = queryString
      ? `${API_CONFIG.ENDPOINTS.TRANSACTIONS}?${queryString}`
      : API_CONFIG.ENDPOINTS.TRANSACTIONS;

    return apiRequest<PaginatedResponse<Transaction>>(endpoint, {
      method: "GET",
      token,
    });
  },

  getAllPages: async (
    filters: TransactionFilters = {},
  ): Promise<ApiResponse<Transaction[]>> => {
    const rows: Transaction[] = [];
    let page = 1;
    let lastPage = 1;

    do {
      const response = await transactionService.getAll({
        ...filters,
        page,
        per_page: 1000,
      });
      if (!response.success) return response as unknown as ApiResponse<Transaction[]>;

      const envelope: any = response.data;
      const paginator: any = envelope?.data?.data ? envelope.data : envelope;
      const pageRows = Array.isArray(paginator?.data) ? paginator.data : [];
      rows.push(...pageRows);
      lastPage = Number(paginator?.last_page || 1);
      page += 1;
    } while (page <= lastPage);

    return { success: true, data: rows } as ApiResponse<Transaction[]>;
  },

  getById: async (id: number): Promise<ApiResponse<Transaction>> => {
    const token = await getAuthToken();
    return apiRequest<Transaction>(
      `${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}`,
      {
        method: "GET",
        token,
      },
    );
  },

  create: async (
    data: TransactionFormData,
  ): Promise<ApiResponse<Transaction>> => {
    const token = await getAuthToken();
    return apiRequest<Transaction>(API_CONFIG.ENDPOINTS.TRANSACTION_CREATE, {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
  },

  update: async (
    id: number,
    data: Partial<TransactionFormData>,
  ): Promise<ApiResponse<Transaction>> => {
    const token = await getAuthToken();
    return apiRequest<Transaction>(
      `${API_CONFIG.ENDPOINTS.TRANSACTION_UPDATE}/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      },
    );
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(
      `${API_CONFIG.ENDPOINTS.TRANSACTION_DELETE}/${id}`,
      {
        method: "DELETE",
        token,
      },
    );
  },

  approve: async (id: number): Promise<ApiResponse<unknown>> => {
    const token = await getAuthToken();
    return apiRequest<unknown>(`/transactions/${id}/approve`, {
      method: "POST",
      token,
    });
  },

  reject: async (id: number): Promise<ApiResponse<unknown>> => {
    const token = await getAuthToken();
    return apiRequest<unknown>(`/transactions/${id}/reject`, {
      method: "POST",
      token,
    });
  },

  /** Plain text of the email a draft came from. Attachments are not included. */
  getEmailBody: async (id: number): Promise<ApiResponse<InboundEmailBody>> => {
    const token = await getAuthToken();
    return apiRequest<InboundEmailBody>(`/transactions/${id}/email`, {
      method: "GET",
      token,
    });
  },

  bulkCreate: async (
    transactions: TransactionFormData[],
  ): Promise<ApiResponse<Transaction[]>> => {
    const token = await getAuthToken();
    return apiRequest<Transaction[]>(
      API_CONFIG.ENDPOINTS.TRANSACTION_BULK_CREATE,
      {
        method: "POST",
        body: JSON.stringify({ transactions }),
        token,
      },
    );
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
        error: "Authentication required",
      };
    }

    const formData = new FormData();
    formData.append("receipt_file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.TRANSACTION_PROCESS_RECEIPT),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
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
        error: error instanceof Error ? error.message : "Network error",
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
        error: "Authentication required",
      };
    }

    const formData = new FormData();
    formData.append("csv_file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.TRANSACTION_PROCESS_CSV),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
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
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  },

  searchMerchants: async (
    searchTerm: string = "",
    limit: number = 8,
  ): Promise<ApiResponse<string[]>> => {
    const token = await getAuthToken();
    const queryParams = new URLSearchParams();
    if (searchTerm) {
      queryParams.append("search", searchTerm);
    }
    queryParams.append("limit", String(limit));

    return apiRequest<string[]>(
      `${API_CONFIG.ENDPOINTS.TRANSACTION_MERCHANTS}?${queryParams.toString()}`,
      {
        method: "GET",
        token,
      },
    );
  },

  // POST /transactions/transfer. Field names must match the backend validator
  // (`from_account` / `to_account` / `transfer_fee`) — this is a different
  // shape from the regular create endpoint, exactly like the web app's
  // transactionAPI.createTransfer.
  createTransfer: async (transferData: {
    from_account: number;
    to_account: number;
    amount: number;
    date: string;
    notes?: string;
    transfer_fee?: number;
  }): Promise<ApiResponse<Transaction>> => {
    const token = await getAuthToken();
    return apiRequest<Transaction>(API_CONFIG.ENDPOINTS.TRANSACTION_TRANSFER, {
      method: "POST",
      body: JSON.stringify(transferData),
      token,
    });
  },
};

export default transactionService;
