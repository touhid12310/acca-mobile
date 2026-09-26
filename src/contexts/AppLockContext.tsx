import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

import { useAuth } from './AuthContext';

// Device-local preference (the lock protects this phone, not the account).
const STORAGE_KEY = 'accounte_app_lock_v1';

/** Seconds in the background before the app asks again. */
export type LockTimeout = 0 | 60 | 300 | 900;

export const LOCK_TIMEOUT_OPTIONS: { value: LockTimeout; label: string }[] = [
  { value: 0, label: 'Immediately' },
  { value: 60, label: 'After 1 minute' },
  { value: 300, label: 'After 5 minutes' },
  { value: 900, label: 'After 15 minutes' },
];

type LockSettings = { enabled: boolean; timeout: LockTimeout };

type Capability = {
  /** The phone has a screen lock we can ask for (biometric or PIN). */
  available: boolean;
  /** Fingerprint / face is enrolled (otherwise only the PIN is asked). */
  biometric: boolean;
  /** "Face ID", "Fingerprint", "Screen lock"… */
  label: string;
};

type ActionResult = { ok: boolean; message?: string };

type AppLockContextValue = {
  ready: boolean;
  settings: LockSettings;
  capability: Capability;
  /** The lock screen is showing. */
  locked: boolean;
  /** Hide balances while the app is in the switcher. */
  privacyCover: boolean;
  unlock: () => Promise<boolean>;
  enable: () => Promise<ActionResult>;
  disable: () => Promise<ActionResult>;
  setLockTimeout: (timeout: LockTimeout) => Promise<void>;
  refreshCapability: () => Promise<void>;
};

const DEFAULT_SETTINGS: LockSettings = { enabled: false, timeout: 60 };

const AppLockContext = createContext<AppLockContextValue | null>(null);

const describeCapability = async (): Promise<Capability> => {
  try {
    const [level, types] = await Promise.all([
      LocalAuthentication.getEnrolledLevelAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const biometric =
      level === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG ||
      level === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK;
    const has = (type: LocalAuthentication.AuthenticationType) => types.includes(type);

    let label = 'Screen lock';
    if (biometric && has(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      label = Platform.OS === 'ios' ? 'Face ID' : 'Face unlock';
    } else if (biometric && has(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      label = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    } else if (biometric && has(LocalAuthentication.AuthenticationType.IRIS)) {
      label = 'Iris';
    }

    return {
      available: level !== LocalAuthentication.SecurityLevel.NONE,
      biometric,
      label,
    };
  } catch {
    return { available: false, biometric: false, label: 'Screen lock' };
  }
};

const readSettings = async (): Promise<LockSettings> => {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const timeout = [0, 60, 300, 900].includes(parsed?.timeout) ? parsed.timeout : 60;
    return { enabled: parsed?.enabled === true, timeout };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const writeSettings = async (settings: LockSettings) => {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Best effort — the lock still applies for this session.
  }
};

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<LockSettings>(DEFAULT_SETTINGS);
  const [capability, setCapability] = useState<Capability>({
    available: false,
    biometric: false,
    label: 'Screen lock',
  });
  const [locked, setLocked] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  const backgroundAt = useRef<number | null>(null);
  const authenticating = useRef(false);
  const unlockedAt = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const lockedOnLaunch = useRef(false);

  const refreshCapability = useCallback(async () => {
    setCapability(await describeCapability());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [stored, cap] = await Promise.all([readSettings(), describeCapability()]);
      if (cancelled) return;
      setSettings(stored);
      setCapability(cap);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cold start: a signed-in user with the lock on sees the lock screen first.
  useEffect(() => {
    if (!ready || lockedOnLaunch.current) return;
    if (isAuthenticated && settings.enabled) {
      lockedOnLaunch.current = true;
      setLocked(true);
    }
  }, [ready, isAuthenticated, settings.enabled]);

  // Signing out drops the lock; the login screen is not protected content.
  useEffect(() => {
    if (!isAuthenticated) {
      setLocked(false);
      backgroundAt.current = null;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setAppState(next);
      // The biometric prompt / PIN screen itself moves the app through
      // inactive/background — never re-lock because of our own prompt.
      if (authenticating.current) return;

      if (next === 'background') {
        backgroundAt.current = Date.now();
        return;
      }

      if (next === 'active') {
        const since = backgroundAt.current;
        backgroundAt.current = null;
        const current = settingsRef.current;
        if (!since || !current.enabled || !isAuthenticated) return;
        if (Date.now() - unlockedAt.current < 1500) return;
        if (Date.now() - since >= current.timeout * 1000) {
          setLocked(true);
        }
      }
    });
    return () => subscription.remove();
  }, [isAuthenticated]);

  const authenticate = useCallback(async (promptMessage: string): Promise<ActionResult> => {
    if (authenticating.current) return { ok: false };
    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use passcode',
        // Let the phone's PIN / passcode stand in when biometrics fail.
        disableDeviceFallback: false,
      });
      if (result.success) return { ok: true };
      const error = (result as { error?: string }).error;
      if (error === 'user_cancel' || error === 'system_cancel' || error === 'app_cancel') {
        return { ok: false };
      }
      if (error === 'not_enrolled' || error === 'passcode_not_set') {
        return {
          ok: false,
          message: 'Set up a screen lock (fingerprint, face or PIN) in your phone settings first.',
        };
      }
      if (error === 'lockout') {
        return { ok: false, message: 'Too many attempts. Unlock your phone, then try again.' };
      }
      return { ok: false, message: 'We could not confirm it was you. Please try again.' };
    } catch {
      return { ok: false, message: 'Authentication is not available on this device.' };
    } finally {
      // Let the AppState "active" that follows the prompt pass first.
      setTimeout(() => {
        authenticating.current = false;
      }, 600);
    }
  }, []);

  const unlock = useCallback(async () => {
    const result = await authenticate('Unlock AccountE');
    if (result.ok) {
      unlockedAt.current = Date.now();
      backgroundAt.current = null;
      setLocked(false);
    }
    return result.ok;
  }, [authenticate]);

  const enable = useCallback(async (): Promise<ActionResult> => {
    const cap = await describeCapability();
    setCapability(cap);
    if (!cap.available) {
      return {
        ok: false,
        message: 'Set up a screen lock (fingerprint, face or PIN) in your phone settings first.',
      };
    }
    const result = await authenticate(`Confirm to turn on ${cap.label}`);
    if (!result.ok) return result;

    const next = { ...settingsRef.current, enabled: true };
    setSettings(next);
    await writeSettings(next);
    unlockedAt.current = Date.now();
    return { ok: true };
  }, [authenticate]);

  const disable = useCallback(async (): Promise<ActionResult> => {
    const result = await authenticate('Confirm to turn off app lock');
    if (!result.ok) return result;

    const next = { ...settingsRef.current, enabled: false };
    setSettings(next);
    await writeSettings(next);
    return { ok: true };
  }, [authenticate]);

  const setLockTimeout = useCallback(async (timeout: LockTimeout) => {
    const next = { ...settingsRef.current, timeout };
    setSettings(next);
    await writeSettings(next);
  }, []);

  const privacyCover =
    settings.enabled && isAuthenticated && appState !== 'active' && !authenticating.current;

  const value = useMemo<AppLockContextValue>(
    () => ({
      ready,
      settings,
      capability,
      locked: locked && isAuthenticated,
      privacyCover,
      unlock,
      enable,
      disable,
      setLockTimeout,
      refreshCapability,
    }),
    [ready, settings, capability, locked, isAuthenticated, privacyCover, unlock, enable, disable, setLockTimeout, refreshCapability],
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock(): AppLockContextValue {
  const context = useContext(AppLockContext);
  if (!context) {
    throw new Error('useAppLock must be used inside AppLockProvider');
  }
  return context;
}
