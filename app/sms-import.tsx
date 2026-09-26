import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Modal,
  Alert,
  Linking,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  ClipboardPaste,
  Inbox,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react-native';

import { useTheme } from '../src/contexts/ThemeContext';
import { useToast } from '../src/contexts/NotificationContext';
import { Button, Card, IconBadge, ScreenHeader } from '../src/components/ui';
import { BrandStrip } from '../src/components';
import { NativeTextInput as TextInput } from '../src/components/ui/SafeTextInput';
import smsService, { SmsOverview, SmsSenderSetting } from '../src/services/smsService';
import accountService from '../src/services/accountService';
import {
  getLastSmsSync,
  isSmsImportEnabled,
  requestSmsPermission,
  setSmsImportEnabled,
  smsImportSupported,
  syncSmsInbox,
} from '../src/services/smsSync';
import { Account } from '../src/types';
import { radius, shadow, spacing } from '../src/constants/theme';

const timeAgo = (ms: number | null) => {
  if (!ms) return 'never';
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
};

export default function SmsImportScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const supported = smsImportSupported();

  const [enabled, setEnabled] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [accountPickerFor, setAccountPickerFor] = useState<SmsSenderSetting | null>(null);

  useEffect(() => {
    void (async () => {
      setEnabled(await isSmsImportEnabled());
      setLastSync(await getLastSmsSync());
    })();
  }, []);

  const { data: overview, refetch, isRefetching } = useQuery({
    queryKey: ['sms', 'overview'],
    queryFn: async (): Promise<SmsOverview | null> => {
      const result = await smsService.getOverview();
      return result.success ? ((result.data as any)?.data as SmsOverview) : null;
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async (): Promise<Account[]> => {
      const result = await accountService.getAll();
      const payload = result.data as any;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.data?.data)) return payload.data.data;
      return [];
    },
  });

  const afterImport = useCallback(
    (imported: number, fallback: string) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['sms', 'overview'] });
      if (imported > 0) {
        toast.success(
          imported === 1
            ? '1 transaction is waiting in Pending review.'
            : `${imported} transactions are waiting in Pending review.`,
          {
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
      } else {
        toast.info(fallback);
      }
    },
    [queryClient, toast],
  );

  const runScan = async (historyDays?: number) => {
    setScanning(true);
    try {
      const result = await syncSmsInbox({ historyDays, force: true });
      setLastSync(await getLastSmsSync());
      if (result.status === 'ok') {
        afterImport(
          result.summary.imported,
          result.uploaded === 0 ? 'No new bank or wallet messages found.' : 'Already up to date — nothing new to add.',
        );
      } else if (result.status === 'no_permission') {
        toast.error('AccountE needs permission to read SMS. Turn the switch off and on to allow it.');
      } else if (result.status === 'error') {
        toast.error(result.message);
      }
    } finally {
      setScanning(false);
    }
  };

  const toggle = async (next: boolean) => {
    if (!next) {
      await setSmsImportEnabled(false);
      setEnabled(false);
      toast.info('SMS import is off. Drafts you already have stay in Pending review.');
      return;
    }

    const permission = await requestSmsPermission();
    if (permission === 'blocked') {
      Alert.alert(
        'Allow SMS access',
        'SMS permission is turned off for AccountE. Open settings → Permissions → SMS and choose Allow.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    if (permission !== 'granted') {
      toast.info('SMS import stays off. You can still paste messages below.');
      return;
    }

    await setSmsImportEnabled(true);
    setEnabled(true);
    Alert.alert('Import past messages?', 'How far back should AccountE look for bank and wallet alerts?', [
      { text: 'Last 7 days', onPress: () => void runScan(7) },
      { text: 'Last 30 days', onPress: () => void runScan(30) },
      { text: 'Last 90 days', onPress: () => void runScan(90) },
    ]);
  };

  const pasteMutation = useMutation({
    mutationFn: async () => {
      const messages = pasteText
        .split(/\n\s*\n/)
        .map((body) => body.trim())
        .filter(Boolean)
        .slice(0, 100)
        .map((body) => ({ body }));
      const result = await smsService.import(messages, 'paste');
      if (!result.success) throw new Error((result.data as any)?.message || result.error || 'Could not read that message.');
      return result.data as any;
    },
    onSuccess: (body) => {
      const imported = Number(body?.data?.imported ?? 0);
      if (imported > 0) setPasteText('');
      afterImport(imported, body?.message || "We couldn't find a completed transaction in that message.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const senderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { account_id?: number | null; is_enabled?: boolean } }) => {
      const result = await smsService.updateSender(id, data);
      if (!result.success) throw new Error((result.data as any)?.message || result.error || 'Could not save');
      return result.data as any;
    },
    onSuccess: (body) => {
      if (body?.message) toast.success(body.message);
      queryClient.invalidateQueries({ queryKey: ['sms', 'overview'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const senders = overview?.senders ?? [];
  const pastedCount = pasteText.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).length;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <BrandStrip />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          <ScreenHeader title="SMS import" subtitle="Bank & wallet alerts become drafts" showBack />

          <Card variant="elevated" padding="xl" radiusSize="xxl" style={styles.intro}>
            <View style={[styles.introIcon, { backgroundColor: colors.primaryContainer }]}>
              <MessageSquareText size={28} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={[styles.introTitle, { color: colors.onSurface }]}>No more typing bKash payments</Text>
            <Text style={[styles.introText, { color: colors.onSurfaceVariant }]}>
              Alerts from bKash, Nagad, Rocket, your bank and cards turn into drafts in Pending review. Nothing
              is saved to your books until you check it.
            </Text>
            <View style={styles.privacyRow}>
              <ShieldCheck size={15} color={colors.primary} />
              <Text style={[styles.privacyText, { color: colors.onSurfaceVariant }]}>
                Personal messages and one-time codes never leave your phone.
              </Text>
            </View>
          </Card>

          {supported ? (
            <Card variant="elevated" padding="lg" radiusSize="xl" style={{ gap: spacing.md }}>
              <View style={styles.row}>
                <IconBadge icon={Inbox} tone={enabled ? 'success' : 'primary'} size="md" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.onSurface }]}>Import automatically</Text>
                  <Text style={[styles.rowMeta, { color: colors.onSurfaceVariant }]}>
                    {enabled ? `Checks when you open AccountE · last ${timeAgo(lastSync)}` : 'Off'}
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={toggle}
                  trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              {enabled && (
                <Button
                  label={scanning ? 'Scanning your inbox…' : 'Scan now'}
                  icon={RefreshCw}
                  variant="secondary"
                  loading={scanning}
                  disabled={scanning}
                  fullWidth
                  onPress={() => void runScan()}
                />
              )}
            </Card>
          ) : (
            <Card variant="elevated" padding="lg" radiusSize="xl">
              <Text style={[styles.rowTitle, { color: colors.onSurface }]}>
                {Platform.OS === 'ios' ? 'iPhone keeps SMS private' : 'Automatic import needs the latest app'}
              </Text>
              <Text style={[styles.rowMeta, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                {Platform.OS === 'ios'
                  ? "Apps can't read your messages on iPhone. Copy a bank or wallet SMS and paste it below — or forward bank emails to your AccountE address."
                  : 'Update AccountE from the Play Store to import SMS automatically. Pasting works right now.'}
              </Text>
            </Card>
          )}

          {overview && (overview.stats.imported_this_month > 0 || overview.stats.pending_review > 0) && (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/(tabs)/transactions', params: { view: 'pending', source: 'sms' } } as never)
              }
            >
              <Card variant="elevated" padding="lg" radiusSize="xl">
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>
                  {overview.stats.pending_review} waiting for review
                </Text>
                <Text style={[styles.rowMeta, { color: colors.onSurfaceVariant }]}>
                  {overview.stats.imported_this_month} imported this month · tap to review
                </Text>
              </Card>
            </Pressable>
          )}

          <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Paste a message</Text>
          <Card variant="elevated" padding="lg" radiusSize="xl" style={{ gap: spacing.md }}>
            <TextInput
              value={pasteText}
              onChangeText={setPasteText}
              multiline
              placeholder={'Send Money Tk 500.00 to 01712345678 successful. Fee Tk 5.00. TrxID 9IN5ABCDEG\n\nSeparate several messages with a blank line.'}
              placeholderTextColor={colors.onSurfaceVariant}
              style={[
                styles.pasteInput,
                { color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background },
              ]}
            />
            <Button
              label={pastedCount > 1 ? `Add ${pastedCount} messages to Pending review` : 'Add to Pending review'}
              icon={ClipboardPaste}
              fullWidth
              loading={pasteMutation.isPending}
              disabled={pastedCount === 0 || pasteMutation.isPending}
              onPress={() => pasteMutation.mutate()}
            />
          </Card>

          {senders.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Senders</Text>
              <Card variant="elevated" padding={0} radiusSize="xl">
                {senders.map((sender, index) => (
                  <View
                    key={sender.id}
                    style={[
                      styles.senderRow,
                      {
                        borderBottomColor: colors.outlineVariant,
                        borderBottomWidth: index === senders.length - 1 ? 0 : StyleSheet.hairlineWidth,
                        opacity: sender.is_enabled ? 1 : 0.55,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[styles.rowTitle, { color: colors.onSurface }]}>{sender.sender}</Text>
                      <Pressable
                        onPress={() => setAccountPickerFor(sender)}
                        style={[styles.accountPill, { borderColor: colors.outlineVariant }]}
                        hitSlop={6}
                      >
                        <Text style={[styles.accountText, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                          Goes to: {sender.account_name || 'Default account'}
                        </Text>
                        <ChevronDown size={14} color={colors.onSurfaceVariant} />
                      </Pressable>
                    </View>
                    <Switch
                      value={sender.is_enabled}
                      onValueChange={(value) => senderMutation.mutate({ id: sender.id, data: { is_enabled: value } })}
                      trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
                      thumbColor="#ffffff"
                    />
                  </View>
                ))}
              </Card>
            </>
          )}

          {overview && !overview.ai_reading && (
            <Text style={[styles.footnote, { color: colors.onSurfaceVariant }]}>
              AccountE reads the usual English bank and wallet formats for free. Bangla alerts and unusual formats
              need AI reading, included with Premium.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={accountPickerFor != null}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountPickerFor(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAccountPickerFor(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }, shadow.lg]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.onSurface }]}>
                Where do {accountPickerFor?.sender} messages go?
              </Text>
              <Pressable onPress={() => setAccountPickerFor(null)} hitSlop={10}>
                <X size={20} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {accounts.map((account) => {
                const selected = accountPickerFor?.account_id === account.id;
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => {
                      if (accountPickerFor) {
                        senderMutation.mutate({ id: accountPickerFor.id, data: { account_id: account.id } });
                      }
                      setAccountPickerFor(null);
                    }}
                    style={[styles.accountRow, selected && { backgroundColor: colors.primaryContainer }]}
                  >
                    <Text style={[styles.accountName, { color: selected ? colors.primary : colors.onSurface }]}>
                      {(account as any).account_name || (account as any).name}
                    </Text>
                    {selected && <Check size={18} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  intro: {
    alignItems: 'center',
  },
  introIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  introTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  introText: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  privacyText: {
    fontSize: 12,
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  pasteInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
  accountText: {
    fontSize: 12.5,
    flexShrink: 1,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    borderRadius: radius.xxl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
  },
});
