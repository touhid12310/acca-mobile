import { NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo";

/**
 * Meta (Facebook) App Events: install attribution plus the few conversion
 * events Meta app ads optimise for — sign-up, onboarding, Premium checkout,
 * trial and subscription. Installs and app opens are logged by the SDK on
 * its own (`autoLogAppEventsEnabled` in app.json).
 *
 * Same contract as analyticsService: fire-and-forget, never throws, a no-op
 * on web and on dev clients built before the Meta SDK was added.
 *
 * Privacy: this is a finance app. Only Meta's standard events and parameters
 * are sent (Meta can put finance apps under "core setup", which drops custom
 * ones anyway). The only money sent is the price of our own Premium plan —
 * never transaction amounts, balances, merchants, notes or anything else the
 * user typed. The only personal datum is the account email, which the SDK
 * hashes (SHA-256) on the device before it leaves.
 */

type FbSdk = typeof import("react-native-fbsdk-next");
type TrackingModule = typeof import("expo-tracking-transparency");
type Params = Record<string, string | number>;

export type RegistrationMethod = "email" | "google" | "apple";

// Meta's standard event names (the values behind AppEventsConstants).
const EVENT = {
  completeRegistration: "fb_mobile_complete_registration",
  completeTutorial: "fb_mobile_tutorial_completion",
  viewContent: "fb_mobile_content_view",
  initiateCheckout: "fb_mobile_initiated_checkout",
  startTrial: "StartTrial",
  subscribe: "Subscribe",
} as const;

const LOGGED_ORDERS_KEY = "accounte_meta_logged_orders_v1";
const MAX_LOGGED_ORDERS = 50;

let sdk: FbSdk | null | undefined;

const load = (): FbSdk | null => {
  if (sdk !== undefined) return sdk;
  // A dev client built before the SDK was added has no native module, and
  // the JS package would throw on every call — check before requiring.
  if (Platform.OS === "web" || !NativeModules.FBAppEventsLogger) {
    sdk = null;
    return sdk;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sdk = require("react-native-fbsdk-next") as FbSdk;
  } catch {
    sdk = null;
  }
  return sdk;
};

const run = (fn: (m: FbSdk) => unknown): void => {
  const m = load();
  if (!m) return;
  try {
    Promise.resolve(fn(m)).catch(() => {});
  } catch {
    // Native module missing or rejected the call — ignore.
  }
};

const loadTracking = (): TrackingModule | null => {
  if (Platform.OS !== "ios" || !requireOptionalNativeModule("ExpoTrackingTransparency")) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-tracking-transparency") as TrackingModule;
  } catch {
    return null;
  }
};

/** The native SDK crashes on a malformed currency code, so only pass ISO 4217. */
const validCurrency = (currency?: string | null): string | null => {
  const code = (currency || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
};

const validValue = (value?: number | null): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;

/**
 * A purchase can be confirmed more than once (StoreKit redelivers an
 * unfinished transaction, a payment link is reopened). Remember the last few
 * so each one is counted once.
 */
const claimOrder = async (orderKey: string): Promise<boolean> => {
  try {
    const stored = await AsyncStorage.getItem(LOGGED_ORDERS_KEY);
    const logged: string[] = stored ? JSON.parse(stored) : [];
    if (logged.includes(orderKey)) return false;
    logged.push(orderKey);
    await AsyncStorage.setItem(LOGGED_ORDERS_KEY, JSON.stringify(logged.slice(-MAX_LOGGED_ORDERS)));
  } catch {
    // Storage unavailable: count it rather than lose it.
  }
  return true;
};

export type SubscriptionPurchase = {
  /** Store transaction / purchase token / payment id — dedupes repeats. */
  orderKey: string;
  planSlug: string;
  cycle?: string | null;
  value?: number | null;
  currency?: string | null;
};

export const metaEvents = {
  /** On app start: keep the SDK's tracking flag in line with the iOS ATT choice. */
  init(): void {
    const att = loadTracking();
    if (!att) return;
    att
      .getTrackingPermissionsAsync()
      .then(({ granted }) => run((m) => m.Settings.setAdvertiserTrackingEnabled(granted)))
      .catch(() => {});
  },

  /**
   * iOS only: ask once for App Tracking Transparency. Without it Meta still
   * receives events, but only through its privacy-preserving (aggregated)
   * measurement. Asking again after an answer is a no-op.
   */
  async requestTrackingPermission(): Promise<void> {
    const att = loadTracking();
    if (!att) return;
    try {
      const current = await att.getTrackingPermissionsAsync();
      const result =
        current.status === "undetermined" && current.canAskAgain
          ? await att.requestTrackingPermissionsAsync()
          : current;
      run((m) => m.Settings.setAdvertiserTrackingEnabled(result.granted));
    } catch {
      // ATT unavailable — Meta falls back to aggregated measurement.
    }
  },

  /** Backend user id plus the email (hashed by the SDK). Pass null on logout. */
  setUser(user: { id: string | number; email?: string | null } | null): void {
    run((m) => {
      if (!user) {
        m.AppEventsLogger.setUserID(null);
        // Patched in (patches/react-native-fbsdk-next+13.4.3.patch): on
        // Android, setUserData with empty values keeps the old hashes.
        NativeModules.FBAppEventsLogger?.clearUserData?.();
        return;
      }
      m.AppEventsLogger.setUserID(String(user.id));
      const email = user.email?.trim().toLowerCase();
      if (email) m.AppEventsLogger.setUserData({ email });
    });
  },

  logRegistration(method: RegistrationMethod): void {
    run((m) =>
      m.AppEventsLogger.logEvent(EVENT.completeRegistration, {
        fb_registration_method: method,
      }),
    );
  },

  logOnboardingComplete(): void {
    run((m) => m.AppEventsLogger.logEvent(EVENT.completeTutorial, { fb_success: 1 }));
  },

  /** The Premium / billing screen was opened. */
  logViewPremium(): void {
    run((m) =>
      m.AppEventsLogger.logEvent(EVENT.viewContent, {
        fb_content_type: "subscription",
        fb_content_id: "premium",
      }),
    );
  },

  /** The user chose a plan and a payment rail was about to open. */
  logCheckout(planSlug: string, cycle?: string | null, value?: number | null, currency?: string | null): void {
    const params: Params = {
      fb_content_type: "subscription",
      fb_content_id: cycle ? `${planSlug}_${cycle}` : planSlug,
      fb_num_items: 1,
      fb_payment_info_available: 0,
    };
    const amount = validValue(value);
    const code = validCurrency(currency);
    if (amount !== null && code) params.fb_currency = code;
    run((m) =>
      amount !== null && code
        ? m.AppEventsLogger.logEvent(EVENT.initiateCheckout, amount, params)
        : m.AppEventsLogger.logEvent(EVENT.initiateCheckout, params),
    );
  },

  logStartTrial(planSlug: string): void {
    run((m) =>
      m.AppEventsLogger.logEvent(EVENT.startTrial, {
        fb_content_type: "subscription",
        fb_content_id: planSlug,
      }),
    );
  },

  /**
   * A paid Premium subscription the server has confirmed: Subscribe plus
   * Purchase (the event Meta's value optimisation reads). Counted once per
   * order.
   */
  logSubscription(purchase: SubscriptionPurchase): void {
    if (!load()) return;
    const amount = validValue(purchase.value);
    const code = validCurrency(purchase.currency);
    const contentId = purchase.cycle ? `${purchase.planSlug}_${purchase.cycle}` : purchase.planSlug;

    claimOrder(purchase.orderKey)
      .then((isNew) => {
        if (!isNew) return;
        const params: Params = {
          fb_content_type: "subscription",
          fb_content_id: contentId,
          fb_num_items: 1,
        };
        run((m) => {
          if (amount !== null && code) {
            m.AppEventsLogger.logEvent(EVENT.subscribe, amount, { ...params, fb_currency: code });
            m.AppEventsLogger.logPurchase(amount, code, params);
          } else {
            m.AppEventsLogger.logEvent(EVENT.subscribe, params);
          }
        });
      })
      .catch(() => {});
  },
};

export default metaEvents;
