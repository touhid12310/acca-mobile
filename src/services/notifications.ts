import Constants, { ExecutionEnvironment } from "expo-constants";

type NotificationsModule = typeof import("expo-notifications");

/** Running inside the Expo Go app (not a dev client or store build). */
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * expo-notifications throws at import time in Expo Go on Android (remote push
 * was removed from Expo Go in SDK 53), so only require it outside Expo Go.
 * Null means push is unavailable — callers must no-op.
 */
export const Notifications: NotificationsModule | null = isExpoGo
  ? null
  : // eslint-disable-next-line @typescript-eslint/no-var-requires
    (require("expo-notifications") as NotificationsModule);
