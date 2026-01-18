import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { Category, Subcategory, ApiResponse } from '../types';

export const categoryService = {
  getAll: async (
    type?: 'income' | 'expense',
    includeSubcategories: boolean = false
  ): Promise<ApiResponse<Category[]>> => {
    const token = await getAuthToken();
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (includeSubcategories) params.append('include_subcategories', 'true');

    const queryString = params.toString();
    const endpoint = queryString
      ? `${API_CONFIG.ENDPOINTS.CATEGORIES}?${queryString}`
      : API_CONFIG.ENDPOINTS.CATEGORIES;

    return apiRequest<Category[]>(endpoint, {
      method: 'GET',
      token,
    });
  },

  getGrouped: async (): Promise<
    ApiResponse<{ income: Category[]; expense: Category[] }>
  > => {
    const token = await getAuthToken();
    return apiRequest<{ income: Category[]; expense: Category[] }>(
      API_CONFIG.ENDPOINTS.CATEGORIES_GROUPED,
      {
        method: 'GET',
        token,
      }
    );
  },

  getDefaults: async (type?: 'income' | 'expense'): Promise<ApiResponse<Category[]>> => {
    const token = await getAuthToken();
    const endpoint = type
      ? `${API_CONFIG.ENDPOINTS.CATEGORIES_DEFAULTS}?type=${type}`
      : API_CONFIG.ENDPOINTS.CATEGORIES_DEFAULTS;

    return apiRequest<Category[]>(endpoint, {
      method: 'GET',
      token,
    });
  },

  getForTransaction: async (params: {
    type?: string;
  } = {}): Promise<ApiResponse<Category[]>> => {
    const token = await getAuthToken();
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();

    const endpoint = queryString
      ? `${API_CONFIG.ENDPOINTS.CATEGORIES_FOR_TRANSACTION}?${queryString}`
      : API_CONFIG.ENDPOINTS.CATEGORIES_FOR_TRANSACTION;

    return apiRequest<Category[]>(endpoint, {
      method: 'GET',
      token,
    });
  },

  create: async (data: Partial<Category>): Promise<ApiResponse<Category>> => {
    const token = await getAuthToken();
    return apiRequest<Category>(API_CONFIG.ENDPOINTS.CATEGORY_CREATE, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  update: async (id: number, data: Partial<Category>): Promise<ApiResponse<Category>> => {
    const token = await getAuthToken();
    return apiRequest<Category>(`${API_CONFIG.ENDPOINTS.CATEGORY_UPDATE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(`${API_CONFIG.ENDPOINTS.CATEGORY_DELETE}/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  saveOrder: async (payload: {
    type: 'income' | 'expense';
    items: Array<{ id: number; sort_order: number }>;
  }): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(API_CONFIG.ENDPOINTS.CATEGORIES_ORDER, {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    });
  },
};

export const subcategoryService = {
  getAll: async (): Promise<ApiResponse<Subcategory[]>> => {
    const token = await getAuthToken();
    return apiRequest<Subcategory[]>(API_CONFIG.ENDPOINTS.SUBCATEGORIES, {
      method: 'GET',
      token,
    });
  },

  getByCategory: async (categoryId: number): Promise<ApiResponse<Subcategory[]>> => {
    const token = await getAuthToken();
    return apiRequest<Subcategory[]>(
      `${API_CONFIG.ENDPOINTS.SUBCATEGORIES}/category/${categoryId}`,
      {
        method: 'GET',
        token,
      }
    );
  },

  create: async (data: Partial<Subcategory>): Promise<ApiResponse<Subcategory>> => {
    const token = await getAuthToken();
    return apiRequest<Subcategory>(API_CONFIG.ENDPOINTS.SUBCATEGORIES, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  update: async (
    id: number,
    data: Partial<Subcategory>
  ): Promise<ApiResponse<Subcategory>> => {
    const token = await getAuthToken();
    return apiRequest<Subcategory>(`${API_CONFIG.ENDPOINTS.SUBCATEGORIES}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(`${API_CONFIG.ENDPOINTS.SUBCATEGORIES}/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};

export default categoryService;
