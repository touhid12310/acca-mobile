import API_CONFIG, { apiRequest, buildApiUrl, getAuthToken } from '../config/api';
import { ChatMessage, ExpenseCandidate, Category, Account, ApiResponse } from '../types';

interface SendMessageParams {
  message?: string;
  file?: {
    uri: string;
    name: string;
    type: string;
  };
  chatDate?: string;
  categories?: Array<{
    id: number;
    name: string;
    type: string;
    subcategories?: Array<{ id: number; name: string }>;
  }>;
  paymentMethods?: Array<{ id: number; name: string }>;
}

interface SendMessageResponse {
  success: boolean;
  data?: {
    user: ChatMessage;
    assistant: ChatMessage;
  };
  message?: string;
}

interface TranscribeResponse {
  success: boolean;
  data?: {
    text: string;
  };
  message?: string;
}

export const chatService = {
  getMessages: async (chatDate?: string): Promise<ApiResponse<ChatMessage[]>> => {
    const token = await getAuthToken();
    const endpoint = chatDate
      ? `${API_CONFIG.ENDPOINTS.CHAT_MESSAGES}?date=${encodeURIComponent(chatDate)}`
      : API_CONFIG.ENDPOINTS.CHAT_MESSAGES;

    return apiRequest<ChatMessage[]>(endpoint, {
      method: 'GET',
      token,
    });
  },

  sendMessage: async ({
    message,
    file,
    chatDate,
    categories,
    paymentMethods,
  }: SendMessageParams): Promise<ApiResponse<SendMessageResponse>> => {
    const token = await getAuthToken();

    if (!token) {
      return {
        success: false,
        status: 401,
        error: 'Authentication required',
      };
    }

    const formData = new FormData();

    if (message) {
      formData.append('message', message);
    }

    if (chatDate) {
      formData.append('chat_date', chatDate);
    }

    if (file) {
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as unknown as Blob);
    }

    if (categories && categories.length > 0) {
      formData.append('categories', JSON.stringify(categories));
    }

    if (paymentMethods && paymentMethods.length > 0) {
      formData.append('payment_methods', JSON.stringify(paymentMethods));
    }

    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.CHAT_MESSAGES), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      return {
        success: response.ok,
        status: response.status,
        data,
      };
    } catch (error) {
      return {
        success: false,
        status: 500,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  saveExpense: async (
    messageId: string | number,
    expense: ExpenseCandidate
  ): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(
      `${API_CONFIG.ENDPOINTS.CHAT_SAVE_EXPENSE}/${messageId}/save-expense`,
      {
        method: 'POST',
        body: JSON.stringify({ expense }),
        token,
      }
    );
  },

  transcribeAudio: async (audioFile: {
    uri: string;
    name: string;
    type: string;
  }): Promise<ApiResponse<TranscribeResponse>> => {
    const token = await getAuthToken();

    if (!token) {
      return {
        success: false,
        status: 401,
        error: 'Authentication required',
      };
    }

    const formData = new FormData();
    formData.append('audio', {
      uri: audioFile.uri,
      name: audioFile.name,
      type: audioFile.type,
    } as unknown as Blob);

    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.CHAT_TRANSCRIBE), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      return {
        success: response.ok,
        status: response.status,
        data,
      };
    } catch (error) {
      return {
        success: false,
        status: 500,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },
};

export default chatService;
