import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";

import API_CONFIG, { apiRequest } from "../config/api";
import { Notifications } from "./notifications";

let cachedToken: string | null = null;

const getProjectId = (): string | undefined => {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
};

export const ensureAndroidChannel = async () => {
  if (Platform.OS !== "android" || !Notifications) return;
  // HIGH importance lets finance alerts (low balance, budget overage,
  // schedule reminders) appear as heads-up — DEFAULT only drops them
  // silently into the tray, which users routinely miss.
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 80, 200],
    lightColor: "#3b82f6",
    // No `sound` key: leaving it out gives the phone's default notification
    // sound. `sound: "default"` is read as a custom sound FILE named
    // "default" — expo-notifications then logs "Custom sound 'default' not
    // found in native app" on every start (the sound still falls back to the
    // default). Add a real file via the plugin's `sounds` array if a custom
    // tone is ever wanted.
    enableVibrate: true,
    enableLights: true,
  });
};

export const requestPushPermission = async (): Promise<boolean> => {
  if (!Notifications || !Device.isDevice) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return requested.status === "granted";
};

export const getExpoPushToken = async (): Promise<string | null> => {
  if (cachedToken) return cachedToken;
  if (!Notifications || !Device.isDevice) return null;

  const projectId = getProjectId();
  if (!projectId) return null;

  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    cachedToken = result.data;
    return cachedToken;
  } catch (error) {
    return null;
  }
};

export const registerDevice = async (authToken: string): Promise<boolean> => {
  await ensureAndroidChannel();
  const granted = await requestPushPermission();
  if (!granted) return false;

  const pushToken = await getExpoPushToken();
  if (!pushToken) return false;

  const result = await apiRequest(API_CONFIG.ENDPOINTS.DEVICES_REGISTER, {
    method: "POST",
    body: {
      token: pushToken,
      platform: Platform.OS,
      device_name: Device.deviceName || `${Platform.OS} device`,
      // Lets admin see who is still on an old build.
      app_version: Constants.expoConfig?.version ?? null,
      os_version: Device.osVersion ?? null,
    },
    token: authToken,
  });

  return result.success;
};

export const unregisterDevice = async (authToken: string): Promise<boolean> => {
  // cachedToken lives in memory only — after an app restart it's gone but the
  // server-side device row is not, so re-derive the token rather than bailing,
  // otherwise a logged-out device keeps receiving the user's pushes.
  const pushToken = cachedToken ?? (await getExpoPushToken());
  if (!pushToken) return true;
  const result = await apiRequest(API_CONFIG.ENDPOINTS.DEVICES_UNREGISTER, {
    method: "POST",
    body: { token: pushToken },
    token: authToken,
  });
  cachedToken = null;
  return result.success;
};

export default {
  ensureAndroidChannel,
  requestPushPermission,
  getExpoPushToken,
  registerDevice,
  unregisterDevice,
};
