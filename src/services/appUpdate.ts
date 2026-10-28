import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { getPublicAppConfig, type AppUpdateTarget } from './appConfigService';
import { compareVersions } from '../utils/version';

/**
 * "A new version is available" — admin → Settings → App updates sets each
 * platform's latest and minimum version (GET /public/app-config →
 * app_update). Older than the latest: a popup with Update / Later. Older
 * than the minimum: a full screen that only offers Update.
 */

export type UpdateDecision = {
  kind: 'required' | 'available';
  /** The version to update to. */
  version: string;
  storeUrl: string;
} | null;

type Snooze = { version: string; until: number };

const SNOOZE_KEY = 'accounte_update_snooze_v1';
/** "Later" waits this long before the same version is offered again. */
export const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

const ANDROID_PACKAGE = Constants.expoConfig?.android?.package || 'com.accounte.finance';

/** The version this build was made as (app.json "version"). */
export const installedVersion = (): string => Constants.expoConfig?.version ?? '';

export const storeName = (): string => (Platform.OS === 'ios' ? 'App Store' : 'Play Store');

/** What to show for this install. Pure, so it can be tested on its own. */
export function decideUpdate({
  installed,
  target,
  platform,
  snooze,
  now,
}: {
  installed: string;
  target: AppUpdateTarget;
  platform: string;
  snooze: Snooze | null;
  now: number;
}): UpdateDecision {
  if (platform !== 'android' && platform !== 'ios') return null;
  // iPhones have no fallback listing: without the admin's link there is
  // nowhere for the Update button to go.
  const storeUrl =
    target.store_url || (platform === 'android' ? `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}` : '');
  if (!storeUrl) return null;

  const latest = target.latest_version;
  const minimum = target.min_version;

  if (compareVersions(installed, minimum) === -1) {
    const newest = compareVersions(latest, minimum) === 1 ? latest : minimum;
    return { kind: 'required', version: newest, storeUrl };
  }

  if (compareVersions(installed, latest) === -1) {
    if (snooze && snooze.version === latest && now < snooze.until) return null;
    return { kind: 'available', version: latest, storeUrl };
  }

  return null;
}

const readSnooze = async (): Promise<Snooze | null> => {
  try {
    const raw = await AsyncStorage.getItem(SNOOZE_KEY);
    const value = raw ? (JSON.parse(raw) as Partial<Snooze>) : null;
    return value && typeof value.version === 'string' && typeof value.until === 'number'
      ? { version: value.version, until: value.until }
      : null;
  } catch {
    return null;
  }
};

/** "Later": don't offer this version again for a few days. */
export const snoozeUpdate = async (version: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(SNOOZE_KEY, JSON.stringify({ version, until: Date.now() + SNOOZE_MS }));
  } catch {
    // Storage full or blocked: the popup just comes back next launch.
  }
};

/**
 * Ask the API what the latest and minimum versions are. `undefined` when it
 * couldn't be reached, so the caller keeps what it showed before (an
 * "Update required" screen must not vanish just because the phone is offline).
 */
export async function checkForUpdate(): Promise<UpdateDecision | undefined> {
  const config = await getPublicAppConfig();
  if (!config) return undefined;
  const target = Platform.OS === 'ios' ? config.app_update.ios : config.app_update.android;
  return decideUpdate({
    installed: installedVersion(),
    target,
    platform: Platform.OS,
    snooze: await readSnooze(),
    now: Date.now(),
  });
}

/** Open AccountE's store page: the Play Store app directly on Android. */
export async function openStore(storeUrl: string): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(`market://details?id=${ANDROID_PACKAGE}`);
      return;
    } catch {
      // No Play Store app (rare): fall through to the web listing.
    }
  }
  await Linking.openURL(storeUrl);
}
