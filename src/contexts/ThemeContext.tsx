import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MD3LightTheme,
  MD3DarkTheme,
  adaptNavigationTheme,
  MD3Theme,
} from 'react-native-paper';
import {
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';

// Finance-app color schemes (Indigo/violet primary, emerald success, rose danger)
const lightColors = {
  primary: '#6366f1',
  primaryContainer: '#eef2ff',
  secondary: '#64748b',
  secondaryContainer: '#f1f5f9',
  tertiary: '#10b981',
  tertiaryContainer: '#d1fae5',
  error: '#ef4444',
  errorContainer: '#fee2e2',
  warning: '#f59e0b',
  warningContainer: '#fef3c7',
  info: '#0ea5e9',
  infoContainer: '#e0f2fe',
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceVariant: '#f1f5f9',
  surfaceElevated: '#ffffff',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#4338ca',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#334155',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#047857',
  onError: '#ffffff',
  onErrorContainer: '#b91c1c',
  onWarning: '#ffffff',
  onWarningContainer: '#b45309',
  onInfo: '#ffffff',
  onInfoContainer: '#0369a1',
  onBackground: '#0f172a',
  onSurface: '#0f172a',
  onSurfaceVariant: '#64748b',
  outline: '#e2e8f0',
  outlineVariant: '#f1f5f9',
  elevation: {
    level0: 'transparent',
    level1: '#ffffff',
    level2: '#f8fafc',
    level3: '#f1f5f9',
    level4: '#e2e8f0',
    level5: '#cbd5e1',
  },
};

// Dark palette: matches AppDarkBackground linear (#0f213d → #0b1830) + blue glows
const darkColors = {
  primary: '#818cf8',
  primaryContainer: '#312e81',
  secondary: '#94a3b8',
  secondaryContainer: '#152a45',
  tertiary: '#34d399',
  tertiaryContainer: '#065f46',
  error: '#f87171',
  errorContainer: '#991b1b',
  warning: '#fbbf24',
  warningContainer: '#92400e',
  info: '#38bdf8',
  infoContainer: '#075985',
  // Transparent so root AppDarkBackground (linear + radials) stays visible
  background: 'transparent',
  surface: '#0f213d',
  surfaceVariant: '#152f52',
  surfaceElevated: '#132a48',
  onPrimary: '#1e1b4b',
  onPrimaryContainer: '#c7d2fe',
  onSecondary: '#0b1830',
  onSecondaryContainer: '#e2e8f0',
  onTertiary: '#022c22',
  onTertiaryContainer: '#a7f3d0',
  onError: '#450a0a',
  onErrorContainer: '#fecaca',
  onWarning: '#451a03',
  onWarningContainer: '#fde68a',
  onInfo: '#082f49',
  onInfoContainer: '#bae6fd',
  onBackground: '#f8fafc',
  onSurface: '#f8fafc',
  onSurfaceVariant: '#94a3b8',
  outline: '#2d4a6f',
  outlineVariant: '#1a3358',
  elevation: {
    level0: 'transparent',
    level1: '#0f213d',
    level2: '#122846',
    level3: '#152f52',
    level4: '#1a3860',
    level5: '#244a78',
  },
};

// Create Paper themes
const LightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
};

const DarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
};

// Adapt navigation themes
const { LightTheme: NavLightTheme, DarkTheme: NavDarkTheme } =
  adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
    materialLight: LightTheme,
    materialDark: DarkTheme,
  });

// Combined themes for navigation + paper
const CombinedLightTheme = {
  ...NavLightTheme,
  ...LightTheme,
  colors: {
    ...NavLightTheme.colors,
    ...LightTheme.colors,
  },
};

const CombinedDarkTheme = {
  ...NavDarkTheme,
  ...DarkTheme,
  colors: {
    ...NavDarkTheme.colors,
    ...DarkTheme.colors,
  },
};

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: typeof CombinedLightTheme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  colors: typeof lightColors;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_STORAGE_KEY = 'accounte:theme_mode';

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine if dark mode should be active
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  // Get the active theme
  const theme = useMemo(() => {
    return isDark ? CombinedDarkTheme : CombinedLightTheme;
  }, [isDark]);

  // Get the active colors
  const colors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        // Failed to load theme preference
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, []);

  // Save theme preference
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      // Failed to save theme preference
    }
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(async () => {
    const newMode = isDark ? 'light' : 'dark';
    await setThemeMode(newMode);
  }, [isDark, setThemeMode]);

  const value: ThemeContextType = {
    theme,
    themeMode,
    isDark,
    setThemeMode,
    toggleTheme,
    colors,
  };

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export { LightTheme, DarkTheme, CombinedLightTheme, CombinedDarkTheme };
export default ThemeContext;
