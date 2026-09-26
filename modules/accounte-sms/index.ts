import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

export type DeviceSms = {
  id: string;
  address: string;
  body: string;
  /** Epoch milliseconds. */
  date: number;
};

type AccounteSmsNative = {
  hasPermission(): boolean;
  readInbox(sinceMillis: number, limit: number): Promise<DeviceSms[]>;
};

// Android-only local Expo module (modules/accounte-sms). Null on iOS, web,
// Expo Go and any build made before the module was added.
const native =
  Platform.OS === 'android'
    ? requireOptionalNativeModule<AccounteSmsNative>('AccounteSms')
    : null;

export const isSmsReaderAvailable = (): boolean => native != null;

export const hasSmsPermission = (): boolean => {
  try {
    return native?.hasPermission() ?? false;
  } catch {
    return false;
  }
};

/** Inbox messages newer than `sinceMillis`, newest first. */
export const readSmsInbox = async (sinceMillis: number, limit = 1000): Promise<DeviceSms[]> => {
  if (!native) return [];
  return native.readInbox(sinceMillis, limit);
};
