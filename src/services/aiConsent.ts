import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, AppState, Linking } from 'react-native';

const STORAGE_KEY = 'accounte_ai_consent_v1';
const PRIVACY_URL = 'https://accounte.com/privacy-policy/';

const keyFor = (userId?: number | string | null) =>
  userId != null ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;

export const hasAiConsent = async (userId?: number | string | null): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(keyFor(userId))) != null;
  } catch {
    return false;
  }
};

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

  let subscription: { remove: () => void } | undefined;
  const ask = new Promise<boolean>((resolve) => {
    Alert.alert(
      'Use AI features?',
      "To answer your questions and read receipts, SMS and bank statements, AccountE sends what you type, say or attach, plus the transactions, accounts and budgets needed for the answer, to Google's Gemini AI through our servers. Nothing is saved to your books until you confirm it.",
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Privacy policy',
          onPress: () => {
            void Linking.openURL(PRIVACY_URL);
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
  }).finally(() => {
    subscription?.remove();
    if (pending === ask) pending = null;
  });
  pending = ask;

  // Android drops the dialog's callbacks when the Activity is recreated, which
  // would leave `ask` unsettled for good. Once the app leaves the foreground,
  // stop sharing it so the next tap shows a fresh prompt.
  subscription = AppState.addEventListener('change', (state) => {
    if (state === 'background' && pending === ask) {
      subscription?.remove();
      pending = null;
    }
  });

  return ask;
};
