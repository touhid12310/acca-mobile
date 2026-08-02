import { Platform } from 'react-native';
import { apiRequest } from '../config/api';

export type BillingPlan = {
  id: number;
  name: string;
  slug: string;
  tagline?: string;
  price: string;
  currency: string;
  billing_interval: 'month' | 'year';
  trial_days: number;
  trial_enabled: boolean;
  invoice_lead_days: number;
  grace_days: number;
  account_limit: number | null;
  ai_monthly_limit: number | null;
  features: Record<string, string>;
  is_featured: boolean;
};

export type SubscriptionInvoice = {
  uuid: string;
  invoice_number: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  currency: string;
  total: string;
  due_at: string;
  grace_ends_at: string;
  created_at: string;
  plan?: BillingPlan;
};

export type BillingOverview = {
  current_plan: BillingPlan;
  subscription: {
    status: string;
    subscribed_plan_slug: string;
    trial_ends_at?: string | null;
    current_period_ends_at?: string | null;
    grace_ends_at?: string | null;
    in_grace_period: boolean;
    can_start_trial: boolean;
  };
  usage: {
    used: number;
    limit: number | null;
    remaining: number | null;
    period_ends_on: string;
  };
  invoices: SubscriptionInvoice[];
};

const billingService = {
  getPlans: () => apiRequest<BillingPlan[]>('/billing/plans'),
  getOverview: () => apiRequest<BillingOverview>('/billing/overview'),
  startTrial: (planSlug: string) =>
    apiRequest(`/billing/plans/${planSlug}/trial`, { method: 'POST' }),
  createInvoice: (planSlug: string) =>
    apiRequest<SubscriptionInvoice>('/billing/invoices', {
      method: 'POST',
      body: { plan_slug: planSlug },
    }),
  checkout: (invoiceUuid: string, returnUrl: string) =>
    apiRequest<{ payment_uuid: string; redirect_url: string }>(`/billing/invoices/${invoiceUuid}/checkout`, {
      method: 'POST',
      body: {
        channel: Platform.OS === 'ios' ? 'ios' : 'android',
        return_url: returnUrl,
      },
    }),
  verifyPayment: (paymentUuid: string) =>
    apiRequest(`/billing/payments/${paymentUuid}/verify`, { method: 'POST' }),
};

export default billingService;
