import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Lightbulb, Pencil, Plus, Sparkles, Trash2, Wand2, X } from 'lucide-react-native';

import { useTheme } from '../src/contexts/ThemeContext';
import { useToast } from '../src/contexts/NotificationContext';
import { Button, Card, Chip, EmptyState, ScreenHeader } from '../src/components/ui';
import { BrandStrip } from '../src/components';
import { NativeTextInput as TextInput } from '../src/components/ui/SafeTextInput';
import ruleService, {
  ApplyScope,
  CategorizationRule,
  RuleMatchType,
  RulePreview,
  RuleSuggestion,
  RulesPayload,
} from '../src/services/ruleService';
import categoryService from '../src/services/categoryService';
import { Category } from '../src/types';
import { radius, shadow, spacing } from '../src/constants/theme';

const MATCH_OPTIONS: { value: RuleMatchType; label: string }[] = [
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'exact', label: 'is exactly' },
];

type FormState = {
  id: number | null;
  pattern: string;
  match_type: RuleMatchType;
  type: 'expense' | 'income';
  category_id: number | null;
  subcategory_id: number | null;
  apply: ApplyScope;
};

const emptyForm: FormState = {
  id: null,
  pattern: '',
  match_type: 'contains',
  type: 'expense',
  category_id: null,
  subcategory_id: null,
  apply: 'uncategorized',
};

const errorOf = (result: any, fallback: string): string => {
  const errors = result?.data?.errors;
  const first = errors ? Object.values(errors)[0] : null;
  return (Array.isArray(first) ? first[0] : null) || result?.data?.message || result?.error || fallback;
};

export default function RulesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState<RulePreview | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['categorization-rules'],
    queryFn: async (): Promise<RulesPayload> => {
      const result = await ruleService.getAll();
      if (!result.success) throw new Error(result.error || 'Could not load your rules');
      return ((result.data as any)?.data as RulesPayload) ?? { rules: [], suggestions: [] };
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', form.type],
    enabled: modalOpen,
    queryFn: async (): Promise<Category[]> => {
      const result = await categoryService.getForTransaction({ type: form.type });
      const payload = result.data as any;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.data?.data)) return payload.data.data;
      return [];
    },
  });

  const rules = data?.rules ?? [];
  const suggestions = data?.suggestions ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['categorization-rules'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: { id: number | null; body: any }) => {
      const result = payload.id
        ? await ruleService.update(payload.id, payload.body)
        : await ruleService.create(payload.body);
      if (!result.success) throw new Error(errorOf(result, 'Could not save the rule'));
      return result.data as any;
    },
    onSuccess: (body) => {
      toast.success(body?.message || 'Rule saved');
      setModalOpen(false);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async (rule: CategorizationRule) => {
      const result = await ruleService.update(rule.id, { is_active: !rule.is_active });
      if (!result.success) throw new Error(errorOf(result, 'Could not update the rule'));
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (rule: CategorizationRule) => {
      const result = await ruleService.delete(rule.id);
      if (!result.success) throw new Error(errorOf(result, 'Could not delete the rule'));
      return result.data as any;
    },
    onSuccess: (body) => {
      toast.success(body?.message || 'Rule deleted');
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Live "would match N transactions" while the sheet is open.
  useEffect(() => {
    if (!modalOpen || form.pattern.trim().length < 2 || !form.category_id) {
      setPreview(null);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await ruleService.preview({
        pattern: form.pattern.trim(),
        match_type: form.match_type,
        category_id: form.category_id as number,
      });
      if (!cancelled) setPreview(result.success ? ((result.data as any)?.data as RulePreview) : null);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [modalOpen, form.pattern, form.match_type, form.category_id]);

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (rule: CategorizationRule) => {
    setForm({
      id: rule.id,
      pattern: rule.pattern,
      match_type: rule.match_type,
      type: rule.type === 'income' ? 'income' : 'expense',
      category_id: rule.category_id,
      subcategory_id: rule.subcategory_id,
      apply: 'none',
    });
    setModalOpen(true);
  };

  const submit = () => {
    if (form.pattern.trim().length < 2) {
      toast.error('Use at least 2 characters so the rule does not match everything.');
      return;
    }
    if (!form.category_id) {
      toast.error('Choose the category these transactions should go to.');
      return;
    }
    saveMutation.mutate({
      id: form.id,
      body: {
        pattern: form.pattern.trim(),
        match_type: form.match_type,
        category_id: form.category_id,
        subcategory_id: form.subcategory_id,
        apply_to_existing: form.apply,
      },
    });
  };

  const acceptSuggestion = (suggestion: RuleSuggestion) =>
    saveMutation.mutate({
      id: null,
      body: {
        pattern: suggestion.pattern,
        match_type: suggestion.match_type || 'contains',
        category_id: suggestion.category_id,
        subcategory_id: suggestion.subcategory_id,
        source: 'learned',
        apply_to_existing: 'uncategorized',
      },
    });

  const confirmDelete = (rule: CategorizationRule) =>
    Alert.alert('Delete rule?', `“${rule.pattern}” → ${rule.category_label}. Transactions it already filed keep their category.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(rule) },
    ]);

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
        <ScreenHeader title="Auto-categorize" subtitle="Rules that file transactions for you" showBack />

        <Card variant="elevated" padding="lg" radiusSize="xl" style={{ gap: spacing.sm }}>
          <Text style={[styles.introText, { color: colors.onSurfaceVariant }]}>
            When a merchant matches, AccountE picks the category for you — manual entries, forwarded emails, SMS
            drafts and CSV imports. A category you choose yourself is never overwritten.
          </Text>
          <Button label="New rule" icon={Plus} onPress={openCreate} fullWidth />
        </Card>

        {suggestions.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Lightbulb size={14} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Suggested from your history</Text>
            </View>
            <Card variant="elevated" padding={0} radiusSize="xl">
              {suggestions.map((suggestion, index) => (
                <View
                  key={`${suggestion.pattern}-${suggestion.category_id}`}
                  style={[
                    styles.row,
                    {
                      borderBottomColor: colors.outlineVariant,
                      borderBottomWidth: index === suggestions.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.onSurface }]}>
                      “{suggestion.pattern}” → {suggestion.category_label}
                    </Text>
                    <Text style={[styles.rowMeta, { color: colors.onSurfaceVariant }]}>
                      You filed it this way {suggestion.uses} times
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => acceptSuggestion(suggestion)}
                    disabled={saveMutation.isPending}
                    style={[styles.smallButton, { backgroundColor: colors.primary }]}
                  >
                    <Sparkles size={14} color="#ffffff" />
                    <Text style={styles.smallButtonText}>Create</Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant, marginLeft: spacing.xs }]}>Your rules</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
        ) : rules.length === 0 ? (
          <EmptyState
            icon={Wand2}
            title="No rules yet"
            message="Create one rule — like “Foodpanda → Food › Delivery” — and stop picking the same category again. When you change a transaction's category, we'll offer to turn it into a rule."
            action={{ label: 'Create your first rule', onPress: openCreate }}
          />
        ) : (
          <Card variant="elevated" padding={0} radiusSize="xl">
            {rules.map((rule, index) => (
              <View
                key={rule.id}
                style={[
                  styles.row,
                  {
                    opacity: rule.is_active ? 1 : 0.55,
                    borderBottomColor: colors.outlineVariant,
                    borderBottomWidth: index === rules.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Pressable style={{ flex: 1 }} onPress={() => openEdit(rule)}>
                  <Text style={[styles.rowTitle, { color: colors.onSurface }]}>
                    “{rule.pattern}” → {rule.category_label}
                  </Text>
                  <Text style={[styles.rowMeta, { color: colors.onSurfaceVariant }]}>
                    Merchant {MATCH_OPTIONS.find((m) => m.value === rule.match_type)?.label ?? 'contains'} ·{' '}
                    {rule.times_applied > 0
                      ? `used ${rule.times_applied} time${rule.times_applied === 1 ? '' : 's'}`
                      : 'not used yet'}
                    {rule.source === 'learned' ? ' · learned' : ''}
                  </Text>
                </Pressable>
                <Switch
                  value={rule.is_active}
                  onValueChange={() => toggleMutation.mutate(rule)}
                  disabled={toggleMutation.isPending}
                  trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
                  thumbColor="#ffffff"
                />
                <Pressable onPress={() => openEdit(rule)} hitSlop={8} accessibilityLabel="Edit rule">
                  <Pencil size={17} color={colors.onSurfaceVariant} />
                </Pressable>
                <Pressable onPress={() => confirmDelete(rule)} hitSlop={8} accessibilityLabel="Delete rule">
                  <Trash2 size={17} color={colors.error} />
                </Pressable>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior="padding" style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !saveMutation.isPending && setModalOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.lg }, shadow.lg]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.onSurface }]}>{form.id ? 'Edit rule' : 'New rule'}</Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={10}>
                <X size={20} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>When the merchant name</Text>
              <View style={styles.chips}>
                {MATCH_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={form.match_type === option.value}
                    onPress={() => setForm((prev) => ({ ...prev, match_type: option.value }))}
                  />
                ))}
              </View>
              <TextInput
                value={form.pattern}
                onChangeText={(text) => setForm((prev) => ({ ...prev, pattern: text }))}
                placeholder="e.g. Foodpanda"
                placeholderTextColor={colors.onSurfaceVariant}
                autoFocus={!form.id}
                maxLength={120}
                style={[styles.input, { color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
              />

              <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>File it under</Text>
              <View style={styles.chips}>
                {(['expense', 'income'] as const).map((type) => (
                  <Chip
                    key={type}
                    label={type === 'expense' ? 'Expense' : 'Income'}
                    selected={form.type === type}
                    onPress={() =>
                      setForm((prev) =>
                        prev.type === type ? prev : { ...prev, type, category_id: null, subcategory_id: null },
                      )
                    }
                  />
                ))}
              </View>
              <View style={[styles.categoryList, { borderColor: colors.outlineVariant }]}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                  {categories.map((category) => {
                    const categorySelected = form.category_id === category.id && !form.subcategory_id;
                    return (
                      <View key={category.id}>
                        <Pressable
                          onPress={() => setForm((prev) => ({ ...prev, category_id: category.id, subcategory_id: null }))}
                          style={[styles.categoryRow, categorySelected && { backgroundColor: colors.primaryContainer }]}
                        >
                          <Text style={[styles.categoryText, { color: colors.onSurface, fontWeight: '700' }]}>
                            {category.name}
                          </Text>
                          {categorySelected && <Check size={16} color={colors.primary} />}
                        </Pressable>
                        {(category.subcategories ?? []).map((sub) => {
                          const subSelected = form.subcategory_id === sub.id;
                          return (
                            <Pressable
                              key={sub.id}
                              onPress={() =>
                                setForm((prev) => ({ ...prev, category_id: category.id, subcategory_id: sub.id }))
                              }
                              style={[
                                styles.categoryRow,
                                { paddingLeft: spacing.xl },
                                subSelected && { backgroundColor: colors.primaryContainer },
                              ]}
                            >
                              <Text style={[styles.categoryText, { color: colors.onSurfaceVariant }]}>› {sub.name}</Text>
                              {subSelected && <Check size={16} color={colors.primary} />}
                            </Pressable>
                          );
                        })}
                      </View>
                    );
                  })}
                  {categories.length === 0 && (
                    <Text style={[styles.rowMeta, { color: colors.onSurfaceVariant, padding: spacing.md }]}>Loading categories…</Text>
                  )}
                </ScrollView>
              </View>

              <View style={[styles.preview, { backgroundColor: colors.primaryContainer }]}>
                <Text style={{ color: colors.onSurface, fontSize: 13 }}>
                  {preview
                    ? `${preview.total} existing transaction${preview.total === 1 ? '' : 's'} match · ${preview.uncategorized} without a category`
                    : 'Type a merchant and pick a category to see what this rule would match.'}
                </Text>
                {preview && preview.samples.length > 0 && (
                  <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }} numberOfLines={1}>
                    e.g. {preview.samples.slice(0, 3).join(', ')}
                  </Text>
                )}
              </View>

              <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Existing transactions</Text>
              <View style={styles.chips}>
                <Chip label="Only new ones" selected={form.apply === 'none'} onPress={() => setForm((p) => ({ ...p, apply: 'none' }))} />
                <Chip
                  label={`Fill blanks${preview ? ` (${preview.uncategorized})` : ''}`}
                  selected={form.apply === 'uncategorized'}
                  onPress={() => setForm((p) => ({ ...p, apply: 'uncategorized' }))}
                />
                <Chip
                  label={`Re-file all${preview ? ` (${preview.total})` : ''}`}
                  selected={form.apply === 'all'}
                  onPress={() => setForm((p) => ({ ...p, apply: 'all' }))}
                />
              </View>

              <Button
                label={form.id ? 'Save rule' : 'Create rule'}
                icon={Check}
                fullWidth
                loading={saveMutation.isPending}
                onPress={submit}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  introText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  smallButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  categoryList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  categoryText: {
    fontSize: 14,
  },
  preview: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
});
