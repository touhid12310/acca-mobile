import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import {
  Stack,
  router,
  usePathname,
  useSegments,
  ThemeProvider as NavThemeProvider,
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
} from 'expo-router';
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
import { AppLockProvider, useAppLock } from '../src/contexts/AppLockContext';
import { AppDarkBackground, OfflineBanner } from '../src/components/ui';
import { AppLockOverlay } from '../src/components/AppLockOverlay';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useSmsAutoSync } from '../src/hooks/useSmsAutoSync';
import analyticsService from '../src/services/analyticsService';
import metaEvents from '../src/services/metaEvents';
import { installErrorReporting, setCurrentScreen } from '../src/services/errorReporter';
import { installFetchRetry } from '../src/services/fetchRetry';
import crashlytics from '../src/services/crashlytics';
import { noteScreen, startAppExitMonitor } from '../src/services/appExitMonitor';
import { Notifications } from '../src/services/notifications';

import '../global.css';

// Errors users hit reach the admin panel's App errors page. First, so
// problems during start-up are caught too. Crashlytics then wraps the same
// handler (native crashes + stack traces), and appExitMonitor reports how the
// previous run ended — crashes, freezes, the phone closing the app. The fetch
// retry goes underneath the reporter, so a retried request isn't reported.
installFetchRetry();
installErrorReporting();
crashlytics.init();
startAppExitMonitor();

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

// Root segments a signed-out user may sit on: the sign-in group, the social
// sign-in return (incl. its 2FA step) and the email-verification link.
const PUBLIC_ROOTS = new Set(['(auth)', 'auth', 'verify-email']);

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
  const { locked, privacyCover, ready: lockReady } = useAppLock();
  const segments = useSegments();
  const pathname = usePathname();

  // Meta SDK: match its tracking flag to the iOS ATT choice made earlier.
  useEffect(() => {
    metaEvents.init();
  }, []);

  // iOS: ask once for App Tracking Transparency (Meta ad measurement) after
  // the user reaches the app proper — never during sign-in or onboarding,
  // nor over the app lock. metaEvents waits for the notification prompt to be
  // answered and re-checks the gate before it asks (and on its one retry).
  // A no-op once answered, and on Android.
  const onMainTabs = (segments as readonly string[])[0] === '(tabs)';
  const onboarded = Boolean(user?.onboarding_completed_at);
  const trackingGate = useRef(false);
  trackingGate.current = isAuthenticated && onboarded && onMainTabs && !locked;
  useEffect(() => {
    if (!isAuthenticated || !onboarded || !onMainTabs || locked) return;
    const timer = setTimeout(() => {
      metaEvents.requestTrackingPermission(() => trackingGate.current);
    }, 2500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, onboarded, onMainTabs, locked]);

  // Error and crash reports name the screen they happened on.
  useEffect(() => {
    setCurrentScreen(pathname);
    noteScreen(pathname);
    crashlytics.setScreen(pathname);
  }, [pathname]);

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
    const isAuthRoute = PUBLIC_ROOTS.has(root);
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
  // Held while the app lock (or its privacy cover) is up and replayed on
  // unlock: on iOS a sheet presented now (daily_log_nudge opens the
  // transaction sheet) would cover it. iOS delivers the tap before the app
  // turns active, i.e. while only the cover shows and the lock isn't set yet.
  const lastNotificationResponse = useLastNotificationResponse();
  useEffect(() => {
    if (!lastNotificationResponse || loading || !lockReady || locked || privacyCover) return;
    const route = routeFromNotificationData(
      lastNotificationResponse.notification.request.content.data,
    );
    // Clear so a remount doesn't replay the same tap.
    Notifications?.clearLastNotificationResponseAsync();
    // Dropped after "Sign out instead" on the lock screen.
    if (route && isAuthenticated) {
      router.push(route as any);
    }
  }, [lastNotificationResponse, loading, lockReady, locked, privacyCover, isAuthenticated]);

  // React Navigation theme for the navigators. Without it they fall back to
  // its light grey background, which iOS paints behind every stack screen
  // (the UINavigationController view) and which hides AppDarkBackground.
  const navTheme = useMemo(
    () =>
      isDark
        ? {
            ...NavDarkTheme,
            colors: {
              ...NavDarkTheme.colors,
              background: 'transparent',
              card: theme.colors.surface,
              text: theme.colors.onSurface,
              border: theme.colors.outline,
              primary: theme.colors.primary,
            },
          }
        : {
            ...NavDefaultTheme,
            colors: {
              ...NavDefaultTheme.colors,
              background: theme.colors.background,
              card: theme.colors.surface,
              primary: theme.colors.primary,
            },
          },
    [isDark, theme],
  );

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
        <NavThemeProvider value={navTheme}>
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
        {/* Signed-out screens fade in so the logo entrance isn't hidden by a slide. */}
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="verify-email" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="transaction-modal"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        {/* Categories as a sheet, so the transaction sheet's category picker
            can open it above itself on iOS. */}
        <Stack.Screen
          name="categories-modal"
          options={{
            presentation: 'modal',
            headerShown: false,
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
        </NavThemeProvider>
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
