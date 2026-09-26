import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DeviceSms,
  hasSmsPermission,
  isSmsReaderAvailable,
  readSmsInbox,
} from '../../modules/accounte-sms';
import smsService, { SmsImportSummary } from './smsService';

// Device-local state. Bump the suffix if the meaning of a key changes.
const KEYS = {
  enabled: 'accounte_sms_import_enabled_v1',
  // Newest SMS timestamp (ms) we have already looked at.
  cursor: 'accounte_sms_import_cursor_v1',
  lastRun: 'accounte_sms_import_last_run_v1',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const UPLOAD_CHUNK = 50;

// Only messages that already look like completed money movements ever leave
// the phone. Personal chats, OTPs and anything from a phone number are
// filtered here, before upload; the server re-checks everything.
const CURRENCY_AMOUNT =
  /(?:^|[^\p{L}\p{N}])(?:tk\.?|taka|bdt|৳|টাকা|rs\.?|inr|₹|usd|\$|eur|€|gbp|£)\s*[:.]?\s*[\d০-৯]|[\d০-৯][\d০-৯,.]*\s*(?:tk|taka|bdt|৳|টাকা)(?:[^\p{L}\p{N}]|$)/iu;
const MONEY_WORDS =
  /(debit|credit|sent|send money|received|payment|paid|cash ?out|cash ?in|withdraw|purchase|spent|charged|recharge|transfer|deposit|refund|bill|trx ?id|txn ?id|পেয়েছেন|পাঠিয়েছেন|ক্যাশ|পেমেন্ট|রিচার্জ)/iu;
const ONE_TIME_CODE = /\b(otp|one[\s-]?time pass(?:word|code)?|verification code|security code|pin code|passcode)\b/i;
// Long digit senders are people ("+8801712345678"); banks and wallets use
// names ("bKash", "CITYBANK") or short codes ("16216").
const PERSONAL_NUMBER = /^\+?\d{8,}$/;

export const looksLikeTransactionAlert = (sender: string, body: string): boolean => {
  const compactSender = String(sender || '').replace(/[\s\-()]/g, '');
  if (PERSONAL_NUMBER.test(compactSender)) return false;
  if (!body || body.length > 1600) return false;
  if (ONE_TIME_CODE.test(body)) return false;
  return CURRENCY_AMOUNT.test(body) && MONEY_WORDS.test(body);
};

export const smsImportSupported = (): boolean => Platform.OS === 'android' && isSmsReaderAvailable();

export const isSmsImportEnabled = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(KEYS.enabled)) === '1';
  } catch {
    return false;
  }
};

export const setSmsImportEnabled = async (enabled: boolean): Promise<void> => {
  try {
    if (enabled) {
      await AsyncStorage.setItem(KEYS.enabled, '1');
    } else {
      await AsyncStorage.multiRemove([KEYS.enabled, KEYS.cursor]);
    }
  } catch {
    // Storage unavailable — the toggle simply won't persist.
  }
};

export const getLastSmsSync = async (): Promise<number | null> => {
  try {
    const value = Number(await AsyncStorage.getItem(KEYS.lastRun));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

export type SmsPermissionResult = 'granted' | 'denied' | 'blocked' | 'unavailable';

/** Asks Android for READ_SMS, explaining why first. */
export const requestSmsPermission = async (): Promise<SmsPermissionResult> => {
  if (!smsImportSupported()) return 'unavailable';
  if (hasSmsPermission()) return 'granted';

  try {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
      title: 'Read bank & wallet SMS',
      message:
        'AccountE reads transaction alerts from banks and wallets like bKash and Nagad and turns them into drafts for you to review. Personal messages and one-time codes are never uploaded.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    });
    if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
    return 'denied';
  } catch {
    return 'denied';
  }
};

export type SmsSyncResult =
  | { status: 'unavailable' | 'disabled' | 'no_permission' | 'busy' }
  | { status: 'error'; message: string; partial: SmsImportSummary }
  | { status: 'ok'; scanned: number; uploaded: number; summary: SmsImportSummary };

const emptySummary = (): SmsImportSummary => ({
  imported: 0,
  duplicates: 0,
  ignored: 0,
  skipped_senders: 0,
  failed: 0,
  ai_used: 0,
  transaction_ids: [],
});

let running = false;

/**
 * Reads new inbox messages, uploads the ones that look like transaction
 * alerts, and moves the cursor forward. `historyDays` (first run, or "scan
 * again") looks further back than the saved cursor.
 */
export const syncSmsInbox = async (
  options: { historyDays?: number; force?: boolean } = {},
): Promise<SmsSyncResult> => {
  if (!smsImportSupported()) return { status: 'unavailable' };
  if (!options.force && !(await isSmsImportEnabled())) return { status: 'disabled' };
  if (!hasSmsPermission()) return { status: 'no_permission' };
  if (running) return { status: 'busy' };

  running = true;
  const summary = emptySummary();

  try {
    const now = Date.now();
    const storedCursor = Number(await AsyncStorage.getItem(KEYS.cursor));
    const since = options.historyDays
      ? now - options.historyDays * DAY_MS
      : Number.isFinite(storedCursor) && storedCursor > 0
        ? storedCursor
        : now - 7 * DAY_MS;

    const messages: DeviceSms[] = await readSmsInbox(since, 1500);
    const newest = messages.reduce((max, m) => Math.max(max, m.date || 0), since);

    // Oldest first, so an interrupted sync resumes exactly where it stopped.
    const candidates = messages
      .filter((m) => looksLikeTransactionAlert(m.address, m.body))
      .sort((a, b) => a.date - b.date);

    let uploaded = 0;
    for (let start = 0; start < candidates.length; start += UPLOAD_CHUNK) {
      const chunk = candidates.slice(start, start + UPLOAD_CHUNK);
      const result = await smsService.import(
        chunk.map((m) => ({ sender: m.address, body: m.body, received_at: m.date })),
        'device',
      );

      const data = (result.data as any)?.data as SmsImportSummary | undefined;
      if (!result.success || !data) {
        // Keep what did get through; the rest is retried next time.
        const reached = chunk[0]?.date ? chunk[0].date - 1 : since;
        await AsyncStorage.setItem(KEYS.cursor, String(Math.max(since, reached)));
        return {
          status: 'error',
          message: result.error || 'Could not reach AccountE. We will try again later.',
          partial: summary,
        };
      }

      summary.imported += data.imported;
      summary.duplicates += data.duplicates;
      summary.ignored += data.ignored;
      summary.skipped_senders += data.skipped_senders;
      summary.failed += data.failed;
      summary.ai_used += data.ai_used;
      summary.transaction_ids.push(...(data.transaction_ids || []));
      uploaded += chunk.length;
    }

    await AsyncStorage.multiSet([
      [KEYS.cursor, String(newest)],
      [KEYS.lastRun, String(now)],
    ]);

    return { status: 'ok', scanned: messages.length, uploaded, summary };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'SMS import failed',
      partial: summary,
    };
  } finally {
    running = false;
  }
};
