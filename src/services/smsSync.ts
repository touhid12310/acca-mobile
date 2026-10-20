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
  // When the user agreed to the SMS disclosure on the SMS import screen.
  // Google Play requires that consent before any SMS is read or uploaded
  // (build 40 was rejected without it), so import counts as off without it —
  // also for people who switched it on in a version that had no disclosure.
  consent: 'accounte_sms_import_consent_v1',
  // Newest SMS timestamp (ms) we have already looked at.
  cursor: 'accounte_sms_import_cursor_v1',
  lastRun: 'accounte_sms_import_last_run_v1',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const UPLOAD_CHUNK = 50;

// Only messages that already look like completed money movements ever leave
// the phone. Personal chats, OTPs and anything from a phone number are
// filtered here, before upload; the server re-checks everything.
//
// An amount next to a currency code, word or symbol from anywhere ("Tk 500",
// "KES 1,500", "RM25.00", "€18.90", "250.00 AED"). Same list as the server's
// SmsImportService::MONEY_PATTERN — keep them in step.
const CURRENCY_CODES =
  'bdt|inr|pkr|npr|lkr|usd|eur|gbp|chf|cad|aud|nzd|sgd|hkd|myr|idr|php|thb|vnd|cny|rmb|jpy|krw|aed|sar|qar|omr|kwd|bhd|egp|ngn|kes|ghs|zar|ugx|tzs|brl|mxn|pln|rub|uah';
const CURRENCY_AMOUNT = new RegExp(
  String.raw`(?:^|[^\p{L}\p{N}])(?:tk\.?|taka|টাকা|rs\.?|ksh|rm|rp|[a-z]{1,2}\$|[$৳₹€£¥₩₱฿₫₦₵₺₽₴]|${CURRENCY_CODES})\s*[:.]?\s*[\d০-৯]` +
    String.raw`|[\d০-৯][\d০-৯,.]*\s*(?:tk|taka|টাকা|tl|[৳€₺₽₴]|${CURRENCY_CODES})(?:[^\p{L}\p{N}]|$)`,
  'iu',
);
const MONEY_WORDS =
  /(debit|credit|sent|send money|received|payment|paid|cash ?out|cash ?in|withdraw|purchase|spent|charged|recharge|transfer|deposit|refund|bill|trx ?id|txn ?id|পেয়েছেন|পাঠিয়েছেন|ক্যাশ|পেমেন্ট|রিচার্জ)/iu;
// One-time codes, in the main languages bank alerts come in (Malaysian banks
// call theirs "TAC"). When in doubt, a message stays on the phone.
const ONE_TIME_CODE = new RegExp(
  String.raw`\b(?:otp|tac|one[\s-]?time pass(?:word|code)?|verification code|security code|pin code|passcode)\b` +
    String.raw`|c[oó]digo de (?:verifica|seguran|seguridad)|contrase[ñn]a|senha|code de (?:v[ée]rification|s[ée]curit[ée])` +
    '|kode (?:verifikasi|rahasia)|kod pengesahan|doğrulama kodu|şifre|رمز التحقق|كلمة المرور|ओटीपी',
  'iu',
);
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

const readImportState = async (): Promise<{ switchedOn: boolean; consented: boolean }> => {
  try {
    const [switchedOn, consent] = await Promise.all([
      AsyncStorage.getItem(KEYS.enabled),
      AsyncStorage.getItem(KEYS.consent),
    ]);
    return { switchedOn: switchedOn === '1', consented: consent != null };
  } catch {
    return { switchedOn: false, consented: false };
  }
};

export const isSmsImportEnabled = async (): Promise<boolean> => {
  const { switchedOn, consented } = await readImportState();
  return switchedOn && consented;
};

/** Switched on in an older version, before the disclosure existed: paused until the user agrees. */
export const isSmsImportAwaitingConsent = async (): Promise<boolean> => {
  const { switchedOn, consented } = await readImportState();
  return switchedOn && !consented;
};

/** Records the user's "Agree and continue" on the SMS disclosure. */
export const recordSmsConsent = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.consent, String(Date.now()));
  } catch {
    // Storage unavailable — import stays off, which is the safe side.
  }
};

const hasSmsConsent = async (): Promise<boolean> => (await readImportState()).consented;

export const setSmsImportEnabled = async (enabled: boolean): Promise<void> => {
  try {
    if (enabled) {
      await AsyncStorage.setItem(KEYS.enabled, '1');
    } else {
      // Switching off withdraws the consent too: turning import on again
      // shows the disclosure again.
      await AsyncStorage.multiRemove([KEYS.enabled, KEYS.cursor, KEYS.consent]);
    }
  } catch {
    // Storage unavailable — the toggle simply won't persist.
  }
};

/**
 * Start SMS import at "now": the background sync then only picks up messages
 * that arrive from here on. Past messages come in only when the user picks a
 * range on the SMS import screen. Called when import is switched on, so the
 * foreground auto-sync (which fires as the permission dialog closes) can't
 * quietly import a week of history before the user has chosen.
 */
export const startSmsImportFromNow = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.cursor, String(Date.now()));
  } catch {
    // Storage unavailable — the first sync falls back to the last 7 days.
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

/** Asks Android for READ_SMS — only after the user agreed to the disclosure. */
export const requestSmsPermission = async (): Promise<SmsPermissionResult> => {
  if (!smsImportSupported()) return 'unavailable';
  if (!(await hasSmsConsent())) return 'denied';
  if (hasSmsPermission()) return 'granted';

  try {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
      title: 'Read bank & wallet SMS',
      message:
        'AccountE reads payment alerts from your bank, cards and mobile wallets and turns them into drafts for you to review. Personal messages and one-time codes are never uploaded.',
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
 * alerts, and moves the cursor forward. `since` (epoch ms — "Import past
 * messages") looks further back than the saved cursor; the cursor itself
 * never moves backwards, so a history import doesn't make the next
 * background sync re-read the same weeks.
 */
export const syncSmsInbox = async (
  options: { since?: number; force?: boolean } = {},
): Promise<SmsSyncResult> => {
  if (!smsImportSupported()) return { status: 'unavailable' };
  // Nothing is read, forced or not, before the user agreed to the disclosure.
  if (!(await hasSmsConsent())) return { status: 'disabled' };
  if (!options.force && !(await isSmsImportEnabled())) return { status: 'disabled' };
  if (!hasSmsPermission()) return { status: 'no_permission' };
  if (running) return { status: 'busy' };

  running = true;
  const summary = emptySummary();

  try {
    const now = Date.now();
    const rawCursor = Number(await AsyncStorage.getItem(KEYS.cursor));
    const storedCursor = Number.isFinite(rawCursor) && rawCursor > 0 ? rawCursor : 0;
    const since = options.since
      ? options.since
      : storedCursor > 0
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
        await AsyncStorage.setItem(KEYS.cursor, String(Math.max(storedCursor, since, reached)));
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
      [KEYS.cursor, String(Math.max(storedCursor, newest))],
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
