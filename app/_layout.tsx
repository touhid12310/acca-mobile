import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';

import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { CurrencyProvider } from '../src/contexts/CurrencyContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { AppDarkBackground, OfflineBanner } from '../src/components/ui';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

import '../global.css';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// How notifications appear when the app is in the foreground.
// shouldShowAlert was deprecated in expo-notifications 0.32 — banner+list cover it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const ROUTABLE_TYPES: Record<string, string> = {
  budget_overage: '/budgets',
  budget_warning: '/budgets',
  goal_completed: '/goals',
  schedule_due_soon: '/schedules',
  low_balance: '/accounts',
  recurring_posted: '/(tabs)/transactions',
  daily_log_nudge: '/transaction-modal',
};

const routeFromNotificationData = (data: unknown): string | undefined => {
  const d = data as { type?: string; route?: string } | undefined;
  const route =
    (typeof d?.route === 'string' && d.route) ||
    (d?.type ? ROUTABLE_TYPES[d.type] : undefined);
  return route || undefined;
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

// Bridge connectivity to TanStack Query. React Native has no navigator.onLine,
// so without this Query's online state is always "online" and it never fires
// the reconnect refetch when connectivity returns. NetInfo drives it instead.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  })
);

function RootLayoutNav() {
  const { theme, isDark } = useTheme();

  useEffect(() => {
    // Hide splash screen after app is ready
    SplashScreen.hideAsync();
  }, []);

  // Route the user to the right screen when they tap a push notification.
  // useLastNotificationResponse (not addNotificationResponseReceivedListener)
  // because the listener is not reliably called when the tap launches the app
  // from a killed state — the hook covers killed, background, and foreground.
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!lastNotificationResponse) return;
    const route = routeFromNotificationData(
      lastNotificationResponse.notification.request.content.data,
    );
    // Clear so a remount doesn't replay the same tap.
    Notifications.clearLastNotificationResponseAsync();
    if (route) {
      router.push(route as any);
    }
  }, [lastNotificationResponse]);

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
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            gestureEnabled: false,
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
