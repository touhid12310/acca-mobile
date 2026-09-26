import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { notifyToast } from '../contexts/NotificationContext';
import { isSmsImportEnabled, smsImportSupported, syncSmsInbox } from '../services/smsSync';

// Opening the app repeatedly shouldn't re-scan the inbox each time.
const MIN_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Android SMS import: whenever the app comes to the foreground (and SMS
 * import is switched on), pick up new bank / wallet alerts and tell the user
 * how many drafts are waiting. Silent when there is nothing new.
 */
export function useSmsAutoSync(active: boolean) {
  const queryClient = useQueryClient();
  const lastAttempt = useRef(0);

  useEffect(() => {
    if (!active || !smsImportSupported()) return undefined;

    const run = async () => {
      if (Date.now() - lastAttempt.current < MIN_INTERVAL_MS) return;
      if (!(await isSmsImportEnabled())) return;
      lastAttempt.current = Date.now();

      const result = await syncSmsInbox();
      if (result.status !== 'ok' || result.summary.imported === 0) return;

      const count = result.summary.imported;
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      notifyToast.success(
        count === 1
          ? '1 transaction from your SMS is waiting in Pending review.'
          : `${count} transactions from your SMS are waiting in Pending review.`,
        {
          title: 'New from SMS',
          duration: 7000,
          action: {
            label: 'Review',
            onPress: () =>
              router.push({
                pathname: '/(tabs)/transactions',
                params: { view: 'pending', source: 'sms' },
              } as never),
          },
        },
      );
    };

    void run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });

    return () => subscription.remove();
  }, [active, queryClient]);
}
