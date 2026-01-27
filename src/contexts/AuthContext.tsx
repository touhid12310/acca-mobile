import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { getAuthToken, saveAuthToken, removeAuthToken } from '../config/api';
import authService from '../services/authService';
import { User } from '../types';

// Session validation interval (30 seconds)
const SESSION_CHECK_INTERVAL = 30000;

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  sessionExpired: boolean;
  login: (
    email: string,
    password: string,
    twoFactorCode?: string
  ) => Promise<{
    success: boolean;
    message?: string;
    requiresTwoFactor?: boolean;
    errors?: Record<string, string[]>;
  }>;
  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<{
    success: boolean;
    message?: string;
    errors?: Record<string, string[]>;
  }>;
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
          setUser(userData);
        }
      } else if (result.status === 401 || result.status === 403) {
        // Token expired/invalid, clear auth data
        await removeAuthToken();
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

  const login = async (
    email: string,
    password: string,
    twoFactorCode?: string
  ) => {
    try {
      const result = await authService.login(email, password, twoFactorCode);

      // Check if 2FA is required
      if (
        result.success &&
        (result.data as { data?: { requires_two_factor?: boolean } })?.data
          ?.requires_two_factor
      ) {
        return {
          success: false,
          requiresTwoFactor: true,
          message: 'Two-factor authentication required',
        };
      }

      if (result.success && result.data) {
        const data = result.data as {
          success?: boolean;
          data?: { access_token?: string; user?: User };
          message?: string;
        };

        if (data.success && data.data?.access_token) {
          const authToken = data.data.access_token;
          const userData = data.data.user;

          await saveAuthToken(authToken);
          setToken(authToken);
          setUser(userData || null);
          setIsAuthenticated(true);

          return { success: true, message: data.message || 'Login successful!' };
        }
      }

      return {
        success: false,
        message:
          (result.data as { message?: string })?.message || 'Login failed',
        errors: (result.data as { errors?: Record<string, string[]> })?.errors,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => {
    try {
      const result = await authService.register(
        name,
        email,
        password,
        confirmPassword
      );

      if (result.success && result.data) {
        const data = result.data as {
          success?: boolean;
          data?: { access_token?: string; token?: string; user?: User };
          message?: string;
        };

        if (data.success) {
          const authToken = data.data?.access_token || data.data?.token;
          const userData = data.data?.user;

          if (authToken) {
            await saveAuthToken(authToken);
            setToken(authToken);
            setUser(userData || null);
            setIsAuthenticated(true);
          }

          return {
            success: true,
            message: data.message || 'Registration successful!',
          };
        }
      }

      return {
        success: false,
        message:
          (result.data as { message?: string })?.message || 'Registration failed',
        errors: (result.data as { errors?: Record<string, string[]> })?.errors,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  };

  const logout = async (showMessage = true) => {
    // Clear interval
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
      sessionCheckInterval.current = null;
    }

    try {
      await authService.logout();
    } catch (error) {
      // Logout failed, still clear local auth
    } finally {
      await removeAuthToken();
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
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setSessionExpired(true);

    // Show alert
    Alert.alert('Session Expired', message);
  }, []);

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

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated,
    sessionExpired,
    login,
    register,
    logout,
    checkAuthStatus,
    updateUser,
    validateSession,
    forceLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
