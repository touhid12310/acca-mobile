import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo";
import Constants from "expo-constants";
import { AppState, type AppStateStatus, Linking, Platform, Share } from "react-native";

import { apiRequest, getAuthToken } from "../config/api";
import { getCachedAppConfig } from "./appConfigService";
import { clearSessionError, sessionHadError } from "./sessionHealth";

/**
 * The in-app rating prompt, plus the "Rate" and "Share" actions on More.
 *
 * Neither store tells an app whether the user rated — or even whether the
 * sheet was shown — so the prompt is spent carefully: only right after a
 * success, only for people who have really used the app, and rarely.
 */

const STORAGE_KEY = "accounte.review.v1";

// The conditions, all of which must hold before the prompt is requested.
const MIN_ACCOUNT_AGE_DAYS = 7;
const MIN_ACTIVE_DAYS = 3;
const MIN_TRANSACTIONS = 5;
const COOLDOWN_DAYS = 90;
const MAX_PROMPTS = 3;
/** Lets the success toast and any screen change settle before the sheet. */
const PROMPT_DELAY_MS = 1500;
/** Coming back after this long in the background counts as a new session. */
const NEW_SESSION_AFTER_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_SHARE_MESSAGE = "I manage my money with AccountE. Try it:";

export type ReviewTrigger =
  | "goal_reached"
  | "loan_paid_off"
  | "premium_activated"
  | "transaction_saved";

interface ReviewState {
  /** Local dates (YYYY-MM-DD) the app was used; only the count matters. */
  activeDays: string[];
  /** ISO times the automatic prompt was requested. */
  promptedAt: string[];
  /** When the user chose "Rate AccountE" themselves. */
  rateTappedAt: string | null;
  /** What caused the most recent automatic prompt, for debugging. */
  lastTrigger: ReviewTrigger | null;
}

const EMPTY_STATE: ReviewState = {
  activeDays: [],
  promptedAt: [],
  rateTappedAt: null,
  lastTrigger: null,
};

let backgroundedAt: number | null = null;
let inFlight = false;

type StoreReviewModule = typeof import("expo-store-review");
let storeReviewModule: StoreReviewModule | null | undefined;

/**
 * expo-store-review is native: a build made before it was added (or an OTA
 * update landing on one) throws "Cannot find native module" the moment it is
 * imported. Metro reports that as fatal even inside a try/catch, so ask
 * whether the native side exists first, and only then load the package.
 * No native module = no in-app review on this build; Rate/Share still work.
 */
const getStoreReview = (): StoreReviewModule | null => {
  if (storeReviewModule !== undefined) return storeReviewModule;

  storeReviewModule = null;
  if (requireOptionalNativeModule("ExpoStoreReview")) {
    try {
      storeReviewModule = require("expo-store-review") as StoreReviewModule;
    } catch {
      // Leave it null — the prompt is optional.
    }
  }
  return storeReviewModule;
};

const localDay = (date: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const loadState = async (): Promise<ReviewState> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY_STATE, ...(JSON.parse(raw) as Partial<ReviewState>) } : { ...EMPTY_STATE };
  } catch {
    return { ...EMPTY_STATE };
  }
};

const saveState = async (state: ReviewState): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best effort — losing this only means the prompt may wait a little longer.
  }
};

const recordActiveDay = async (): Promise<void> => {
  const state = await loadState();
  const today = localDay();
  if (state.activeDays.includes(today)) return;
  await saveState({ ...state, activeDays: [...state.activeDays, today].slice(-30) });
};

/**
 * Record the days the app is used, and start a fresh session after a long
 * spell in the background. Call once signed in; returns the cleanup.
 */
export const startReviewTracking = (): (() => void) => {
  void recordActiveDay();

  const onChange = (next: AppStateStatus) => {
    if (next === "active") {
      if (backgroundedAt !== null && Date.now() - backgroundedAt > NEW_SESSION_AFTER_MS) {
        clearSessionError();
      }
      backgroundedAt = null;
      void recordActiveDay();
      return;
    }

    if (backgroundedAt === null) backgroundedAt = Date.now();
  };

  const subscription = AppState.addEventListener("change", onChange);
  return () => subscription.remove();
};

const lastAskedAt = (state: ReviewState): number => {
  const times = [...state.promptedAt, ...(state.rateTappedAt ? [state.rateTappedAt] : [])]
    .map((iso) => Date.parse(iso))
    .filter((time) => Number.isFinite(time));

  return times.length > 0 ? Math.max(...times) : 0;
};

interface ReviewStatus {
  account_age_days?: number;
  transactions_count?: number;
}

/** Account age and saved transactions live on the server, not the device. */
const serverSaysEligible = async (): Promise<boolean> => {
  const token = await getAuthToken();
  if (!token) return false;

  const response = await apiRequest("/app/review-status", {
    method: "GET",
    token,
    timeoutMs: 8000,
  });
  if (!response.success) return false;

  const body = response.data as ({ data?: ReviewStatus } & ReviewStatus) | undefined;
  const status = body?.data ?? body;

  return (
    (status?.account_age_days ?? 0) >= MIN_ACCOUNT_AGE_DAYS &&
    (status?.transactions_count ?? 0) >= MIN_TRANSACTIONS
  );
};

/**
 * Ask for a rating after a success, if every condition holds. Safe to call
 * from any success path: it quietly does nothing when it should not ask.
 */
export const maybeAskForReview = async (trigger: ReviewTrigger): Promise<void> => {
  if (inFlight || sessionHadError()) return;
  inFlight = true;

  try {
    const StoreReview = getStoreReview();
    if (!StoreReview || !(await StoreReview.isAvailableAsync())) return;

    // Cheap, on-device checks first; the server call only if they pass.
    const state = await loadState();
    if (state.activeDays.length < MIN_ACTIVE_DAYS) return;
    if (state.promptedAt.length >= MAX_PROMPTS) return;
    if (Date.now() - lastAskedAt(state) < COOLDOWN_DAYS * DAY_MS) return;
    if (!(await serverSaysEligible())) return;

    await new Promise((resolve) => setTimeout(resolve, PROMPT_DELAY_MS));

    // Something may have failed, or the app been backgrounded, meanwhile.
    if (sessionHadError() || AppState.currentState !== "active") return;

    // Recorded before asking: neither store reports whether the sheet showed.
    await saveState({
      ...state,
      promptedAt: [...state.promptedAt, new Date().toISOString()],
      lastTrigger: trigger,
    });

    await StoreReview.requestReview();
  } catch {
    // A rating prompt is never worth surfacing an error for.
  } finally {
    inFlight = false;
  }
};

const fallbackPlayUrl = (): string =>
  `https://play.google.com/store/apps/details?id=${Constants.expoConfig?.android?.package ?? "com.accounte.finance"}`;

/** The admin-set store link for this phone, falling back to app.json's, then Play. */
const storeUrlForThisPlatform = async (): Promise<string | null> => {
  const config = await getCachedAppConfig();
  const appJsonUrl = getStoreReview()?.storeUrl() ?? null;

  if (Platform.OS === "ios") {
    return config?.ios_url || appJsonUrl;
  }

  return config?.android_url || appJsonUrl || fallbackPlayUrl();
};

/**
 * "Rate AccountE" on the More screen. Opens the store listing directly — the
 * in-app sheet is quota-limited and may silently not appear from a tap.
 * Returns false when no store link is configured for this platform.
 */
export const openStoreListing = async (): Promise<boolean> => {
  const url = await storeUrlForThisPlatform();
  if (!url) return false;

  // They chose to rate: no automatic prompt for the next 90 days.
  const state = await loadState();
  await saveState({ ...state, rateTappedAt: new Date().toISOString() });

  await Linking.openURL(url);
  return true;
};

/** "Share AccountE": the admin-set link and message, else the store link. */
export const shareApp = async (): Promise<void> => {
  const config = await getCachedAppConfig();

  const url =
    config?.share_url ||
    (Platform.OS === "ios" ? config?.ios_url : config?.android_url) ||
    config?.android_url ||
    config?.ios_url ||
    fallbackPlayUrl();
  const message = (config?.share_message || DEFAULT_SHARE_MESSAGE).trim();

  // iOS shows the url as its own attachment; Android only sends `message`.
  await Share.share(
    Platform.OS === "ios" ? { message, url } : { message: `${message} ${url}` },
    { dialogTitle: "Share AccountE" },
  );
};

export default {
  startReviewTracking,
  maybeAskForReview,
  openStoreListing,
  shareApp,
};
