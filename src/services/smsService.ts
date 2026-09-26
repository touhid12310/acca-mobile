import { apiRequest, getAuthToken } from '../config/api';
import { ApiResponse } from '../types';

export type SmsUpload = {
  sender?: string | null;
  body: string;
  // Epoch milliseconds (Android inbox) or an ISO date.
  received_at?: number | string | null;
};

export type SmsImportSummary = {
  imported: number;
  duplicates: number;
  ignored: number;
  skipped_senders: number;
  failed: number;
  ai_used: number;
  transaction_ids: number[];
};

export type SmsSenderSetting = {
  id: number;
  sender: string;
  account_id: number | null;
  account_name: string | null;
  is_enabled: boolean;
  message_count: number;
  last_seen_at: string | null;
};

export type SmsOverview = {
  senders: SmsSenderSetting[];
  stats: {
    imported_this_month: number;
    pending_review: number;
    last_imported_at: string | null;
  };
  ai_reading: boolean;
};

// Bank / wallet SMS → Pending-review drafts.
export const smsService = {
  import: async (
    messages: SmsUpload[],
    source: 'device' | 'paste',
  ): Promise<ApiResponse<{ message?: string; data: SmsImportSummary }>> => {
    const token = await getAuthToken();
    return apiRequest('/sms/import', {
      method: 'POST',
      body: JSON.stringify({ source, messages }),
      token,
      // A batch the AI has to read can take a while.
      timeoutMs: 60000,
    });
  },

  getOverview: async (): Promise<ApiResponse<{ data: SmsOverview }>> => {
    const token = await getAuthToken();
    return apiRequest('/sms/overview', { method: 'GET', token });
  },

  updateSender: async (
    id: number,
    data: { account_id?: number | null; is_enabled?: boolean },
  ): Promise<ApiResponse<{ message?: string; data: { senders: SmsSenderSetting[] } }>> => {
    const token = await getAuthToken();
    return apiRequest(`/sms/senders/${id}`, { method: 'PUT', body: JSON.stringify(data), token });
  },
};

export default smsService;
