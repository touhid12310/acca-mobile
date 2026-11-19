import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';

import loanService from '../services/loanService';
import budgetService from '../services/budgetService';
import scheduleService from '../services/scheduleService';
import goalService from '../services/goalService';

/** What tapping a suggestion does: put text in the box, or ask right away. */
export type AssistantSuggestion = {
  key: string;
  label: string;
  prompt: string;
  action: 'fill' | 'send';
  icon: 'log' | 'question' | 'loans' | 'budgets' | 'schedules' | 'goals' | 'week';
};

const RECENT_LIMIT = 20;
const recentKey = (userId?: number | string | null) => `accounte_assistant_recent_v1_${userId ?? 'anon'}`;

const QUESTION_START =
  /^(what|how|where|when|which|who|why|show|list|compare|did|do|does|is|are|can|give|tell|summar|find|any)\b/i;

/** "Where did my money go?" asks; "Lunch 450 cash" logs. */
const isQuestion = (text: string) => text.trim().endsWith('?') || QUESTION_START.test(text.trim());

const shorten = (text: string, max = 60) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

const countOf = (data: unknown): number => (Array.isArray(data) ? data.length : 0);

// A believable lunch price per currency for the stock "Lunch, …, cash"
// example, so a US account doesn't see "$450" (QA AE-87).
const LUNCH_PRICE: Record<string, string> = {
  USD: '12', CAD: '15', AUD: '18', NZD: '18', EUR: '12', GBP: '10', CHF: '20',
  SEK: '120', NOK: '140', DKK: '90', ISK: '2,500', PLN: '35', CZK: '200', HUF: '3,500',
  RON: '40', BGN: '20', TRY: '300', ILS: '50', AED: '35', SAR: '35', QAR: '35',
  KWD: '3', BHD: '3', OMR: '3', JOD: '6', EGP: '200', MAD: '70', NGN: '3,000',
  KES: '500', GHS: '60', ZAR: '120', UGX: '15,000', TZS: '10,000', ETB: '300',
  BDT: '250', INR: '250', PKR: '800', LKR: '1,200', NPR: '400', MYR: '15', SGD: '10',
  THB: '120', IDR: '35,000', PHP: '200', VND: '60,000', CNY: '35', HKD: '60',
  TWD: '150', JPY: '1,000', KRW: '10,000', BRL: '35', MXN: '150', ARS: '8,000',
  CLP: '7,000', COP: '25,000', PEN: '25',
};
// Currencies where a lunch costs thousands.
const LARGE_UNITS = new Set(['PYG', 'IRR', 'LAK', 'UZS', 'MMK', 'KHR', 'MNT', 'RWF', 'XOF', 'XAF']);

const lunchExample = (currencySymbol: string, currencyCode?: string | null) => {
  const code = String(currencyCode || '').toUpperCase();
  const amount = LUNCH_PRICE[code] ?? (LARGE_UNITS.has(code) ? '50,000' : '12');
  return `Lunch, ${currencySymbol}${amount}, cash`;
};

const unwrapList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  const data = (payload as { data?: unknown } | undefined)?.data;
  if (Array.isArray(data)) return data;
  const nested = (data as { data?: unknown } | undefined)?.data;
  return Array.isArray(nested) ? nested : [];
};

const isOpen = (item: unknown) => {
  const status = String((item as { status?: string })?.status || '').toLowerCase();
  return !['paid', 'closed', 'completed', 'archived', 'cancelled', 'settled'].includes(status);
};

/**
 * Starter cards for the empty chat. The first is always "Scan a receipt";
 * the other three follow the user: their own last log line and last question
 * (kept on the phone), and whichever tracker they actually use most.
 */
export function useAssistantSuggestions(
  userId: number | string | null | undefined,
  currencySymbol: string,
  currencyCode?: string | null,
) {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(recentKey(userId))
      .then((raw) => {
        if (!alive || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecent(parsed.filter((item) => typeof item === 'string'));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [userId]);

  /** Remember what the user typed so the cards can echo it back later. */
  const remember = useCallback(
    (text: string) => {
      const clean = text.replace(/\s+/g, ' ').trim();
      if (clean.length < 3) return;
      setRecent((previous) => {
        const next = [clean, ...previous.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(
          0,
          RECENT_LIMIT,
        );
        AsyncStorage.setItem(recentKey(userId), JSON.stringify(next)).catch(() => undefined);
        return next;
      });
    },
    [userId],
  );

  const usage = useQuery({
    queryKey: ['assistant-usage', userId],
    enabled: Boolean(userId),
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [loans, budgets, schedules, goals] = await Promise.all([
        loanService.getAll().catch(() => null),
        budgetService.getAll().catch(() => null),
        scheduleService.getAll().catch(() => null),
        goalService.getAll().catch(() => null),
      ]);
      return {
        loans: unwrapList(loans?.data).filter(isOpen).length,
        budgets: countOf(unwrapList(budgets?.data)),
        schedules: unwrapList(schedules?.data).filter(isOpen).length,
        goals: unwrapList(goals?.data).filter(isOpen).length,
      };
    },
  });

  const suggestions = useMemo((): AssistantSuggestion[] => {
    const lastLog = recent.find((item) => !isQuestion(item));
    const lastQuestion = recent.find((item) => isQuestion(item));
    const example = lunchExample(currencySymbol, currencyCode);

    const tracker: AssistantSuggestion = (() => {
      const counts = usage.data;
      const ranked = counts
        ? (
            [
              ['schedules', counts.schedules],
              ['budgets', counts.budgets],
              ['loans', counts.loans],
              ['goals', counts.goals],
            ] as const
          )
            .filter(([, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
        : [];
      switch (ranked[0]?.[0]) {
        case 'schedules':
          return { key: 'schedules', label: 'Show my recurring bills', prompt: 'Show my recurring bills', action: 'send', icon: 'schedules' };
        case 'budgets':
          return { key: 'budgets', label: 'How are my budgets doing?', prompt: 'How are my budgets doing this month?', action: 'send', icon: 'budgets' };
        case 'loans':
          return { key: 'loans', label: 'Show my loans', prompt: 'Show my open loans — who owes me and what I owe', action: 'send', icon: 'loans' };
        case 'goals':
          return { key: 'goals', label: 'How close are my goals?', prompt: 'How close am I to my savings goals?', action: 'send', icon: 'goals' };
        default:
          return { key: 'week', label: 'How much did I spend last week?', prompt: 'How much did I spend last week?', action: 'send', icon: 'week' };
      }
    })();

    return [
      {
        key: 'log',
        // Their own last entry is a better hint than a stock example; it goes
        // into the box, never straight to the ledger.
        label: `"${shorten(lastLog || example, 40)}"`,
        prompt: lastLog || example,
        action: 'fill',
        icon: 'log',
      },
      {
        key: 'question',
        label: shorten(lastQuestion || 'Where did my money go this month?', 60),
        prompt: lastQuestion || 'Where did my money go this month?',
        action: 'send',
        icon: 'question',
      },
      tracker,
    ];
  }, [currencyCode, currencySymbol, recent, usage.data]);

  return { suggestions, remember };
}
