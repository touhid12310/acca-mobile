import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import {
  useIAP,
  ErrorCode,
  fetchProducts as fetchStoreProducts,
  getAvailablePurchases as fetchAvailablePurchases,
} from 'expo-iap';
import type { Purchase, ProductSubscription } from 'expo-iap';

import billingService, { StoreProduct } from '../services/billingService';

type Options = {
  /** Called after the backend has verified a purchase and granted Premium. */
  onEntitlementGranted?: () => void | Promise<void>;
  onRestoreCompleted?: (active: boolean) => void | Promise<void>;
  onError?: (message: string) => void;
};

const unwrap = <T,>(value: T | { data: T } | undefined): T | undefined => {
  if (!value) return undefined;
  return typeof value === 'object' && 'data' in value ? (value as { data: T }).data : (value as T);
};

const isExpoGo = Constants.appOwnership === 'expo';

const purchaseTokenOf = (purchase: Purchase): string | undefined =>
  purchase.purchaseToken ||
  (purchase as { purchaseTokenAndroid?: string | null }).purchaseTokenAndroid ||
  undefined;

const offerTokenOf = (offer: {
  offerTokenAndroid?: string | null;
  offerToken?: string | null;
}): string | undefined => offer.offerTokenAndroid || offer.offerToken || undefined;

const matchesProductId = (item: { id?: string; productId?: string }, productId: string) =>
  item.id === productId || item.productId === productId;

const apiError = (response: { message?: string; error?: string; data?: unknown }, fallback: string) => {
  const data = response.data as { message?: string } | undefined;
  return response.message || response.error || data?.message || fallback;
};

/**
 * Native store subscriptions: Google Play on Android, App Store on iOS.
 *
 * Play / StoreKit policy requires digital subscriptions to be sold through
 * the platform store, so this replaces the EPS redirect on those platforms.
 * The purchase is always verified server-side before Premium is granted.
 *
 * Inert on web: `available` stays false and nothing else runs.
 */
export function useGooglePlayBilling({
  onEntitlementGranted,
  onRestoreCompleted,
  onError,
}: Options = {}) {
  const isAndroid = Platform.OS === 'android';
  const isIos = Platform.OS === 'ios';
  const isNativeStore = isAndroid || isIos;
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const redeemedTokens = useRef<Set<string>>(new Set());
  const finishedTokens = useRef<Set<string>>(new Set());
  // Store events can arrive before `productsQuery` resolves. Hold them here
  // instead of dropping them, and drain once the backend catalogue is known.
  const pendingPurchases = useRef<Purchase[]>([]);
  const processPurchaseRef = useRef<((purchase: Purchase) => Promise<void>) | null>(null);

  const productsQuery = useQuery({
    queryKey: ['store-products', Platform.OS],
    enabled: isNativeStore,
    queryFn: async () => {
      const response = isAndroid
        ? await billingService.getGooglePlayProducts()
        : await billingService.getAppStoreProducts();
      if (!response.success) return { enabled: false, products: [] as StoreProduct[] };
      return unwrap(response.data) || { enabled: false, products: [] as StoreProduct[] };
    },
  });

  const catalogue = useMemo(() => productsQuery.data?.products || [], [productsQuery.data]);
  const backendEnabled = Boolean(isNativeStore && productsQuery.data?.enabled && catalogue.length > 0);
  const backendEnabledRef = useRef(backendEnabled);
  backendEnabledRef.current = backendEnabled;

  const redeem = useCallback(
    async (purchase: Purchase) => {
      const token = purchaseTokenOf(purchase);
      if (!token) {
        onError?.(
          isIos
            ? 'The App Store did not return a transaction to verify.'
            : 'Google Play did not return a purchase token.',
        );
        return false;
      }
      if (redeemedTokens.current.has(token)) return true;

      const response = isIos
        ? await billingService.redeemAppStorePurchase(purchase.productId, token)
        : await billingService.redeemGooglePlayPurchase(purchase.productId, token);

      if (!response.success) {
        onError?.(apiError(response, 'Could not verify the purchase with our servers.'));
        return false;
      }

      redeemedTokens.current.add(token);
      await onEntitlementGranted?.();
      return true;
    },
    [isIos, onEntitlementGranted, onError],
  );

  const {
    connected,
    products,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
    availablePurchases,
    reconnect,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      if (!backendEnabledRef.current) {
        const token = purchaseTokenOf(purchase);
        if (!pendingPurchases.current.some((queued) => purchaseTokenOf(queued) === token)) {
          pendingPurchases.current.push(purchase);
        }
        return;
      }
      await processPurchaseRef.current?.(purchase);
    },
    onPurchaseError: (error) => {
      if (!backendEnabledRef.current) return;
      setPurchasing(null);
      if (error?.code !== ErrorCode.UserCancelled) {
        onError?.(
          error?.message ||
            (isIos
              ? 'The App Store could not complete the purchase.'
              : 'The Play Store could not complete the purchase.'),
        );
      }
    },
    onError: (error) => {
      if (!backendEnabledRef.current) return;
      onError?.(error.message);
    },
  });

  const processPurchase = useCallback(
    async (purchase: Purchase) => {
      try {
        const verified = await redeem(purchase);
        if (verified) {
          await finishTransaction({ purchase, isConsumable: false });
          const token = purchaseTokenOf(purchase);
          if (token) finishedTokens.current.add(token);
        }
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'Could not complete the purchase.');
      } finally {
        setPurchasing(null);
      }
    },
    [redeem, finishTransaction, onError],
  );
  processPurchaseRef.current = processPurchase;

  // Drain anything that landed while the products query was still in flight.
  useEffect(() => {
    if (!backendEnabled || pendingPurchases.current.length === 0) return;
    pendingPurchases.current.splice(0).forEach((purchase) => {
      processPurchase(purchase).catch(() => undefined);
    });
  }, [backendEnabled, processPurchase]);

  useEffect(() => {
    if (!backendEnabled || connected || isExpoGo) return;
    const timer = setTimeout(() => {
      reconnect().catch(() => undefined);
    }, 1500);
    return () => clearTimeout(timer);
  }, [backendEnabled, connected, reconnect]);

  useEffect(() => {
    if (!backendEnabled || !connected) return;
    fetchProducts({ skus: catalogue.map((item) => item.product_id), type: 'subs' }).catch(() => {
      onError?.(
        isIos
          ? 'Could not load subscription pricing from the App Store.'
          : 'Could not load subscription pricing from the Play Store.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendEnabled, connected, catalogue]);

  const storeCatalog = useMemo(
    () => [...subscriptions, ...products] as ProductSubscription[],
    [subscriptions, products],
  );

  const findStoreProduct = useCallback(
    (productId: string) =>
      storeCatalog.find((item) => matchesProductId(item as { id?: string; productId?: string }, productId)),
    [storeCatalog],
  );

  /**
   * Resolve the store product for a plan on a given cycle.
   *
   * Matching on the slug alone quoted (and would have charged) the monthly
   * product against a yearly plan. A catalogue row without a cycle is an older
   * backend, and is treated as monthly.
   */
  const productMappingFor = useCallback(
    (planSlug: string, cycle?: string) => {
      const wanted = cycle || 'monthly';

      return (
        catalogue.find(
          (item) => item.plan_slug === planSlug && (item.cycle || 'monthly') === wanted,
        ) ?? null
      );
    },
    [catalogue],
  );

  const purchase = useCallback(
    async (planSlug: string, cycle?: string) => {
      if (isExpoGo) {
        onError?.(
          'In-app purchases need a development or store build. Expo Go cannot talk to the Play Store or App Store.',
        );
        return;
      }

      const mapping = productMappingFor(planSlug, cycle);
      if (!mapping) {
        onError?.(
          isIos
            ? `This plan is not available on the App Store on a ${cycle || 'monthly'} cycle yet.`
            : `This plan is not available on the Play Store on a ${cycle || 'monthly'} cycle yet.`,
        );
        return;
      }

      if (!connected) {
        const recovered = await reconnect().catch(() => false);
        if (!recovered) {
          onError?.(
            isIos
              ? 'Could not connect to the App Store. Try again on a real device.'
              : 'Could not connect to the Play Store. Use a device with Google Play (not an emulator without Play services).',
          );
          return;
        }
      }

      if (isIos) {
        setPurchasing(planSlug);
        try {
          await requestPurchase({
            type: 'subs',
            request: {
              apple: { sku: mapping.product_id },
            },
          });
        } catch (error) {
          setPurchasing(null);
          onError?.(error instanceof Error ? error.message : 'Could not open the App Store.');
        }
        return;
      }

      // The catalogue effect only runs on the render *after* `connected` flips,
      // so straight off a reconnect this closure still sees an empty catalogue.
      // Fetch on demand rather than reporting a bogus configuration error.
      let product = findStoreProduct(mapping.product_id);
      if (!product) {
        const fetched = await fetchStoreProducts({
          skus: catalogue.map((item) => item.product_id),
          type: 'subs',
        }).catch(() => []);
        product = (fetched as ProductSubscription[]).find((item) =>
          matchesProductId(item as { id?: string; productId?: string }, mapping.product_id),
        );
      }

      const offers = (
        product as {
          subscriptionOffers?: {
            basePlanIdAndroid?: string | null;
            offerTokenAndroid?: string | null;
            offerToken?: string | null;
          }[];
        }
      )?.subscriptionOffers;
      const offer =
        offers?.find((candidate) => candidate.basePlanIdAndroid === mapping.base_plan_id) || offers?.[0];
      const offerToken = offer ? offerTokenOf(offer) : undefined;

      if (!offerToken) {
        onError?.(
          !product
            ? `Play Store has no listing for "${mapping.product_id}". Check the Play product ID on this plan and that the app is on an internal/testing track.`
            : 'The Play Store has no active offer for this subscription yet.',
        );
        return;
      }

      setPurchasing(planSlug);
      try {
        await requestPurchase({
          type: 'subs',
          request: {
            google: {
              skus: [mapping.product_id],
              subscriptionOffers: [{ sku: mapping.product_id, offerToken }],
            },
          },
        });
      } catch (error) {
        setPurchasing(null);
        onError?.(error instanceof Error ? error.message : 'Could not open the Play Store.');
      }
    },
    [
      catalogue,
      connected,
      findStoreProduct,
      isIos,
      onError,
      reconnect,
      requestPurchase,
    ],
  );

  const restore = useCallback(async () => {
    if (!backendEnabled) return;
    setRestoring(true);
    try {
      let response;
      if (isIos) {
        // Query StoreKit now and send that authoritative set to the backend.
        // Replaying locally cached server rows cannot observe refunds/revokes.
        const purchases = await fetchAvailablePurchases({
          onlyIncludeActiveItemsIOS: true,
        });
        const transactionJwss = purchases
          .map(purchaseTokenOf)
          .filter((value): value is string => Boolean(value));
        response = await billingService.restoreAppStorePurchases(transactionJwss);
      } else {
        await getAvailablePurchases();
        response = await billingService.restoreGooglePlayPurchases();
      }

      if (!response.success) {
        throw new Error(apiError(response, 'Could not restore purchases.'));
      }

      const overview = unwrap(response.data);
      const active = overview?.subscription?.status === 'active';
      await onRestoreCompleted?.(active);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Could not restore purchases.');
    } finally {
      setRestoring(false);
    }
  }, [backendEnabled, getAvailablePurchases, isIos, onError, onRestoreCompleted]);

  useEffect(() => {
    if (!backendEnabled || availablePurchases.length === 0) return;
    availablePurchases.forEach((item) => {
      const token = purchaseTokenOf(item);
      if (token && !finishedTokens.current.has(token)) {
        processPurchase(item).catch(() => undefined);
      }
    });
  }, [backendEnabled, availablePurchases, processPurchase]);

  return {
    /** True when this platform's store is configured in admin and products exist. */
    available: backendEnabled,
    store: isIos ? 'app_store' : isAndroid ? 'google_play' : null,
    connected,
    purchasing,
    restoring,
    expoGoBlocked: isExpoGo && backendEnabled,
    purchase,
    restore,
    /** Store price for a plan on a cycle, or null when the store has no such product. */
    displayPriceFor: (planSlug: string, cycle?: string): string | null => {
      const mapping = productMappingFor(planSlug, cycle);
      return findStoreProduct(mapping?.product_id || '')?.displayPrice ?? null;
    },
    /** Whether the store can sell this plan on this cycle at all. */
    supportsCycle: (planSlug: string, cycle?: string): boolean =>
      Boolean(productMappingFor(planSlug, cycle)),
  };
}

export default useGooglePlayBilling;
