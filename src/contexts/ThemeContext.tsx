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

// Custom color schemes
const lightColors = {
  primary: '#1a73e8',
  primaryContainer: '#d2e3fc',
  secondary: '#5f6368',
  secondaryContainer: '#e8eaed',
  tertiary: '#34a853',
  tertiaryContainer: '#ceead6',
  error: '#ea4335',
  errorContainer: '#fad2cf',
  background: '#f8f9fa',
  surface: '#ffffff',
  surfaceVariant: '#f1f3f4',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#1a73e8',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#5f6368',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#1e8e3e',
  onError: '#ffffff',
  onErrorContainer: '#d93025',
  onBackground: '#202124',
  onSurface: '#202124',
  onSurfaceVariant: '#5f6368',
  outline: '#dadce0',
  outlineVariant: '#e8eaed',
  elevation: {
    level0: 'transparent',
    level1: '#ffffff',
    level2: '#f8f9fa',
    level3: '#f1f3f4',
    level4: '#e8eaed',
    level5: '#dadce0',
  },
};

const darkColors = {
  primary: '#8ab4f8',
  primaryContainer: '#174ea6',
  secondary: '#9aa0a6',
  secondaryContainer: '#3c4043',
  tertiary: '#81c995',
  tertiaryContainer: '#137333',
  error: '#f28b82',
  errorContainer: '#a52714',
  background: '#121212',
  surface: '#1e1e1e',
  surfaceVariant: '#2d2d2d',
  onPrimary: '#1a1a1a',
  onPrimaryContainer: '#8ab4f8',
  onSecondary: '#1a1a1a',
  onSecondaryContainer: '#e8eaed',
  onTertiary: '#1a1a1a',
  onTertiaryContainer: '#81c995',
  onError: '#1a1a1a',
  onErrorContainer: '#f28b82',
  onBackground: '#e8eaed',
  onSurface: '#e8eaed',
  onSurfaceVariant: '#9aa0a6',
  outline: '#5f6368',
  outlineVariant: '#3c4043',
  elevation: {
    level0: 'transparent',
    level1: '#1e1e1e',
    level2: '#232323',
    level3: '#282828',
    level4: '#2d2d2d',
    level5: '#323232',
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

const THEME_STORAGE_KEY = 'acca:theme_mode';

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
        console.error('Failed to load theme preference:', error);
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
      console.error('Failed to save theme preference:', error);
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
