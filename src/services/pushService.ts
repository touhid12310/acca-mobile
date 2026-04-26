import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

import API_CONFIG, { apiRequest } from "../config/api";

let cachedToken: string | null = null;

const getProjectId = (): string | undefined => {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
};

export const ensureAndroidChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 80, 200],
  });
};

export const requestPushPermission = async (): Promise<boolean> => {
  if (!Device.isDevice) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
};

export const getExpoPushToken = async (): Promise<string | null> => {
  if (cachedToken) return cachedToken;
  if (!Device.isDevice) return null;

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
    },
    token: authToken,
  });

  return result.success;
};

export const unregisterDevice = async (authToken: string): Promise<boolean> => {
  if (!cachedToken) return true;
  const result = await apiRequest(API_CONFIG.ENDPOINTS.DEVICES_UNREGISTER, {
    method: "POST",
    body: { token: cachedToken },
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
