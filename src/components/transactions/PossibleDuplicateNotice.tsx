import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { AlertTriangle, Archive, X } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { PossibleDuplicate } from '../../types';
import { formatDate } from '../../utils/date';

// Where the matching transaction came from, in the user's words (web parity:
// acca-tanstack PossibleDuplicateNotice).
const SOURCE_LABELS: Record<string, string> = {
  manual: 'added by you',
  chat: 'added from chat',
  receipt: 'added from a receipt',
  email: 'from email',
  sms: 'from SMS',
  schedule: 'from a schedule',
  subscription: 'Premium payment',
  csv: 'from CSV import',
};

type Props = {
  matches: PossibleDuplicate[];
  isDraft: boolean;
  onDismiss: () => void;
  onArchiveDraft?: () => void;
  archiving?: boolean;
};

/**
 * "You may have added this already" — pinned above Save on the add / review
 * form when the ledger holds a matching transaction. Warn-only: Save keeps
 * working. Shows the best match; the API sorts likely ones first.
 */
export default function PossibleDuplicateNotice({
  matches,
  isDraft,
  onDismiss,
  onArchiveDraft,
  archiving = false,
}: Props) {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();

  if (!matches.length) return null;

  const best = matches[0];
  const likely = best.confidence === 'likely';
  const more = matches.length - 1;
  const meta = [
    formatDate(best.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    best.account_name,
    best.source ? SOURCE_LABELS[best.source] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.warningContainer,
          borderColor: colors.warning,
          borderLeftWidth: likely ? 4 : 1,
        },
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.headRow}>
        <AlertTriangle size={18} color={colors.warning} />
        <Text style={[styles.title, { color: colors.onWarningContainer }]}>
          {likely
            ? 'Likely duplicate — you may have added this already'
            : 'Possible duplicate — check before saving'}
        </Text>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Not a duplicate — hide this"
        >
          <X size={18} color={colors.onWarningContainer} />
        </TouchableOpacity>
      </View>

      <View style={styles.matchRow}>
        <Text
          style={[styles.merchant, { color: colors.onWarningContainer }]}
          numberOfLines={1}
        >
          {best.merchant_name || 'Unknown'}
        </Text>
        <Text style={[styles.amount, { color: colors.onWarningContainer }]}>
          {formatAmount(best.amount)}
        </Text>
      </View>
      {!!meta && (
        <Text style={[styles.meta, { color: colors.onWarningContainer }]} numberOfLines={1}>
          {meta}
        </Text>
      )}
      <Text style={[styles.why, { color: colors.onWarningContainer }]} numberOfLines={2}>
        {best.explanation}
        {more > 0 ? ` · +${more} more like it` : ''}
      </Text>

      <View style={styles.actions}>
        {isDraft && onArchiveDraft ? (
          <TouchableOpacity
            onPress={onArchiveDraft}
            disabled={archiving}
            style={[styles.archiveButton, { borderColor: colors.warning }]}
            accessibilityRole="button"
          >
            {archiving ? (
              <ActivityIndicator size={14} color={colors.onWarningContainer} />
            ) : (
              <Archive size={14} color={colors.onWarningContainer} />
            )}
            <Text style={[styles.actionText, { color: colors.onWarningContainer }]}>
              Archive this draft
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.hint, { color: colors.onWarningContainer }]}>
            Different purchase? Save it as usual.
          </Text>
        )}
        <TouchableOpacity onPress={onDismiss} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.actionText, { color: colors.onWarningContainer }]}>
            Not a duplicate
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 8,
  },
  merchant: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.85,
  },
  why: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
    opacity: 0.85,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  hint: {
    flex: 1,
    fontSize: 12,
    opacity: 0.85,
  },
});
