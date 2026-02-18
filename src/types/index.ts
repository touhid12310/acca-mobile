// User Types
export interface User {
  id: number;
  name: string;
  email: string;
  mobile?: string;
  avatar?: string;
  profile_picture?: string;
  profile_picture_url?: string;
  two_factor_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
  settings?: UserSettings;
}

export interface UserSettings {
  currency?: string;
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
}

// Auth Types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    access_token: string;
    user: User;
    requires_two_factor?: boolean;
  };
  errors?: Record<string, string[]>;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  data?: {
    access_token: string;
    user: User;
  };
  errors?: Record<string, string[]>;
}

// Transaction Types
export type TransactionType = 'income' | 'expense' | 'transfer' | 'asset' | 'liability';

export interface TransactionItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ExpenseCategory {
  id: number;
  expense_id: number;
  category_id: number;
  subcategory_id?: number;
  category?: Category;
  subcategory?: Subcategory;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  merchant_name?: string;
  description?: string;
  date: string;
  category_id?: number;
  subcategory_id?: number;
  account_id?: number;
  to_account_id?: number;
  payment_method?: number; // API uses this for account
  transfer_to?: number;
  notes?: string;
  receipt_path?: string;
  receipt_file?: string;
  items?: TransactionItem[];
  category?: Category;
  subcategory?: Subcategory;
  account?: Account;
  to_account?: Account;
  expense_categories?: ExpenseCategory[]; // API returns categories in this array
  created_at?: string;
  updated_at?: string;
}

export interface TransactionFormData {
  type: TransactionType;
  amount: number;
  merchant_name?: string;
  description?: string;
  date: string;
  category_id?: number;
  subcategory_id?: number;
  account_id?: number;
  to_account_id?: number;
  notes?: string;
  items?: TransactionItem[];
  receipt_path?: string;
  receipt_file?: string;
}

// Category Types
export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
  is_default?: boolean;
  subcategories?: Subcategory[];
  sort_order?: number;
}

export interface Subcategory {
  id: number;
  name: string;
  category_id: number;
  sort_order?: number;
}

// Account Types
export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment' | 'loan' | 'other';

export interface Account {
  id: number;
  account_name: string;
  account_type: AccountType;
  balance: number;
  currency?: string;
  is_default?: boolean;
  icon?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

// Budget Types
export interface Budget {
  id: number;
  name: string;
  amount: number;
  spent: number;
  remaining: number;
  period: 'monthly' | 'weekly' | 'yearly';
  start_date: string;
  end_date?: string;
  category_id?: number;
  category?: Category;
  progress_percentage: number;
}

// Goal Types
export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  description?: string;
  icon?: string;
  color?: string;
  progress_percentage: number;
  is_completed: boolean;
}

// Loan Types
export interface Loan {
  id: number;
  name: string;
  principal: number;
  interest_rate: number;
  monthly_payment: number;
  remaining_balance: number;
  start_date: string;
  end_date?: string;
  lender?: string;
  is_archived?: boolean;
}

export interface LoanPayment {
  id: number;
  loan_id: number;
  amount: number;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
}

// Bill Types
export interface Bill {
  id: number;
  name?: string;
  vendor?: string;
  contact_name?: string;
  amount: number | string;
  due_date?: string;
  next_due_date?: string;
  frequency: 'monthly' | 'weekly' | 'yearly' | 'one-time' | 'Monthly' | 'Weekly' | 'Quarterly' | 'Yearly' | string;
  type?: 'income' | 'expense';
  status?: string;
  notes?: string;
  is_paid?: boolean;
  auto_pay?: boolean;
  category_id?: number;
  category?: Category;
  reminder_days?: number;
}

// Chat Types
export interface ChatMessage {
  id: string | number;
  is_user: boolean;
  message: string;
  file_url?: string;
  file_name?: string;
  file_mime?: string;
  image_path?: string;
  created_at?: string;
  metadata?: ChatMessageMetadata;
}

export interface ChatMessageMetadata {
  structured_data?: StructuredTable[];
  expense_candidates?: ExpenseCandidate[];
  suggested_actions?: string[];
  raw_ai?: string;
  receipt_path?: string;
  receipt_url?: string;
  receipt_name?: string;
  receipt_mime?: string;
  detection_source?: string;
}

export interface StructuredTable {
  id?: string;
  title?: string;
  subtitle?: string;
  type?: string;
  headers: string[];
  rows: Record<string, string | number>[];
  totals?: Record<string, string | number>;
}

export interface ExpenseCandidate {
  id?: string;
  merchant_name?: string;
  amount?: number;
  date?: string;
  type?: TransactionType;
  category?: string;
  category_id?: number;
  subcategory_id?: number;
  payment_method?: string;
  payment_method_id?: number;
  payment_method_label?: string;
  notes?: string;
  items?: TransactionItem[];
}

// Report Types
export interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface CategoryBreakdown {
  category_id: number;
  category_name: string;
  amount: number;
  percentage: number;
  color?: string;
}

export interface NetWorthData {
  date: string;
  assets: number;
  liabilities: number;
  net_worth: number;
}

export interface IncomeStatement {
  period: string;
  income: {
    categories: { name: string; amount: number }[];
    total: number;
  };
  expenses: {
    categories: { name: string; amount: number }[];
    total: number;
  };
  net_income: number;
}

export interface BalanceSheet {
  as_of_date: string;
  assets: {
    accounts: { name: string; balance: number; type: string }[];
    total: number;
  };
  liabilities: {
    accounts: { name: string; balance: number; type: string }[];
    total: number;
  };
  net_worth: number;
}

// Dashboard Types
export interface DashboardStats {
  total_income: number;
  total_expenses: number;
  net_worth: number;
  savings_rate: number;
  recent_transactions: Transaction[];
  budget_summary: {
    total_budgeted: number;
    total_spent: number;
    remaining: number;
  };
  upcoming_bills: Bill[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  status?: number;
  data?: T | { data: T; message?: string };
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Currency Types
export interface Currency {
  code: string;
  name: string;
  symbol: string;
}
