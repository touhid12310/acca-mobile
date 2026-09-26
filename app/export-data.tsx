import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  LucideIcon,
  Mail,
  Trash2,
} from 'lucide-react-native';

import { useTheme } from '../src/contexts/ThemeContext';
import { useToast } from '../src/contexts/NotificationContext';
import {
  Badge,
  Button,
  Card,
  Chip,
  PeriodModal,
  ScreenHeader,
  computePeriodRange,
} from '../src/components/ui';
import type { PeriodRange } from '../src/components/ui';
import { BrandStrip } from '../src/components';
import exportService, { DataExportItem, ExportFormat } from '../src/services/exportService';
import { toDateInputValue } from '../src/utils/date';
import { radius, spacing } from '../src/constants/theme';

const FORMATS: { key: ExportFormat; label: string; hint: string; icon: LucideIcon }[] = [
  { key: 'xlsx', label: 'Excel', hint: 'One workbook, a tab for each section', icon: FileSpreadsheet },
  { key: 'csv', label: 'CSV', hint: 'A .zip of files any spreadsheet can open', icon: FolderArchive },
  { key: 'pdf', label: 'PDF statement', hint: 'Printable, for your bank or accountant', icon: FileText },
];

// Mirrors DataExportService::DATASETS — used until /exports answers.
const FALLBACK_DATASETS = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'categories', label: 'Categories' },
  { key: 'budgets', label: 'Budgets' },
  { key: 'goals', label: 'Goals' },
  { key: 'loans', label: 'Loans' },
  { key: 'schedules', label: 'Schedules' },
];

// A PDF statement is transactions + account balances.
const PDF_DATASETS = ['transactions', 'accounts'];

const formatLabel = (key: string) => FORMATS.find((f) => f.key === key)?.label ?? key.toUpperCase();

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const periodText = (item: DataExportItem) => {
  if (!item.date_from && !item.date_to) return 'All time';
  return `${item.date_from ? fmtDate(item.date_from) : 'the start'} – ${item.date_to ? fmtDate(item.date_to) : 'today'}`;
};

const timeAgo = (iso: string | null) => {
  if (!iso) return '';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
};

const expiresText = (iso: string | null) => {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Link expired';
  const minutes = Math.round(ms / 60000);
  return minutes < 60 ? `Link works for ${Math.max(1, minutes)} more min` : `Link works for ${Math.round(minutes / 60)} more h`;
};

export default function ExportDataScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [period, setPeriod] = useState<PeriodRange>(() => computePeriodRange('all'));
  const [periodModal, setPeriodModal] = useState(false);
  const [selected, setSelected] = useState<string[]>(FALLBACK_DATASETS.map((d) => d.key));
  const statuses = useRef<Record<string, string>>({});

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['exports'],
    queryFn: async () => {
      const result = await exportService.getAll();
      if (!result.success) throw new Error(result.error || 'Could not load your exports');
      return (result.data as any)?.data ?? null;
    },
    // Poll while something is being built.
    refetchInterval: (query) =>
      ((query.state.data?.exports ?? []) as DataExportItem[]).some((e) => e.status === 'queued' || e.status === 'processing')
        ? 4000
        : false,
  });

  const datasets = data?.datasets?.length ? data.datasets : FALLBACK_DATASETS;
  const exportsList: DataExportItem[] = useMemo(() => data?.exports ?? [], [data]);
  const ttlHours = data?.link_ttl_hours ?? 24;
  const inProgress = exportsList.some((e) => e.status === 'queued' || e.status === 'processing');
  const effectiveDatasets = format === 'pdf' ? selected.filter((k) => PDF_DATASETS.includes(k)) : selected;

  useEffect(() => {
    exportsList.forEach((item) => {
      const previous = statuses.current[item.id];
      if (previous && previous !== 'ready' && item.status === 'ready') {
        toast.success('Your export is ready — we also emailed you the link.');
      }
      statuses.current[item.id] = item.status;
    });
  }, [exportsList, toast]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const allTime = period.preset === 'all';
      const result = await exportService.create({
        format,
        datasets: effectiveDatasets,
        date_from: allTime ? null : toDateInputValue(period.start),
        date_to: allTime ? null : toDateInputValue(period.end),
      });
      const body = result.data as any;
      if (!result.success) {
        const error = new Error(body?.message || result.error || 'Could not start the export') as Error & { status?: number };
        error.status = result.status;
        throw error;
      }
      return body;
    },
    onSuccess: (body) => {
      toast.success(body?.message || "We're preparing your export.", { duration: 6000 });
      queryClient.invalidateQueries({ queryKey: ['exports'] });
    },
    onError: (error: Error & { status?: number }) => {
      if (error.status === 409) {
        toast.info(error.message);
        queryClient.invalidateQueries({ queryKey: ['exports'] });
        return;
      }
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await exportService.delete(id);
      if (!result.success) throw new Error(result.error || 'Could not delete the export');
      return result.data as any;
    },
    onSuccess: (body) => {
      toast.success(body?.message || 'Export deleted');
      queryClient.invalidateQueries({ queryKey: ['exports'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleDataset = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <BrandStrip />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <ScreenHeader title="Export your data" subtitle="A copy of your finances, emailed to you" showBack />

        <Card variant="elevated" padding="lg" radiusSize="xl" style={{ gap: spacing.sm }}>
          <View style={styles.introRow}>
            <Mail size={18} color={colors.primary} />
            <Text style={[styles.introText, { color: colors.onSurfaceVariant }]}>
              We&apos;ll email a download link to{' '}
              <Text style={{ color: colors.onSurface, fontWeight: '700' }}>{data?.email || 'your email'}</Text> when the
              file is ready. The link works for {ttlHours} hours.
            </Text>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Format</Text>
        <Card variant="elevated" padding={0} radiusSize="xl">
          {FORMATS.map((option, index) => {
            const active = format === option.key;
            const Icon = option.icon;
            return (
              <Pressable
                key={option.key}
                onPress={() => setFormat(option.key)}
                style={({ pressed }) => [
                  styles.formatRow,
                  {
                    borderBottomColor: colors.outlineVariant,
                    borderBottomWidth: index === FORMATS.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    backgroundColor: active ? colors.primaryContainer : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Icon size={20} color={active ? colors.primary : colors.onSurfaceVariant} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formatLabel, { color: active ? colors.primary : colors.onSurface }]}>
                    {option.label}
                    {option.key === 'xlsx' ? '  · Recommended' : ''}
                  </Text>
                  <Text style={[styles.formatHint, { color: colors.onSurfaceVariant }]}>{option.hint}</Text>
                </View>
                {active && <Check size={18} color={colors.primary} strokeWidth={2.4} />}
              </Pressable>
            );
          })}
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Period</Text>
        <Pressable
          onPress={() => setPeriodModal(true)}
          style={[styles.periodButton, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
        >
          <Calendar size={18} color={colors.primary} />
          <Text style={[styles.periodText, { color: colors.onSurface }]}>{period.label}</Text>
          <ChevronDown size={18} color={colors.onSurfaceVariant} />
        </Pressable>
        <Text style={[styles.note, { color: colors.onSurfaceVariant }]}>
          Applies to transactions and loan payments. Everything else is exported in full.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Include</Text>
        <View style={styles.chips}>
          {datasets.map((dataset: { key: string; label: string }) => {
            const disabled = format === 'pdf' && !PDF_DATASETS.includes(dataset.key);
            return (
              <View key={dataset.key} style={{ opacity: disabled ? 0.4 : 1 }}>
                <Chip
                  label={dataset.label}
                  selected={!disabled && selected.includes(dataset.key)}
                  onPress={disabled ? undefined : () => toggleDataset(dataset.key)}
                />
              </View>
            );
          })}
        </View>
        {format === 'pdf' && (
          <Text style={[styles.note, { color: colors.onSurfaceVariant }]}>
            A PDF statement covers transactions and account balances. Pick Excel or CSV for the rest.
          </Text>
        )}

        <Button
          label={inProgress ? 'Preparing your export…' : 'Email me my export'}
          icon={Mail}
          fullWidth
          loading={createMutation.isPending}
          disabled={effectiveDatasets.length === 0 || inProgress || createMutation.isPending}
          onPress={() => createMutation.mutate()}
        />

        <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Recent exports</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
        ) : exportsList.length === 0 ? (
          <Text style={[styles.note, { color: colors.onSurfaceVariant }]}>No exports yet.</Text>
        ) : (
          <Card variant="elevated" padding={0} radiusSize="xl">
            {exportsList.map((item, index) => {
              const building = item.status === 'queued' || item.status === 'processing';
              return (
                <View
                  key={item.id}
                  style={[
                    styles.historyRow,
                    {
                      borderBottomColor: colors.outlineVariant,
                      borderBottomWidth: index === exportsList.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.historyTitle, { color: colors.onSurface }]} numberOfLines={1}>
                      {formatLabel(item.format)} · {periodText(item)}
                    </Text>
                    <Text style={[styles.historyMeta, { color: colors.onSurfaceVariant }]}>
                      Requested {timeAgo(item.created_at)}
                      {item.status === 'ready' && item.row_count ? ` · ${item.row_count} transactions` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row' }}>
                      {building && <Badge label="Preparing…" tone="info" />}
                      {item.status === 'ready' && <Badge label={expiresText(item.expires_at)} tone="success" />}
                      {item.status === 'expired' && <Badge label="Link expired" tone="neutral" />}
                      {item.status === 'failed' && <Badge label="Failed" tone="danger" />}
                    </View>
                  </View>
                  {item.status === 'ready' && item.download_url && (
                    <Pressable
                      onPress={() =>
                        Linking.openURL(item.download_url as string).catch(() =>
                          toast.error('Could not open the download link.'),
                        )
                      }
                      style={[styles.downloadButton, { backgroundColor: colors.primary }]}
                      hitSlop={6}
                    >
                      <Download size={16} color="#ffffff" />
                      <Text style={styles.downloadText}>Download</Text>
                    </Pressable>
                  )}
                  {!building && (
                    <Pressable
                      onPress={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                      hitSlop={8}
                      style={[styles.deleteButton, { borderColor: colors.outlineVariant }]}
                      accessibilityLabel="Delete this export"
                    >
                      <Trash2 size={16} color={colors.onSurfaceVariant} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>

      <PeriodModal
        visible={periodModal}
        onClose={() => setPeriodModal(false)}
        current={period}
        onSelect={(range) => {
          setPeriod(range);
          setPeriodModal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  introRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  introText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  formatLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  formatHint: {
    fontSize: 12.5,
    marginTop: 2,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  periodText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyMeta: {
    fontSize: 12,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  downloadText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
