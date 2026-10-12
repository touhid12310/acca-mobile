import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CalendarDays,
  ChartColumn,
  HandCoins,
  Lock,
  Mic,
  PiggyBank,
  Repeat,
  ScanLine,
  Sparkles,
  Target,
} from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { radius, shadow, spacing } from '../../constants/theme';
import type { AssistantSuggestion } from '../../hooks/useAssistantSuggestions';
import { ASSISTANT_NAME } from './AssistantHeader';

const ICONS = {
  log: Mic,
  question: ChartColumn,
  loans: HandCoins,
  budgets: PiggyBank,
  schedules: Repeat,
  goals: Target,
  week: CalendarDays,
} as const;

type Props = {
  suggestions: AssistantSuggestion[];
  onScanReceipt: () => void;
  onSuggestion: (suggestion: AssistantSuggestion) => void;
};

/** What an empty chat day shows: a greeting and four starters. */
export function AssistantStart({ suggestions, onScanReceipt, onSuggestion }: Props) {
  const { colors } = useTheme();

  const cards = [
    { key: 'scan', label: 'Scan a receipt', Icon: ScanLine, onPress: onScanReceipt },
    ...suggestions.map((suggestion) => ({
      key: suggestion.key,
      label: suggestion.label,
      Icon: ICONS[suggestion.icon],
      onPress: () => onSuggestion(suggestion),
    })),
  ];

  return (
    <View style={styles.wrap}>
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <Sparkles size={34} color="#ffffff" strokeWidth={2} />
      </View>
      <Text style={[styles.title, { color: colors.onSurface }]}>Hi, I&apos;m {ASSISTANT_NAME}.</Text>
      <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
        Snap a receipt, say what you spent, or ask about your money. I&apos;ll keep your books tidy.
      </Text>

      <View style={styles.grid}>
        {cards.map(({ key, label, Icon, onPress }) => (
          <Pressable
            key={key}
            onPress={onPress}
            accessibilityRole="button"
            android_ripple={{ color: colors.surfaceVariant }}
            style={styles.cardSlot}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.outlineVariant,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View style={[styles.cardIcon, { backgroundColor: colors.primaryContainer }]}>
                  <Icon size={17} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text numberOfLines={3} style={[styles.cardLabel, { color: colors.onSurface }]}>
                  {label}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Lock size={12} color={colors.onSurfaceVariant} style={styles.footerIcon} />
        <Text style={[styles.footerText, { color: colors.onSurfaceVariant }]}>
          {ASSISTANT_NAME} suggests, you confirm. Nothing is saved without you.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Top-weighted rather than centred: on shorter phones a centred block ran
  // under the composer and cut the footer off.
  wrap: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  hero: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.md,
  },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 320,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
    width: '100%',
    marginTop: spacing.lg,
  },
  cardSlot: { width: '48.5%', borderRadius: radius.lg, overflow: 'hidden' },
  card: {
    minHeight: 92,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  footerIcon: { marginTop: 2 },
  footerText: { flexShrink: 1, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});

export default AssistantStart;
