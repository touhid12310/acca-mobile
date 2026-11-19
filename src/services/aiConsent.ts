import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, AppState, Linking } from 'react-native';

const STORAGE_KEY = 'accounte_ai_consent_v1';
export const AI_PRIVACY_URL = 'https://accounte.com/privacy-policy/';

const keyFor = (userId?: number | string | null) =>
  userId != null ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;

export const hasAiConsent = async (userId?: number | string | null): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(keyFor(userId))) != null;
  } catch {
    return false;
  }
};

/* The question is drawn by <AiConsentDialog /> (mounted once in app/_layout).
   ensureAiConsent() posts a request here and waits for the answer. */
type ConsentRequest = { userId?: number | string | null; resolve: (agreed: boolean) => void };
type Listener = (open: boolean) => void;

let request: ConsentRequest | null = null;
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((listener) => listener(request != null));

/** For the dialog host: told whether the question is on screen. */
export const subscribeAiConsent = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(request != null);
  return () => {
    listeners.delete(listener);
  };
};

/** For the dialog host: the user agreed (saved for this user) or said not now. */
export const answerAiConsent = (agreed: boolean): void => {
  const current = request;
  if (!current) return;
  request = null;
  if (agreed) {
    AsyncStorage.setItem(keyFor(current.userId), new Date().toISOString()).catch(() => {});
  }
  notify();
  current.resolve(agreed);
};

/** Old system alert, kept for the rare case the dialog host is not mounted. */
const askWithSystemAlert = (userId?: number | string | null) =>
  new Promise<boolean>((resolve) => {
    Alert.alert(
      'Use AI features?',
      'To answer your questions and read receipts, SMS and bank statements, AccountE sends what you type, say or attach, plus the transactions, accounts and budgets needed for the answer, to AccountE AI (run on a third-party AI provider) through our servers. Nothing is saved to your books until you confirm it.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Privacy policy',
          onPress: () => {
            void Linking.openURL(AI_PRIVACY_URL);
            resolve(false);
          },
        },
        {
          text: 'Agree',
          onPress: () => {
            AsyncStorage.setItem(keyFor(userId), new Date().toISOString()).catch(() => {});
            resolve(true);
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

let pending: Promise<boolean> | null = null;

/**
 * App Review 5.1.2(i): before anything goes to a third-party AI, say what is
 * sent and to whom, and get a yes. Asked once per user on this phone. "Not
 * now" cancels the action, so nothing is sent.
 */
export const ensureAiConsent = async (userId?: number | string | null): Promise<boolean> => {
  if (await hasAiConsent(userId)) return true;
  // Two taps in a row share one prompt.
  if (pending) return pending;

  if (listeners.size === 0) {
    let subscription: { remove: () => void } | undefined;
    const ask = askWithSystemAlert(userId).finally(() => {
      subscription?.remove();
      if (pending === ask) pending = null;
    });
    pending = ask;
    // Android drops an Alert's callbacks when the Activity is recreated, which
    // would leave `ask` unsettled for good. Once the app leaves the foreground,
    // stop sharing it so the next tap shows a fresh prompt.
    subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' && pending === ask) {
        subscription?.remove();
        pending = null;
      }
    });
    return ask;
  }

  const ask = new Promise<boolean>((resolve) => {
    request = { userId, resolve };
    notify();
  }).finally(() => {
    if (pending === ask) pending = null;
  });
  pending = ask;
  return ask;
};
