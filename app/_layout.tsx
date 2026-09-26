import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { CurrencyProvider } from '../src/contexts/CurrencyContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { AppLockProvider } from '../src/contexts/AppLockContext';
import { AppDarkBackground, OfflineBanner } from '../src/components/ui';
import { AppLockOverlay } from '../src/components/AppLockOverlay';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useSmsAutoSync } from '../src/hooks/useSmsAutoSync';
import analyticsService from '../src/services/analyticsService';
import { Notifications } from '../src/services/notifications';

import '../global.css';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// How notifications appear when the app is in the foreground.
// shouldShowAlert was deprecated in expo-notifications 0.32 — banner+list cover it.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Expo Go has no expo-notifications; the choice is fixed per runtime, so the
// hook call order stays stable.
const useLastNotificationResponse =
  Notifications?.useLastNotificationResponse ?? (() => null);

const ROUTABLE_TYPES: Record<string, string> = {
  budget_overage: '/budgets',
  budget_warning: '/budgets',
  goal_completed: '/goals',
  schedule_due_soon: '/schedules',
  low_balance: '/accounts',
  recurring_posted: '/(tabs)/transactions',
  daily_log_nudge: '/transaction-modal',
  subscription_invoice_due: '/billing',
};

// Strict allow-list: only these routes may ever come from a push payload.
// The server-controlled `route` field is deliberately ignored — trusting it
// would let a compromised backend (or crafted FCM/APNs payload) force
// navigation to any screen, including purchase sheets.
const ALLOWED_PUSH_ROUTES = new Set<string>(Object.values(ROUTABLE_TYPES));

const routeFromNotificationData = (data: unknown): string | undefined => {
  const d = data as { type?: string } | undefined;
  const mapped = d?.type ? ROUTABLE_TYPES[d.type] : undefined;
  if (mapped && ALLOWED_PUSH_ROUTES.has(mapped)) return mapped;
  return undefined;
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
  const { theme, paperTheme, isDark } = useTheme();
  const { isAuthenticated, user, loading } = useAuth();
  const segments = useSegments();

  // Android: pick up new bank / wallet SMS alerts whenever the app opens.
  useSmsAutoSync(isAuthenticated && !loading);

  useEffect(() => {
    // Hide splash screen after app is ready
    SplashScreen.hideAsync();
  }, []);

  // Central deep-link guard: every Stack screen outside (auth)/ sits behind
  // this. Per-group guards in index + (tabs)/_layout still apply; this
  // catches direct links to /transaction-modal, /billing, /onboarding, etc.
  // Index (segments empty) owns its own redirect, so leave it alone.
  useEffect(() => {
    if (loading || (segments as readonly string[]).length === 0) return;
    const root = (segments as readonly string[])[0];
    const isAuthRoute = root === '(auth)';
    const isOnboarding = root === 'onboarding';
    if (!isAuthenticated && !isAuthRoute) {
      router.replace('/(auth)/login' as any);
    } else if (
      isAuthenticated &&
      user &&
      !user.onboarding_completed_at &&
      !isOnboarding &&
      !isAuthRoute
    ) {
      router.replace('/onboarding' as any);
    }
  }, [loading, isAuthenticated, user, segments]);

  // Screen views for Firebase Analytics. Built from the route pattern
  // (e.g. "edit-transaction/[id]") rather than the pathname so record ids
  // never end up in screen names; route groups like "(tabs)" are dropped.
  const screenName =
    (segments as readonly string[]).filter((s) => !s.startsWith('(')).join('/') || 'index';
  useEffect(() => {
    analyticsService.logScreenView(screenName);
  }, [screenName]);

  // Route the user to the right screen when they tap a push notification.
  // useLastNotificationResponse (not addNotificationResponseReceivedListener)
  // because the listener is not reliably called when the tap launches the app
  // from a killed state — the hook covers killed, background, and foreground.
  const lastNotificationResponse = useLastNotificationResponse();
  useEffect(() => {
    if (!lastNotificationResponse) return;
    const route = routeFromNotificationData(
      lastNotificationResponse.notification.request.content.data,
    );
    // Clear so a remount doesn't replay the same tap.
    Notifications?.clearLastNotificationResponseAsync();
    if (route) {
      router.push(route as any);
    }
  }, [lastNotificationResponse]);

  return (
    <PaperProvider theme={paperTheme}>
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
        <Stack.Screen name="billing" options={{ headerShown: false }} />
        </Stack>
        <OfflineBanner />
        {/* Biometric app lock + app-switcher privacy cover, above everything. */}
        <AppLockOverlay />
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
                    <AppLockProvider>
                      <RootLayoutNav />
                    </AppLockProvider>
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
