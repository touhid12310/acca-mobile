import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, Sparkles } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { radius, shadow, spacing } from '../../constants/theme';

export const ASSISTANT_NAME = 'AccountE';

type Props = {
  /** "Today", or the picked day ("28 Sep"). */
  dateLabel: string;
  isToday: boolean;
  loading?: boolean;
  onPickDate: () => void;
  onToday: () => void;
};

/** Assistant identity + the chat-day pill, under the brand strip. */
export function AssistantHeader({ dateLabel, isToday, loading, onPickDate, onToday }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.outlineVariant }]}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Sparkles size={20} color="#ffffff" strokeWidth={2.2} />
        <View style={[styles.online, { borderColor: colors.background }]} />
      </View>

      <View style={styles.text}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.onSurface }]}>{ASSISTANT_NAME}</Text>
          <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>AI</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Your AI bookkeeper, always on
        </Text>
      </View>

      {!isToday && (
        <Pressable onPress={onToday} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back to today">
          <Text style={[styles.todayLink, { color: colors.primary }]}>Today</Text>
        </Pressable>
      )}

      <Pressable
        onPress={onPickDate}
        accessibilityRole="button"
        accessibilityLabel={`Chat day: ${dateLabel}. Change day`}
        android_ripple={{ color: colors.surfaceVariant, borderless: false }}
        style={[styles.datePill, { borderColor: colors.outlineVariant, backgroundColor: colors.surface }]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <CalendarDays size={15} color={colors.primary} strokeWidth={2.2} />
        )}
        <Text style={[styles.dateText, { color: colors.onSurface }]}>{dateLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  online: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: '#22c55e',
  },
  text: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 18, fontWeight: '800' },
  badge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm },
  badgeText: { fontSize: 11, fontWeight: '800' },
  subtitle: { fontSize: 12.5, marginTop: 1 },
  todayLink: { fontSize: 12.5, fontWeight: '700' },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dateText: { fontSize: 13, fontWeight: '600' },
});

export default AssistantHeader;
