import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { Loan, LoanPayment, ApiResponse } from '../types';

export type LoanDirection = 'in' | 'out';

export type LoanStatementEntry = {
  id: number;
  direction: LoanDirection;
  is_repayment: boolean;
  label: string;
  amount: number;
  principal: number;
  interest: number;
  date: string | null;
  balance_after: number;
  notes?: string | null;
};

export type LoanShare = {
  is_shared: boolean;
  url: string | null;
  pdf_url: string | null;
  shared_at: string | null;
};

export type LoanStatement = {
  loan: Loan;
  summary: {
    currency: string | null;
    opening_amount: number;
    additional_amount: number;
    total_principal: number;
    total_settled: number;
    total_interest: number;
    outstanding: number;
    is_settled: boolean;
    progress_percent: number;
    entry_count: number;
    last_entry_at: string | null;
    labels: { given: string; settled: string; outstanding: string; in: string; out: string };
  };
  entries: LoanStatementEntry[];
  share: LoanShare;
};

export const loanService = {
  getAll: async (): Promise<ApiResponse<Loan[]>> => {
    const token = await getAuthToken();
    return apiRequest<Loan[]>(API_CONFIG.ENDPOINTS.LOANS, {
      method: 'GET',
      token,
    });
  },

  getById: async (id: number): Promise<ApiResponse<Loan>> => {
    const token = await getAuthToken();
    return apiRequest<Loan>(`${API_CONFIG.ENDPOINTS.LOANS}/${id}`, {
      method: 'GET',
      token,
    });
  },

  create: async (data: Partial<Loan>): Promise<ApiResponse<Loan>> => {
    const token = await getAuthToken();
    return apiRequest<Loan>(API_CONFIG.ENDPOINTS.LOANS, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  update: async (id: number, data: Partial<Loan>): Promise<ApiResponse<Loan>> => {
    const token = await getAuthToken();
    return apiRequest<Loan>(`${API_CONFIG.ENDPOINTS.LOANS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(`${API_CONFIG.ENDPOINTS.LOANS}/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  getPayments: async (id: number): Promise<ApiResponse<LoanPayment[]>> => {
    const token = await getAuthToken();
    return apiRequest<LoanPayment[]>(`${API_CONFIG.ENDPOINTS.LOANS}/${id}/payments`, {
      method: 'GET',
      token,
    });
  },

  makePayment: async (
    id: number,
    paymentData: {
      payment_amount: number;
      /** 'in' = money arrived, 'out' = money left. Omitted means "repayment". */
      direction?: LoanDirection;
      principal_paid?: number;
      interest_paid?: number;
      account_id?: number;
      payment_date: string;
      next_payment?: number;
      next_payment_date?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<LoanPayment>> => {
    const token = await getAuthToken();
    return apiRequest<LoanPayment>(`${API_CONFIG.ENDPOINTS.LOANS}/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
      token,
    });
  },

  getAllPayments: async (): Promise<ApiResponse<LoanPayment[]>> => {
    const token = await getAuthToken();
    return apiRequest<LoanPayment[]>(`${API_CONFIG.ENDPOINTS.LOANS}/payments`, {
      method: 'GET',
      token,
    });
  },

  archive: async (id: number): Promise<ApiResponse<Loan>> => {
    const token = await getAuthToken();
    return apiRequest<Loan>(`${API_CONFIG.ENDPOINTS.LOANS}/${id}/archive`, {
      method: 'POST',
      token,
    });
  },

  /** Running two-way ledger: summary, entries with balance-after, share state. */
  getStatement: async (id: number): Promise<ApiResponse<LoanStatement>> => {
    const token = await getAuthToken();
    return apiRequest<LoanStatement>(`${API_CONFIG.ENDPOINTS.LOANS}/${id}/statement`, {
      method: 'GET',
      token,
    });
  },

  createShareLink: async (id: number): Promise<ApiResponse<LoanShare>> => {
    const token = await getAuthToken();
    return apiRequest<LoanShare>(`${API_CONFIG.ENDPOINTS.LOANS}/${id}/share`, {
      method: 'POST',
      token,
    });
  },

  revokeShareLink: async (id: number): Promise<ApiResponse<LoanShare>> => {
    const token = await getAuthToken();
    return apiRequest<LoanShare>(`${API_CONFIG.ENDPOINTS.LOANS}/${id}/share`, {
      method: 'DELETE',
      token,
    });
  },

  /** Absolute URL of the owner's PDF, for opening in the system browser. */
  statementPdfUrl: (id: number): string =>
    `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOANS}/${id}/statement/pdf`,
};

export default loanService;
