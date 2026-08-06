import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useIAP, ErrorCode } from 'expo-iap';
import type { Purchase, ProductSubscription } from 'expo-iap';

import billingService, { GooglePlayProduct } from '../services/billingService';

type Options = {
  /** Called after the backend has verified a purchase and granted Premium. */
  onEntitlementGranted?: () => void | Promise<void>;
  onError?: (message: string) => void;
};

const unwrap = <T,>(value: T | { data: T } | undefined): T | undefined => {
  if (!value) return undefined;
  return typeof value === 'object' && 'data' in value ? (value as { data: T }).data : (value as T);
};

/**
 * Google Play subscription purchasing for the Android app.
 *
 * Play Store policy requires digital subscriptions to be sold through Play
 * Billing on Android, so this replaces the EPS redirect on that platform.
 * The purchase token is always verified server-side before Premium is granted
 * — the client's claim of a successful purchase is never trusted on its own.
 *
 * Inert on iOS and web: `available` stays false and nothing else runs.
 */
export function useGooglePlayBilling({ onEntitlementGranted, onError }: Options = {}) {
  const isAndroid = Platform.OS === 'android';
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  // Play can re-deliver a purchase across app launches; redeeming the same
  // token twice in one session is wasted work.
  const redeemedTokens = useRef<Set<string>>(new Set());

  const productsQuery = useQuery({
    queryKey: ['google-play-products'],
    enabled: isAndroid,
    queryFn: async () => {
      const response = await billingService.getGooglePlayProducts();
      if (!response.success) return { enabled: false, products: [] as GooglePlayProduct[] };
      return unwrap(response.data) || { enabled: false, products: [] as GooglePlayProduct[] };
    },
  });

  const catalogue = useMemo(() => productsQuery.data?.products || [], [productsQuery.data]);
  const enabled = Boolean(isAndroid && productsQuery.data?.enabled && catalogue.length > 0);

  const redeem = useCallback(
    async (purchase: Purchase) => {
      const purchaseToken = purchase.purchaseToken;
      if (!purchaseToken) {
        onError?.('Google Play did not return a purchase token.');
        return false;
      }
      if (redeemedTokens.current.has(purchaseToken)) return true;

      const response = await billingService.redeemGooglePlayPurchase(purchase.productId, purchaseToken);
      if (!response.success) {
        onError?.(response.message || 'Could not verify the purchase with our servers.');
        return false;
      }

      redeemedTokens.current.add(purchaseToken);
      await onEntitlementGranted?.();
      return true;
    },
    [onEntitlementGranted, onError],
  );

  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
    availablePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        const verified = await redeem(purchase);
        // Only finish once the server has granted entitlement. Finishing a
        // purchase we failed to verify would leave the user paying for
        // nothing with no way for Play to redeliver it.
        if (verified) {
          await finishTransaction({ purchase, isConsumable: false });
        }
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'Could not complete the purchase.');
      } finally {
        setPurchasing(null);
      }
    },
    onPurchaseError: (error) => {
      setPurchasing(null);
      // A user backing out of the Play sheet is not an error worth surfacing.
      if (error?.code !== ErrorCode.UserCancelled) {
        onError?.(error?.message || 'The Play Store could not complete the purchase.');
      }
    },
    onError: (error) => onError?.(error.message),
  });

  useEffect(() => {
    if (!enabled || !connected) return;
    fetchProducts({ skus: catalogue.map((item) => item.product_id), type: 'subs' }).catch(() => {
      onError?.('Could not load subscription pricing from the Play Store.');
    });
    // `fetchProducts` and `onError` are stable enough that re-running on their
    // identity would refetch the catalogue on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, connected, catalogue]);

  const purchase = useCallback(
    async (planSlug: string) => {
      const mapping = catalogue.find((item) => item.plan_slug === planSlug);
      if (!mapping) {
        onError?.('This plan is not available on the Play Store.');
        return;
      }

      const product = subscriptions.find((item) => item.id === mapping.product_id) as
        | ProductSubscription
        | undefined;

      // Play requires the offer token of the base plan being bought; without it
      // the billing sheet cannot open.
      const offers = (product as { subscriptionOffers?: { basePlanIdAndroid?: string | null; offerTokenAndroid?: string | null }[] })
        ?.subscriptionOffers;
      const offer =
        offers?.find((candidate) => candidate.basePlanIdAndroid === mapping.base_plan_id) || offers?.[0];

      if (!offer?.offerTokenAndroid) {
        onError?.('The Play Store has no active offer for this subscription yet.');
        return;
      }

      setPurchasing(planSlug);
      try {
        await requestPurchase({
          type: 'subs',
          request: {
            google: {
              skus: [mapping.product_id],
              subscriptionOffers: [{ sku: mapping.product_id, offerToken: offer.offerTokenAndroid }],
            },
          },
        });
      } catch (error) {
        setPurchasing(null);
        onError?.(error instanceof Error ? error.message : 'Could not open the Play Store.');
      }
    },
    [catalogue, subscriptions, requestPurchase, onError],
  );

  /**
   * Re-link purchases this Google account already owns — after a reinstall, a
   * device change, or a dropped verification call.
   */
  const restore = useCallback(async () => {
    if (!enabled) return;
    setRestoring(true);
    try {
      await getAvailablePurchases();
      // Also ask the backend to re-read anything it already knows about, which
      // covers a renewal whose notification never arrived.
      await billingService.restoreGooglePlayPurchases();
      await onEntitlementGranted?.();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Could not restore purchases.');
    } finally {
      setRestoring(false);
    }
  }, [enabled, getAvailablePurchases, onEntitlementGranted, onError]);

  // Purchases surfaced by a restore still need server-side verification.
  useEffect(() => {
    if (!enabled || availablePurchases.length === 0) return;
    availablePurchases.forEach((item) => {
      if (item.purchaseToken && !redeemedTokens.current.has(item.purchaseToken)) {
        redeem(item).catch(() => undefined);
      }
    });
  }, [enabled, availablePurchases, redeem]);

  return {
    /** True only when Android, configured in admin, and products exist. */
    available: enabled,
    connected,
    purchasing,
    restoring,
    purchase,
    restore,
    /** Play-formatted price, e.g. "৳299.00/month". */
    displayPriceFor: (planSlug: string): string | null => {
      const mapping = catalogue.find((item) => item.plan_slug === planSlug);
      const product = subscriptions.find((item) => item.id === mapping?.product_id);
      return product?.displayPrice ?? null;
    },
  };
}

export default useGooglePlayBilling;
