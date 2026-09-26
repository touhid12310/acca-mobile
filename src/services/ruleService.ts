import { apiRequest, getAuthToken } from '../config/api';
import { ApiResponse } from '../types';

export type RuleMatchType = 'contains' | 'starts_with' | 'exact';

export type CategorizationRule = {
  id: number;
  pattern: string;
  match_type: RuleMatchType;
  category_id: number;
  subcategory_id: number | null;
  category_name: string | null;
  subcategory_name: string | null;
  category_label: string;
  type: 'income' | 'expense' | 'asset' | 'liability' | null;
  is_active: boolean;
  source: 'manual' | 'learned';
  times_applied: number;
  last_applied_at: string | null;
  created_at: string | null;
};

export type RuleSuggestion = {
  pattern: string;
  match_type: RuleMatchType;
  category_id: number;
  subcategory_id: number | null;
  category_label: string;
  type?: string;
  uses?: number;
  // Set on the "after an edit" suggestion.
  existing_rule_id?: number | null;
  other_matches?: number;
};

export type RulesPayload = {
  rules: CategorizationRule[];
  suggestions: RuleSuggestion[];
};

export type RulePreview = {
  total: number;
  uncategorized: number;
  samples: string[];
};

export type ApplyScope = 'none' | 'uncategorized' | 'all';

export type RuleInput = {
  pattern: string;
  match_type?: RuleMatchType;
  category_id: number;
  subcategory_id?: number | null;
  is_active?: boolean;
  source?: 'manual' | 'learned';
  apply_to_existing?: ApplyScope;
};

// Auto-categorization rules — "anything from Foodpanda → Food › Delivery".
export const ruleService = {
  getAll: async (): Promise<ApiResponse<{ data: RulesPayload }>> => {
    const token = await getAuthToken();
    return apiRequest('/categorization-rules', { method: 'GET', token });
  },

  create: async (input: RuleInput): Promise<ApiResponse<{ message?: string; data: { rule: CategorizationRule; applied_count: number } }>> => {
    const token = await getAuthToken();
    return apiRequest('/categorization-rules', { method: 'POST', body: JSON.stringify(input), token });
  },

  update: async (id: number, input: Partial<RuleInput>): Promise<ApiResponse<{ message?: string; data: { rule: CategorizationRule; applied_count: number } }>> => {
    const token = await getAuthToken();
    return apiRequest(`/categorization-rules/${id}`, { method: 'PUT', body: JSON.stringify(input), token });
  },

  delete: async (id: number): Promise<ApiResponse<{ message?: string }>> => {
    const token = await getAuthToken();
    return apiRequest(`/categorization-rules/${id}`, { method: 'DELETE', token });
  },

  /** How many existing transactions a rule would match. */
  preview: async (payload: { pattern: string; match_type?: RuleMatchType; category_id: number }): Promise<ApiResponse<{ data: RulePreview }>> => {
    const token = await getAuthToken();
    return apiRequest('/categorization-rules/preview', { method: 'POST', body: JSON.stringify(payload), token });
  },
};

export default ruleService;
