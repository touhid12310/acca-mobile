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
  subtotal: string;
  discount_total: string;
  total: string;
  coupon_code: string | null;
  due_at: string;
  grace_ends_at: string;
  created_at: string;
  plan?: BillingPlan;
};

export type CouponPreview = {
  code: string;
  description: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  duration: 'once' | 'forever';
  label: string;
  currency: string;
  subtotal: number;
  discount_total: number;
  total: number;
  covers_full_amount: boolean;
};

/** Maps an AccountE plan onto the Play Console subscription it is sold as. */
export type GooglePlayProduct = {
  plan_slug: string;
  plan_name: string;
  product_id: string;
  base_plan_id: string | null;
};

/** A publicly listed coupon, already priced against one plan. */
export type CouponOffer = CouponPreview & {
  plan_slug: string;
  plan_name: string;
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
    billing_provider: 'eps' | 'google_play';
    managed_by_google_play: boolean;
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
  createInvoice: (planSlug: string, couponCode?: string | null) =>
    apiRequest<SubscriptionInvoice>('/billing/invoices', {
      method: 'POST',
      body: { plan_slug: planSlug, coupon_code: couponCode ?? null },
    }),
  getAvailableCoupons: () => apiRequest<CouponOffer[]>('/billing/coupons/available'),
  previewCoupon: (planSlug: string, couponCode: string) =>
    apiRequest<CouponPreview>('/billing/coupons/preview', {
      method: 'POST',
      body: { plan_slug: planSlug, coupon_code: couponCode },
    }),
  checkout: (invoiceUuid: string, returnUrl: string) =>
    apiRequest<{
      payment_uuid?: string;
      redirect_url: string | null;
      settled_without_payment?: boolean;
    }>(`/billing/invoices/${invoiceUuid}/checkout`, {
      method: 'POST',
      body: {
        channel: Platform.OS === 'ios' ? 'ios' : 'android',
        return_url: returnUrl,
      },
    }),
  verifyPayment: (paymentUuid: string) =>
    apiRequest(`/billing/payments/${paymentUuid}/verify`, { method: 'POST' }),

  // Google Play in-app subscriptions (Android only). Play takes the payment;
  // the backend only verifies the purchase token and grants entitlement.
  getGooglePlayProducts: () =>
    apiRequest<{ enabled: boolean; products: GooglePlayProduct[] }>('/billing/google-play/products'),
  redeemGooglePlayPurchase: (productId: string, purchaseToken: string) =>
    apiRequest<BillingOverview>('/billing/google-play/redeem', {
      method: 'POST',
      body: { product_id: productId, purchase_token: purchaseToken },
    }),
  restoreGooglePlayPurchases: () =>
    apiRequest<BillingOverview>('/billing/google-play/restore', { method: 'POST' }),
};

export default billingService;
