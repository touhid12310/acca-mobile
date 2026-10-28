import { Platform, TurboModuleRegistry } from "react-native";

import { isTestLab } from "../../modules/accounte-diagnostics";

/**
 * Firebase Crashlytics wrapper — native crashes (Java / Kotlin / Swift / C++),
 * Android freezes (ANR) and JS crashes, with full stack traces, in the
 * Firebase console. The admin panel's App errors page gets a short "App
 * crashed" row for each one too (see appExitMonitor.ts).
 *
 * Every call is fire-and-forget and never throws. A no-op on web, in Expo Go
 * and on dev clients built before Crashlytics was added. Debug builds collect
 * nothing (`crashlytics_debug_enabled: false` in firebase.json).
 *
 * Privacy: only the backend user id and the screen path — never email, name,
 * amounts or anything the user typed.
 */

type CrashlyticsModule = typeof import("@react-native-firebase/crashlytics");

let mod: CrashlyticsModule | null | undefined;

const load = (): CrashlyticsModule | null => {
  if (mod !== undefined) return mod;
  // Same guard as analyticsService: requiring RNFB without its native side
  // throws during module evaluation, which Metro reports even when caught.
  if (
    Platform.OS === "web" ||
    !TurboModuleRegistry.get("NativeRNFBTurboApp") ||
    !TurboModuleRegistry.get("NativeRNFBTurboCrashlytics")
  ) {
    mod = null;
    return mod;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("@react-native-firebase/crashlytics") as CrashlyticsModule;
  } catch {
    mod = null;
  }
  return mod;
};

const run = (fn: (m: CrashlyticsModule) => unknown): void => {
  const m = load();
  if (!m) return;
  try {
    Promise.resolve(fn(m)).catch(() => {});
  } catch {
    // Native module missing (stale dev client) — ignore.
  }
};

export const crashlytics = {
  /**
   * Start Crashlytics: it wraps the global JS error handler, so call it once
   * right after installErrorReporting() — both then see every JS crash.
   */
  init(): void {
    run((m) => {
      const instance = m.getCrashlytics();
      // Google's test robots (Play pre-launch report) open library screens
      // directly and crash them; none of that is a real user's crash. The
      // setting sticks, so later launches on that device collect nothing.
      return isTestLab() ? m.setCrashlyticsCollectionEnabled(instance, false) : instance;
    });
  },

  /** Backend user id only — never email or name. Pass null on logout. */
  setUser(id: string | number | null): void {
    run((m) => m.setUserId(m.getCrashlytics(), id === null ? "" : String(id)));
  },

  /** The current screen, attached to the next crash, plus a breadcrumb. */
  setScreen(pathname: string): void {
    if (!pathname) return;
    run((m) => {
      const instance = m.getCrashlytics();
      m.log(instance, `screen ${pathname}`);
      return m.setAttribute(instance, "screen", pathname);
    });
  },

  /** A breadcrumb shown with the next crash report. */
  log(message: string): void {
    run((m) => m.log(m.getCrashlytics(), message));
  },

  /** True / false when known; null without Crashlytics (or in debug builds). */
  async didCrashLastTime(): Promise<boolean | null> {
    const m = load();
    if (!m) return null;
    try {
      const instance = m.getCrashlytics();
      if (!instance.isCrashlyticsCollectionEnabled) return null;
      return await m.didCrashOnPreviousExecution(instance);
    } catch {
      return null;
    }
  },
};

export default crashlytics;
