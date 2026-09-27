import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import NetInfo from '@react-native-community/netinfo';

import { buildApiUrl, getAuthToken } from '../config/api';

/**
 * Sends the errors people run into to the backend, where admins see them
 * under App errors in the admin panel (and get an email for each new one).
 *
 * Captured: JS crashes (the global handler, fatal ones included), screens
 * that crash (ErrorBoundary), unhandled promise rejections (release builds),
 * requests to our API that throw — like the "Unsupported FormDataPart
 * implementation" upload bug — and 5xx responses. Reports are kept in
 * storage until they are delivered, so a crash is sent on the next launch.
 * Nothing is sent from dev builds unless EXPO_PUBLIC_REPORT_ERRORS=1.
 */

export type ErrorKind = 'js_error' | 'unhandled_rejection' | 'render_error' | 'network_error' | 'api_error';

type Report = {
  platform: string;
  kind: ErrorKind;
  message: string;
  stack?: string;
  url?: string;
  location?: string;
  app_version?: string;
  context?: Record<string, string>;
};

const ENDPOINT = '/client-errors';
const STORE_KEY = 'accounte_error_queue_v1';
const FLUSH_DELAY_MS = 2000;
const MAX_BATCH = 10;
const MAX_QUEUE = 30;
const MAX_PER_SESSION = 30;
const MAX_REPEATS = 3;

const ENABLED = !__DEV__ || process.env.EXPO_PUBLIC_REPORT_ERRORS === '1';
const APP_VERSION = `${Constants.expoConfig?.version ?? 'unknown'}${__DEV__ ? ' (dev)' : ''}`;

// Lost connectivity says nothing about our code.
const IGNORED_MESSAGES = [
  /Network request failed/i,
  /network connection was lost/i,
  /The Internet connection appears to be offline/i,
  /AbortError|Aborted|signal is aborted/i,
  /timed? ?out/i,
];

let installed = false;
let online = true;
let queue: Report[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let sentThisSession = 0;
let currentScreen = '';
let nativeFetch: typeof fetch | null = null;
const seen = new Map<string, number>();

/** The expo-router pathname, so a report says which screen it came from. */
export const setCurrentScreen = (pathname: string) => {
  currentScreen = pathname;
};

const messageOf = (error: unknown): string => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return `${error.name && error.name !== 'Error' ? `${error.name}: ` : ''}${error.message}`;
  const maybe = error as { message?: unknown };
  if (typeof maybe.message === 'string') return maybe.message;
  try {
    return JSON.stringify(error).slice(0, 500);
  } catch {
    return String(error);
  }
};

const stackOf = (error: unknown): string | undefined => {
  const stack = (error as { stack?: unknown } | null)?.stack;
  return typeof stack === 'string' ? stack : undefined;
};

const persist = async () => {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    // Storage unavailable: the report still goes out this session if it can.
  }
};

const scheduleFlush = (delay = FLUSH_DELAY_MS) => {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush().catch(() => undefined);
  }, delay);
};

async function flush(): Promise<void> {
  if (flushing || queue.length === 0 || !online) return;
  flushing = true;
  const send = nativeFetch ?? fetch;

  try {
    const token = await getAuthToken().catch(() => null);
    while (queue.length > 0) {
      const batch = queue.slice(0, MAX_BATCH);
      const response = await send(buildApiUrl(ENDPOINT), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ errors: batch }),
      });
      // 422 = a report the server will never take; drop it rather than retry forever.
      if (!response.ok && response.status !== 422) break;
      queue.splice(0, batch.length);
      await persist();
    }
  } catch {
    // Offline or the API is down: try again later / next launch.
  } finally {
    flushing = false;
  }
}

/**
 * Report one error. `extra.location` names where (a request, a component),
 * `extra.context` adds small key → value details.
 */
export function reportError(
  kind: ErrorKind,
  error: unknown,
  extra: { location?: string; context?: Record<string, string> } = {},
): void {
  if (!ENABLED) return;

  const message = messageOf(error).trim();
  if (!message || IGNORED_MESSAGES.some((pattern) => pattern.test(message))) return;

  const key = `${kind}|${message.slice(0, 200)}`;
  const repeats = seen.get(key) ?? 0;
  if (repeats >= MAX_REPEATS || sentThisSession >= MAX_PER_SESSION) return;
  seen.set(key, repeats + 1);
  sentThisSession += 1;

  const stack = stackOf(error);
  queue.push({
    platform: Platform.OS,
    kind,
    message: message.slice(0, 2000),
    stack: stack ? stack.slice(0, 20000) : undefined,
    url: currentScreen || undefined,
    location: extra.location?.slice(0, 300),
    app_version: APP_VERSION,
    context: {
      device: [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || 'Unknown device',
      os: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Device.osVersion ?? ''}`.trim(),
      ...(currentScreen ? { screen: currentScreen } : {}),
      ...(extra.context ?? {}),
    },
  });
  queue = queue.slice(-MAX_QUEUE);

  persist().catch(() => undefined);
  scheduleFlush(kind === 'render_error' ? 0 : FLUSH_DELAY_MS);
}

const requestInfo = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const method = String(init?.method ?? (input as Request)?.method ?? 'GET').toUpperCase();
  const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '');
  return { url, method, path };
};

const isOurApi = (url: string) => url.startsWith(buildApiUrl('').replace(/\/+$/, ''));

/** Watch requests to our API: thrown fetches and 5xx answers. */
function wrapFetch() {
  if (typeof globalThis.fetch !== 'function') return;
  nativeFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const { url, method, path } = requestInfo(input, init);
    const watched = isOurApi(url) && !path.endsWith(ENDPOINT);

    try {
      const response = await (nativeFetch as typeof fetch)(input, init);
      if (watched && response.status >= 500) {
        response
          .clone()
          .text()
          .then((text) => {
            let serverMessage = '';
            try {
              serverMessage = JSON.parse(text)?.message ?? '';
            } catch {
              serverMessage = '';
            }
            reportError('api_error', `${response.status} ${method} ${path}${serverMessage ? ` — ${serverMessage}` : ''}`, {
              location: `${method} ${path}`,
              context: { status: String(response.status), method },
            });
          })
          .catch(() => undefined);
      }
      return response;
    } catch (error) {
      if (watched && online) {
        reportError('network_error', error, { location: `${method} ${path}`, context: { method } });
      }
      throw error;
    }
  }) as typeof fetch;
}

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;

/** Install once, at app start. */
export function installErrorReporting(): void {
  if (installed) return;
  installed = true;
  if (!ENABLED) return;

  NetInfo.addEventListener((state) => {
    const wasOffline = !online;
    online = state.isConnected !== false;
    if (wasOffline && online) scheduleFlush(1000);
  });

  // Anything a previous session could not deliver (a crash, being offline).
  AsyncStorage.getItem(STORE_KEY)
    .then((stored) => {
      const saved: Report[] = stored ? JSON.parse(stored) : [];
      if (Array.isArray(saved) && saved.length > 0) {
        queue = [...saved, ...queue].slice(-MAX_QUEUE);
        scheduleFlush(3000);
      }
    })
    .catch(() => undefined);

  wrapFetch();

  const errorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler: () => GlobalErrorHandler; setGlobalHandler: (handler: GlobalErrorHandler) => void } }).ErrorUtils;
  if (errorUtils) {
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      reportError('js_error', error, { context: { fatal: isFatal ? 'yes' : 'no' } });
      if (isFatal) {
        // Give the report a moment to reach storage before the app closes.
        const settle = new Promise((resolve) => setTimeout(resolve, 800));
        Promise.race([persist(), settle]).finally(() => previous(error, isFatal));
        return;
      }
      previous(error, isFatal);
    });
  }

  // Release builds swallow unhandled rejections; dev keeps LogBox's warnings.
  const hermes = (globalThis as { HermesInternal?: { enablePromiseRejectionTracker?: (options: object) => void } }).HermesInternal;
  if (!__DEV__ && hermes?.enablePromiseRejectionTracker) {
    hermes.enablePromiseRejectionTracker({
      allRejections: true,
      onUnhandled: (_id: number, rejection: unknown) => reportError('unhandled_rejection', rejection),
      onHandled: () => undefined,
    });
  }
}
