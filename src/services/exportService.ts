import { apiRequest, getAuthToken } from '../config/api';
import { ApiResponse } from '../types';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

export type ExportStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'expired';

export type DataExportItem = {
  id: string;
  format: ExportFormat;
  datasets: string[];
  date_from: string | null;
  date_to: string | null;
  status: ExportStatus;
  file_name: string | null;
  file_size: number | null;
  row_count: number | null;
  error: string | null;
  expires_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  download_count: number;
  // The same 24-hour link that was emailed; null once expired.
  download_url: string | null;
};

export type ExportsPayload = {
  exports: DataExportItem[];
  datasets: { key: string; label: string }[];
  formats: ExportFormat[];
  link_ttl_hours: number;
  email: string;
};

export type ExportRequest = {
  format: ExportFormat;
  datasets: string[];
  date_from?: string | null;
  date_to?: string | null;
};

// "Email me my data" — the file is built in the background and the link is
// emailed; it works for 24 hours.
export const exportService = {
  getAll: async (): Promise<ApiResponse<{ data: ExportsPayload }>> => {
    const token = await getAuthToken();
    return apiRequest('/exports', { method: 'GET', token });
  },

  create: async (payload: ExportRequest): Promise<ApiResponse<{ message?: string; code?: string; data: { export: DataExportItem } }>> => {
    const token = await getAuthToken();
    return apiRequest('/exports', { method: 'POST', body: JSON.stringify(payload), token });
  },

  delete: async (id: string): Promise<ApiResponse<{ message?: string }>> => {
    const token = await getAuthToken();
    return apiRequest(`/exports/${id}`, { method: 'DELETE', token });
  },
};

export default exportService;
