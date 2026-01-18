import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { getAuthToken, saveAuthToken, removeAuthToken } from '../config/api';
import authService from '../services/authService';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
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
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
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
      console.error('Auth check failed:', error);
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
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await removeAuthToken();
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuthStatus,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
