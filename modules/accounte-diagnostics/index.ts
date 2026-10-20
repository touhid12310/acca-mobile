import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

export type ExitReason =
  | 'anr'
  | 'crash'
  | 'crash_native'
  | 'dependency_died'
  | 'excessive_resource_usage'
  | 'exit_self'
  | 'initialization_failure'
  | 'low_memory'
  | 'other'
  | 'permission_change'
  | 'signaled'
  | 'user_requested'
  | 'user_stopped'
  | `code_${number}`;

export type AppExit = {
  reason: ExitReason;
  /** Epoch milliseconds. */
  timestamp: number;
  /** ActivityManager.RunningAppProcessInfo importance: 100 foreground … 400 cached. */
  importance: number;
  /** Signal number for `signaled` (9 = killed), exit code for `exit_self`. */
  status: number;
  description: string | null;
  pssKb: number;
  rssKb: number;
  /** False on phones that report low-memory kills as `signaled` instead. */
  lowMemoryReportSupported: boolean;
};

type AccounteDiagnosticsNative = {
  getExitReasons(sinceMillis: number, limit: number): Promise<AppExit[]>;
};

// Android-only local Expo module (modules/accounte-diagnostics). Null on iOS,
// web, Expo Go and any build made before the module was added.
const native =
  Platform.OS === 'android'
    ? requireOptionalNativeModule<AccounteDiagnosticsNative>('AccounteDiagnostics')
    : null;

export const isExitReasonReaderAvailable = (): boolean => native != null;

/** Why the app's earlier runs ended (Android 11+), newest first. */
export const getAppExits = async (sinceMillis: number, limit = 10): Promise<AppExit[]> => {
  if (!native) return [];
  try {
    return await native.getExitReasons(sinceMillis, limit);
  } catch {
    return [];
  }
};
