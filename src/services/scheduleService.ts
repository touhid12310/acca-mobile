import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { Schedule, ApiResponse } from '../types';

// Safety cap for the page loop (20 schedules per page on the API).
const MAX_SCHEDULE_PAGES = 50;

export const scheduleService = {
  /**
   * GET /schedules is paginated 20 at a time (newest first), so read every
   * page and hand back the first page's envelope holding all the rows.
   */
  getAll: async (params: {
    status?: 'paid' | 'unpaid' | 'all';
    upcoming?: boolean;
  } = {}): Promise<ApiResponse<Schedule[]>> => {
    const token = await getAuthToken();
    const fetchPage = (page: number) => {
      const queryString = new URLSearchParams([
        ...Object.entries(params)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
        ...(page > 1 ? [['page', String(page)]] : []),
      ]).toString();

      const endpoint = queryString
        ? `${API_CONFIG.ENDPOINTS.SCHEDULES}?${queryString}`
        : API_CONFIG.ENDPOINTS.SCHEDULES;

      return apiRequest<Schedule[]>(endpoint, {
        method: 'GET',
        token,
      });
    };

    const first = await fetchPage(1);
    const paginator = (first.data as any)?.data;
    const lastPage = Math.min(Number(paginator?.last_page) || 1, MAX_SCHEDULE_PAGES);
    if (!first.success || !Array.isArray(paginator?.data) || lastPage <= 1) {
      return first;
    }

    const rest = await Promise.all(
      Array.from({ length: lastPage - 1 }, (_, i) => fetchPage(i + 2))
    );
    const rows = [...paginator.data];
    const seen = new Set(rows.map((row: any) => row?.id));
    for (const page of rest) {
      const pageRows = (page.data as any)?.data?.data;
      // A page that failed is left out rather than blanking the whole list.
      if (!page.success || !Array.isArray(pageRows)) continue;
      for (const row of pageRows) {
        if (seen.has(row?.id)) continue;
        seen.add(row?.id);
        rows.push(row);
      }
    }

    return {
      ...first,
      data: { ...(first.data as any), data: { ...paginator, data: rows } },
    };
  },

  getById: async (id: number): Promise<ApiResponse<Schedule>> => {
    const token = await getAuthToken();
    return apiRequest<Schedule>(`${API_CONFIG.ENDPOINTS.SCHEDULES}/${id}`, {
      method: 'GET',
      token,
    });
  },

  create: async (data: Partial<Schedule>): Promise<ApiResponse<Schedule>> => {
    const token = await getAuthToken();
    return apiRequest<Schedule>(API_CONFIG.ENDPOINTS.SCHEDULES, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  update: async (id: number, data: Partial<Schedule>): Promise<ApiResponse<Schedule>> => {
    const token = await getAuthToken();
    return apiRequest<Schedule>(`${API_CONFIG.ENDPOINTS.SCHEDULES}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(`${API_CONFIG.ENDPOINTS.SCHEDULES}/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};

export default scheduleService;
