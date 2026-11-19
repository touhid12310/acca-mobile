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
  /** Only on loans that changed sides: which way this balance points. */
  balance_side?: 'Borrowed' | 'Lent';
  /** The repayment that went past zero and moved the loan to the other side. */
  crossed_over?: boolean;
  /** Server wording for that row, e.g. "৳900.00 more than you owed — now owed to you". */
  detail?: string | null;
  balance_label?: string;
  notes?: string | null;
  /** Owner's statement only: the account the entry posted to. */
  account_id?: number | null;
};

export type LoanEntryUpdate = {
  amount: number;
  interest_paid: number;
  payment_date: string;
  account_id: number;
  notes: string | null;
};

/**
 * A loan as GET /loans returns it, with the fields the shared `Loan` type
 * leaves out. `opening_amount` is the first advance without later top-ups
 * (QA C5); older API builds send it only for loans that changed sides, so
 * callers fall back to `original_amount`.
 */
export type LoanRecord = Loan & {
  opening_amount?: number | string | null;
  /** Set once the loan has changed sides: the side it started on. */
  opening_type?: 'Borrowed' | 'Lent' | null;
  category_id?: number | null;
};

/** PUT /loans/{id}. `opening_amount` wins over `original_amount` on new API builds. */
export type LoanUpdate = {
  loan_name: string;
  opening_amount: number;
  /** opening + top-ups, for API builds that only read the total. */
  original_amount: number;
  interest_rate: number;
  next_payment: number;
  term: number | null;
  term_period: string;
  start_date: string;
  next_payment_date: string | null;
  loan_type: string;
  account_id: number;
  category_id: number | null;
  notes: string | null;
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
    /** True once an overpayment moved the balance to the other side. */
    changed_sides?: boolean;
    /** Changed-sides loans: which way the opening balance pointed ("you owe" / "owed to you"). */
    opening_label?: string;
    /** Newer API builds: the side the loan started on. */
    opening_type?: 'Borrowed' | 'Lent';
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

  /**
   * Edit the loan's terms. New API builds keep top-ups and repayments, rewrite
   * the opening transaction in place and replay the ledger (QA C5).
   */
  update: async (id: number, data: Partial<Loan> | LoanUpdate): Promise<ApiResponse<Loan>> => {
    const token = await getAuthToken();
    return apiRequest<Loan>(`${API_CONFIG.ENDPOINTS.LOANS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  /**
   * Deletes the loan. Every transaction on it (opening, entries, top-ups,
   * fees) moves to Archived and can't be restored on its own (QA AE-122).
   */
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

  /**
   * One statement entry. The server rewrites its transaction and rebuilds the
   * loan; an edit that would flip who owes whom is refused (422).
   */
  updateEntry: async (loanId: number, entryId: number, data: LoanEntryUpdate): Promise<ApiResponse<{ loan: Loan }>> => {
    const token = await getAuthToken();
    return apiRequest<{ loan: Loan }>(`${API_CONFIG.ENDPOINTS.LOANS}/${loanId}/entries/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  /** Deletes the entry and moves its transaction to Archived. */
  deleteEntry: async (loanId: number, entryId: number): Promise<ApiResponse<{ loan: Loan }>> => {
    const token = await getAuthToken();
    return apiRequest<{ loan: Loan }>(`${API_CONFIG.ENDPOINTS.LOANS}/${loanId}/entries/${entryId}`, {
      method: 'DELETE',
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

  /** Turns the public link off for good; sharing again mints a new link. */
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
