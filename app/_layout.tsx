import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';

import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { CurrencyProvider } from '../src/contexts/CurrencyContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { AppDarkBackground, OfflineBanner } from '../src/components/ui';

import '../global.css';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// How notifications appear when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const ROUTABLE_TYPES: Record<string, string> = {
  budget_overage: '/budgets',
  budget_warning: '/budgets',
  goal_completed: '/goals',
  schedule_due_soon: '/schedules',
  low_balance: '/accounts',
  recurring_posted: '/(tabs)/transactions',
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const { theme, isDark } = useTheme();

  useEffect(() => {
    // Hide splash screen after app is ready
    SplashScreen.hideAsync();
  }, []);

  // Route the user to the right screen when they tap a push notification.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { type?: string; route?: string }
          | undefined;
        const route =
          (typeof data?.route === 'string' && data.route) ||
          (data?.type ? ROUTABLE_TYPES[data.type] : undefined);
        if (route) {
          router.push(route as any);
        }
      },
    );
    return () => subscription.remove();
  }, []);

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View
        style={{
          flex: 1,
          position: 'relative',
          // Prevents default gray/white from showing under transparent tab scenes (dark)
          backgroundColor: isDark ? '#0b1830' : 'transparent',
        }}
      >
        {isDark && <AppDarkBackground />}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: isDark ? 'transparent' : theme.colors.background,
            },
            animation: 'slide_from_right',
          }}
        >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="transaction-modal"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        </Stack>
        <OfflineBanner />
      </View>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <CurrencyProvider>
                <NotificationProvider>
                  <RootLayoutNav />
                </NotificationProvider>
              </CurrencyProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
