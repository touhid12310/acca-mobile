import type { ComponentType, ReactNode } from "react";
import { Platform, TurboModuleRegistry, type StyleProp, type ViewStyle } from "react-native";

import { isTestLab } from "../../modules/accounte-diagnostics";

/**
 * Smartlook session recordings — replays of what users did in the app
 * (taps, screens, rage clicks), in the Smartlook dashboard.
 *
 * Every call is fire-and-forget and never throws. A no-op on web, in Expo Go,
 * on dev clients built before Smartlook was added, without a project key
 * (EXPO_PUBLIC_SMARTLOOK_KEY), on Android 7 and older and on Google's test
 * robots. Dev builds record nothing unless EXPO_PUBLIC_SMARTLOOK_DEV=1.
 *
 * Privacy (a finance app): text fields and web views are masked by the SDK
 * (default class sensitivity); <Sensitive> masks balances and amounts; whole
 * screens go black while the app lock is up and on PRIVATE_SCREENS. The user
 * is the backend user id — never email or name.
 */

type SmartlookModule = typeof import("react-native-smartlook-analytics");

type SensitiveViewProps = {
  isSensitive: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

const PROJECT_KEY = process.env.EXPO_PUBLIC_SMARTLOOK_KEY?.trim() ?? "";
// The SDK encodes recordings to video on the phone (MediaCodec). The media
// framework on Android 7 Xiaomi phones aborts the whole app while encoding
// (SIGABRT in libstagefright on /login in 1.9.3), so record Android 8+ only.
const ANDROID_MIN_API = 26;
const ENABLED =
  Platform.OS !== "web" &&
  !(Platform.OS === "android" && Number(Platform.Version) < ANDROID_MIN_API) &&
  PROJECT_KEY !== "" &&
  (!__DEV__ || process.env.EXPO_PUBLIC_SMARTLOOK_DEV === "1");

/**
 * Recorded as a black screen: password / 2FA (profile, social 2FA step),
 * payment (billing — the EPS page is a web view, masked anyway), SMS text,
 * the lock settings and login activity (devices / IPs).
 */
const PRIVATE_SCREENS = [
  "/profile",
  "/billing",
  "/sms-import",
  "/app-lock",
  "/sessions",
  "/auth/callback",
];

let mod: SmartlookModule | null | undefined;

const load = (): SmartlookModule | null => {
  if (mod !== undefined) return mod;
  // TurboModuleRegistry.get first: the package calls getEnforcing while it
  // loads, which throws on a dev client built without it.
  if (!ENABLED || isTestLab() || !TurboModuleRegistry.get("SmartlookAnalytics")) {
    mod = null;
    return mod;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("react-native-smartlook-analytics") as SmartlookModule;
  } catch {
    mod = null;
  }
  return mod;
};

const run = (fn: (m: SmartlookModule) => unknown): void => {
  const m = load();
  if (!m) return;
  try {
    Promise.resolve(fn(m)).catch(() => {});
  } catch {
    // Native side missing or failed — ignore.
  }
};

let currentUser: string | null = null;
let currentScreen: string | null = null;
let isPrivate: boolean | null = null;

export const isPrivateScreen = (pathname: string): boolean =>
  PRIVATE_SCREENS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const smartlook = {
  /**
   * Start recording, black until setPrivate(false) — at launch the app lock
   * may still be coming up. Call once at start-up.
   */
  init(): void {
    run((m) => {
      const sl = m.default.instance;
      sl.preferences.setProjectKey(PROJECT_KEY);
      sl.sensitivity.enableDefaultClassSensitivity();
      sl.preferences.setWebViewSensitivity(true);
      isPrivate = true;
      sl.state.setRenderingMode(m.SmartlookRenderingMode.NoRendering);
      return sl.start();
    });
  },

  /** Black out the recording (app lock, private screens) or show the screen again. */
  setPrivate(next: boolean): void {
    if (isPrivate === next) return;
    run((m) => {
      isPrivate = next;
      return m.default.instance.state.setRenderingMode(
        next ? m.SmartlookRenderingMode.NoRendering : m.SmartlookRenderingMode.Native,
      );
    });
  },

  /** Backend user id only — never email or name. Pass null on logout. */
  setUser(id: string | number | null): void {
    const next = id === null ? null : String(id);
    if (next === currentUser) return;
    run((m) => {
      const user = m.default.instance.user;
      // A different person from here on (sign-out, account switch).
      if (currentUser !== null) user.openNewUser();
      currentUser = next;
      return next === null ? undefined : user.setIdentifier(next);
    });
  },

  /** Screen name from the route pattern (no record ids), for the session timeline. */
  setScreen(name: string): void {
    if (!name || name === currentScreen) return;
    run((m) => {
      const analytics = m.default.instance.analytics;
      if (currentScreen) analytics.trackNavigationExit(currentScreen);
      currentScreen = name;
      return analytics.trackNavigationEnter(name);
    });
  },

  /** The native masking view, or null when Smartlook isn't recording. */
  sensitiveView(): ComponentType<SensitiveViewProps> | null {
    return (load()?.SmartlookSensitiveView as ComponentType<SensitiveViewProps> | undefined) ?? null;
  },
};

export default smartlook;
