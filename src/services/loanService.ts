import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { Loan, LoanPayment, ApiResponse } from '../types';

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
      amount: number;
      payment_date: string;
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
};

export default loanService;
