import { Platform, TurboModuleRegistry } from "react-native";

/**
 * Firebase Analytics (GA4) wrapper.
 *
 * Every call is fire-and-forget and never throws: analytics must not break a
 * user flow. It is a no-op on web (RNFB is native-only here) and on dev
 * clients built before the Firebase native modules were added.
 *
 * Privacy: this is a finance app — never send amounts, merchant names,
 * notes, emails or any other user-entered text. Only enums and counts.
 */

type Params = Record<string, string | number | boolean | undefined>;

type AnalyticsModule = typeof import("@react-native-firebase/analytics");

let mod: AnalyticsModule | null | undefined;

const load = (): AnalyticsModule | null => {
  if (mod !== undefined) return mod;
  // RNFB throws while its modules are still being evaluated when the native
  // side is absent (a dev client built before Firebase was added), and Metro
  // reports that even inside a try/catch — so check before requiring at all.
  if (Platform.OS === "web" || !TurboModuleRegistry.get("NativeRNFBTurboApp")) {
    mod = null;
    return mod;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require("@react-native-firebase/analytics") as AnalyticsModule;
  } catch {
    mod = null;
  }
  return mod;
};

const run = (fn: (m: AnalyticsModule) => unknown): void => {
  const m = load();
  if (!m) return;
  try {
    Promise.resolve(fn(m)).catch(() => {});
  } catch {
    // Native module missing (stale dev client) — ignore.
  }
};

export type LoginMethod = "email_code" | "email_link" | "google" | "apple";

export const analyticsService = {
  logEvent(name: string, params?: Params): void {
    run((m) => m.logEvent(m.getAnalytics(), name, params));
  },

  logScreenView(screenName: string): void {
    run((m) =>
      m.logEvent(m.getAnalytics(), "screen_view", {
        screen_name: screenName,
        screen_class: screenName,
      }),
    );
  },

  logLogin(method: LoginMethod): void {
    run((m) => m.logEvent(m.getAnalytics(), "login", { method }));
  },

  /** Backend user id only — never email or name. Pass null on logout. */
  setUserId(id: string | number | null): void {
    run((m) => m.setUserId(m.getAnalytics(), id === null ? null : String(id)));
  },
};

export default analyticsService;
