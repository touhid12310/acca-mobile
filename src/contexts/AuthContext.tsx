import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthToken, saveAuthToken, removeAuthToken } from '../config/api';
import authService from '../services/authService';
import pushService from '../services/pushService';
import settingsService from '../services/settingsService';
import { User } from '../types';
import { detectTimeZone, setActiveTimeZone } from '../utils/timezone';
import { notifyToast } from './NotificationContext';

// Session validation interval (30 seconds)
const SESSION_CHECK_INTERVAL = 30000;

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  sessionExpired: boolean;
  // Sign-in is passwordless: components call authService.requestEmailCode +
  // verifyEmailCode (or googleAuthorizationUrl + googleExchange) and feed the
  // returned access_token + user into loginWithToken.
  loginWithToken: (
    token: string,
    user?: User | null
  ) => Promise<{ success: boolean; message?: string }>;
  logout: (showMessage?: boolean) => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  validateSession: () => Promise<boolean>;
  forceLogout: (message?: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  const checkAuthStatus = useCallback(async () => {
    try {
      const savedToken = await getAuthToken();

      if (!savedToken) {
        queryClient.clear();
        setLoading(false);
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
        return;
      }

      // Set as authenticated immediately if token exists
      setToken(savedToken);
      setIsAuthenticated(true);
      setLoading(false);

      // Verify token with API in the background
      const result = await authService.getProfile();

      if (result.success) {
        const userData =
          (result.data as { data?: { user?: User }; user?: User })?.data?.user ||
          (result.data as { user?: User })?.user;
        if (userData) {
          setActiveTimeZone(userData.timezone || detectTimeZone());
          setUser(userData);
        }
      } else if (result.status === 401 || result.status === 403) {
        // Token expired/invalid, clear auth data
        await removeAuthToken();
        queryClient.clear();
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      // Don't clear auth on network errors
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Register the device for push notifications when authenticated. Best-effort:
  // failures are silent (e.g. emulator, missing backend endpoint, denied perms).
  useEffect(() => {
    if (!token || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        if (cancelled) return;
        await pushService.registerDevice(token);
      } catch {
        // ignore — push is non-critical
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated]);

  const loginWithToken = useCallback(
    async (authToken: string, userData?: User | null) => {
      if (!authToken) {
        return { success: false, message: 'Missing access token' };
      }

      setActiveTimeZone(userData?.timezone || detectTimeZone());
      queryClient.clear();
      await saveAuthToken(authToken);
      setToken(authToken);
      setUser(userData || null);
      setIsAuthenticated(true);
      return { success: true };
    },
    [queryClient]
  );

  const logout = async (showMessage = true) => {
    // Clear interval
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
      sessionCheckInterval.current = null;
    }

    try {
      if (token) {
        try {
          await pushService.unregisterDevice(token);
        } catch {
          // ignore
        }
      }
      await authService.logout();
    } catch (error) {
      // Logout failed, still clear local auth
    } finally {
      await removeAuthToken();
      queryClient.clear();
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setSessionExpired(false);
    }
  };

  // Force logout when session is invalid (deleted from DB)
  const forceLogout = useCallback((message = 'Your session has expired. Please login again.') => {
    // Clear interval
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
      sessionCheckInterval.current = null;
    }

    removeAuthToken();
    queryClient.clear();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setSessionExpired(true);

    notifyToast.warning(message, {
      title: 'Session expired',
      duration: 6000,
    });
  }, [queryClient]);

  // Validate session with the server
  const validateSession = useCallback(async (): Promise<boolean> => {
    const savedToken = await getAuthToken();
    if (!savedToken) return false;

    try {
      const result = await authService.validateSession();

      if (result.success) {
        const data = result.data as { data?: { valid?: boolean; user?: User } };
        if (data?.data?.valid) {
          // Session is valid, update user if needed
          if (data.data.user) {
            setActiveTimeZone(data.data.user.timezone || detectTimeZone());
            setUser(data.data.user);
          }
          return true;
        }
      }

      if (result.status === 401 || result.status === 403) {
        // Session is invalid, force logout
        forceLogout();
        return false;
      }

      return true; // Don't logout on other errors (network issues)
    } catch (error) {
      return true; // Don't logout on network errors
    }
  }, [forceLogout]);

  // Start periodic session validation
  const startSessionValidation = useCallback(() => {
    // Clear any existing interval
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
    }

    // Set up new interval
    sessionCheckInterval.current = setInterval(() => {
      validateSession();
    }, SESSION_CHECK_INTERVAL);

    // Also validate immediately
    validateSession();
  }, [validateSession]);

  // Stop periodic session validation
  const stopSessionValidation = useCallback(() => {
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
      sessionCheckInterval.current = null;
    }
  }, []);

  // Handle app state changes (validate session when app comes to foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated
      ) {
        // App has come to the foreground, validate session
        validateSession();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, validateSession]);

  // Start validation when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      startSessionValidation();
    } else {
      stopSessionValidation();
    }

    return () => stopSessionValidation();
  }, [isAuthenticated, token, startSessionValidation, stopSessionValidation]);

  // Clear session expired flag when user logs in again
  useEffect(() => {
    if (isAuthenticated) {
      setSessionExpired(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !token || !user || user.timezone) return;

    const timezone = detectTimeZone();
    settingsService.update({ timezone }).then((response) => {
      if (response?.success) {
        setActiveTimeZone(timezone);
        setUser((prev) => (prev ? { ...prev, timezone } : prev));
      }
    });
  }, [isAuthenticated, token, user]);

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated,
    sessionExpired,
    loginWithToken,
    logout,
    checkAuthStatus,
    updateUser,
    validateSession,
    forceLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
