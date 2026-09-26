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
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Check,
  CreditCard,
  Info,
  Lightbulb,
  LucideIcon,
  Pencil,
  Plus,
  Sparkles,
  Store,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wand2,
  X,
} from 'lucide-react-native';

import { useTheme } from '../src/contexts/ThemeContext';
import { useToast } from '../src/contexts/NotificationContext';
import { Button, Card, EmptyState, ScreenHeader } from '../src/components/ui';
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

type RuleType = 'expense' | 'income' | 'asset' | 'liability';

type Tone = 'error' | 'tertiary' | 'info' | 'warning';

// Same four types, colours and order as the Categories screen. A rule only
// fires for transactions of its category's own type.
const TYPE_OPTIONS: { value: RuleType; label: string; icon: LucideIcon; tone: Tone }[] = [
  { value: 'expense', label: 'Expense', icon: TrendingDown, tone: 'error' },
  { value: 'income', label: 'Income', icon: TrendingUp, tone: 'tertiary' },
  { value: 'asset', label: 'Asset', icon: Building2, tone: 'info' },
  { value: 'liability', label: 'Liability', icon: CreditCard, tone: 'warning' },
];

const TONE_CONTAINER: Record<Tone, 'errorContainer' | 'tertiaryContainer' | 'infoContainer' | 'warningContainer'> = {
  error: 'errorContainer',
  tertiary: 'tertiaryContainer',
  info: 'infoContainer',
  warning: 'warningContainer',
};

const TONE_ON_CONTAINER: Record<Tone, 'onErrorContainer' | 'onTertiaryContainer' | 'onInfoContainer' | 'onWarningContainer'> = {
  error: 'onErrorContainer',
  tertiary: 'onTertiaryContainer',
  info: 'onInfoContainer',
  warning: 'onWarningContainer',
};

const APPLY_OPTIONS: { value: ApplyScope; title: string; hint: string }[] = [
  { value: 'none', title: 'Only new transactions', hint: 'Past transactions stay as they are' },
  { value: 'uncategorized', title: 'Fill in the blanks', hint: 'Past matches with no category get this one' },
  { value: 'all', title: 'Re-file every match', hint: 'Past matches move here, even ones already filed' },
];

// Merchants are compared lower-cased with punctuation stripped
// (CategorizationRule::normalize), so capitals never matter.
const matchHint = (matchType: RuleMatchType, pattern: string): string => {
  const sample = pattern.trim() || 'Foodpanda';
  if (matchType === 'starts_with') return `Merchants whose name starts with “${sample}”`;
  if (matchType === 'exact') return `Only merchants named exactly “${sample}”`;
  return `Any merchant with “${sample}” in its name`;
};

type FormState = {
  id: number | null;
  pattern: string;
  match_type: RuleMatchType;
  type: RuleType;
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
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [patternFocused, setPatternFocused] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['categorization-rules'],
    queryFn: async (): Promise<RulesPayload> => {
      const result = await ruleService.getAll();
      if (!result.success) throw new Error(result.error || 'Could not load your rules');
      return ((result.data as any)?.data as RulesPayload) ?? { rules: [], suggestions: [] };
    },
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
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
  const selectedCategory = categories.find((category) => category.id === form.category_id) ?? null;
  const selectedSubcategory =
    selectedCategory?.subcategories?.find((sub) => sub.id === form.subcategory_id) ?? null;
  const activeType = TYPE_OPTIONS.find((option) => option.value === form.type) ?? TYPE_OPTIONS[0];
  const typeLabel = activeType.label.toLowerCase();

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
      setPreviewState('idle');
      return undefined;
    }
    let cancelled = false;
    setPreviewState('loading');
    const timer = setTimeout(async () => {
      const result = await ruleService.preview({
        pattern: form.pattern.trim(),
        match_type: form.match_type,
        category_id: form.category_id as number,
      });
      if (cancelled) return;
      const next = result.success ? ((result.data as any)?.data as RulePreview) : null;
      setPreview(next ?? null);
      setPreviewState(next ? 'ready' : 'error');
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
      type: (TYPE_OPTIONS.find((option) => option.value === rule.type)?.value ?? 'expense') as RuleType,
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

  const closeSheet = () => {
    if (!saveMutation.isPending) setModalOpen(false);
  };

  const pickType = (type: RuleType) =>
    setForm((prev) => (prev.type === type ? prev : { ...prev, type, category_id: null, subcategory_id: null }));

  const openCategories = () => {
    setModalOpen(false);
    router.push('/categories' as never);
  };

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

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={closeSheet}>
        <KeyboardAvoidingView behavior="padding" style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }, shadow.lg]}>
            <View style={[styles.handle, { backgroundColor: colors.outline }]} />
            <View style={styles.sheetHeader}>
              <View style={[styles.headerIcon, { backgroundColor: colors.primaryContainer }]}>
                <Wand2 size={20} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.onSurface }]}>{form.id ? 'Edit rule' : 'New rule'}</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.onSurfaceVariant }]}>
                  Matching transactions get filed for you
                </Text>
              </View>
              <Pressable
                onPress={closeSheet}
                hitSlop={10}
                accessibilityLabel="Close"
                style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]}
              >
                <X size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {/* One scroll area for the whole form: the category list used to
                scroll inside it, which showed two scroll bars and pushed the
                button off-screen. The button now sits in the footer below. */}
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <StepLabel step={1} title="Merchant" />
              <View style={[styles.segment, { backgroundColor: colors.surfaceVariant }]} accessibilityRole="radiogroup">
                {MATCH_OPTIONS.map((option) => {
                  const selected = form.match_type === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setForm((prev) => ({ ...prev, match_type: option.value }))}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[styles.segmentItem, selected && [{ backgroundColor: colors.surface }, shadow.sm]]}
                    >
                      <Text
                        style={[styles.segmentText, { color: selected ? colors.primary : colors.onSurfaceVariant }]}
                        numberOfLines={1}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View
                style={[
                  styles.inputWrap,
                  { borderColor: patternFocused ? colors.primary : colors.outline, backgroundColor: colors.surface },
                ]}
              >
                <Store size={18} color={patternFocused ? colors.primary : colors.onSurfaceVariant} />
                <TextInput
                  value={form.pattern}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, pattern: text }))}
                  onFocus={() => setPatternFocused(true)}
                  onBlur={() => setPatternFocused(false)}
                  placeholder="Merchant name, e.g. Foodpanda"
                  placeholderTextColor={colors.onSurfaceVariant}
                  autoFocus={!form.id}
                  autoCorrect={false}
                  maxLength={120}
                  style={[styles.inputField, { color: colors.onSurface }]}
                />
                {form.pattern.length > 0 && (
                  <Pressable
                    onPress={() => setForm((prev) => ({ ...prev, pattern: '' }))}
                    hitSlop={10}
                    accessibilityLabel="Clear merchant"
                  >
                    <X size={16} color={colors.onSurfaceVariant} />
                  </Pressable>
                )}
              </View>
              <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
                {matchHint(form.match_type, form.pattern)} · capitals don't matter
              </Text>

              <StepLabel step={2} title="File it under" />
              <View style={styles.typeRow} accessibilityRole="radiogroup">
                {TYPE_OPTIONS.map((option) => {
                  const selected = form.type === option.value;
                  const Icon = option.icon;
                  const tone = colors[option.tone];
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => pickType(option.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[
                        styles.typeTile,
                        {
                          borderColor: selected ? tone : colors.outline,
                          backgroundColor: selected ? colors[TONE_CONTAINER[option.tone]] : colors.surface,
                        },
                      ]}
                    >
                      <Icon size={18} color={selected ? colors[TONE_ON_CONTAINER[option.tone]] : tone} strokeWidth={2.3} />
                      <Text
                        style={[
                          styles.typeLabel,
                          { color: selected ? colors[TONE_ON_CONTAINER[option.tone]] : colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {categoriesLoading ? (
                <View style={styles.inlineStatus}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>Loading {typeLabel} categories…</Text>
                </View>
              ) : categories.length === 0 ? (
                <View style={[styles.emptyCategories, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.hint, { color: colors.onSurfaceVariant, flex: 1 }]}>
                    You have no {typeLabel} categories yet.
                  </Text>
                  <Pressable onPress={openCategories} hitSlop={8}>
                    <Text style={[styles.linkText, { color: colors.primary }]}>Add one</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.pills}>
                  {categories.map((category) => {
                    const selected = form.category_id === category.id;
                    return (
                      <Pressable
                        key={category.id}
                        onPress={() =>
                          setForm((prev) => ({ ...prev, category_id: category.id, subcategory_id: null }))
                        }
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        style={[
                          styles.pill,
                          {
                            backgroundColor: selected ? colors.primary : colors.surfaceVariant,
                            borderColor: selected ? colors.primary : 'transparent',
                          },
                        ]}
                      >
                        {selected ? (
                          <Check size={14} color={colors.onPrimary} strokeWidth={3} />
                        ) : (
                          <View style={[styles.dot, { backgroundColor: category.color || colors[activeType.tone] }]} />
                        )}
                        <Text
                          style={[styles.pillText, { color: selected ? colors.onPrimary : colors.onSurface }]}
                          numberOfLines={1}
                        >
                          {category.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {selectedCategory && (selectedCategory.subcategories ?? []).length > 0 && (
                <View style={[styles.subPanel, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.subLabel, { color: colors.onSurfaceVariant }]}>
                    {selectedCategory.name} › subcategory (optional)
                  </Text>
                  <View style={styles.pills}>
                    {[{ id: null as number | null, name: 'No subcategory' }, ...(selectedCategory.subcategories ?? [])].map(
                      (sub) => {
                        const selected = form.subcategory_id === sub.id;
                        return (
                          <Pressable
                            key={sub.id ?? 'none'}
                            onPress={() => setForm((prev) => ({ ...prev, subcategory_id: sub.id }))}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            style={[
                              styles.subPill,
                              {
                                backgroundColor: selected ? colors.primaryContainer : colors.surface,
                                borderColor: selected ? colors.primary : colors.outline,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.subPillText,
                                { color: selected ? colors.onPrimaryContainer : colors.onSurface },
                              ]}
                              numberOfLines={1}
                            >
                              {sub.name}
                            </Text>
                          </Pressable>
                        );
                      },
                    )}
                  </View>
                </View>
              )}

              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: previewState === 'idle' ? colors.surfaceVariant : colors.primaryContainer,
                    borderColor: previewState === 'idle' ? 'transparent' : colors.primary,
                  },
                ]}
              >
                {previewState === 'idle' ? (
                  <View style={styles.previewRow}>
                    <Info size={16} color={colors.onSurfaceVariant} />
                    <Text style={[styles.previewText, { color: colors.onSurfaceVariant }]}>
                      Add a merchant and pick a category to see what this rule would match.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.previewTitle, { color: colors.onPrimaryContainer }]} numberOfLines={2}>
                      “{form.pattern.trim()}” → {selectedCategory?.name ?? 'category'}
                      {selectedSubcategory ? ` › ${selectedSubcategory.name}` : ''}
                    </Text>
                    <View style={styles.previewRow}>
                      {previewState === 'loading' ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Sparkles size={15} color={colors.primary} />
                      )}
                      <Text style={[styles.previewText, { color: colors.onSurface }]}>
                        {previewState === 'loading'
                          ? 'Checking your past transactions…'
                          : previewState === 'error' || !preview
                            ? 'Could not count past matches right now. New transactions will still match.'
                            : preview.total === 0
                              ? `No past ${typeLabel} transactions match yet. New ones will.`
                              : `${preview.total} past transaction${preview.total === 1 ? '' : 's'} match · ${preview.uncategorized} without a category`}
                      </Text>
                    </View>
                    {previewState === 'ready' && preview && preview.samples.length > 0 && (
                      <Text style={[styles.previewSamples, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                        e.g. {preview.samples.slice(0, 3).join(', ')}
                      </Text>
                    )}
                  </>
                )}
              </View>

              <StepLabel step={3} title="Past transactions" />
              <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
                {APPLY_OPTIONS.map((option) => {
                  const selected = form.apply === option.value;
                  const count =
                    previewState === 'ready' && preview
                      ? option.value === 'uncategorized'
                        ? preview.uncategorized
                        : option.value === 'all'
                          ? preview.total
                          : null
                      : null;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setForm((prev) => ({ ...prev, apply: option.value }))}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[
                        styles.applyOption,
                        {
                          borderColor: selected ? colors.primary : colors.outline,
                          backgroundColor: selected ? colors.primaryContainer : colors.surface,
                        },
                      ]}
                    >
                      <View style={[styles.radioOuter, { borderColor: selected ? colors.primary : colors.outline }]}>
                        {selected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.applyTitleRow}>
                          <Text style={[styles.applyTitle, { color: colors.onSurface }]}>{option.title}</Text>
                          {count !== null && (
                            <View style={[styles.countPill, { backgroundColor: colors.surfaceVariant }]}>
                              <Text style={[styles.countText, { color: colors.onSurfaceVariant }]}>{count}</Text>
                            </View>
                          )}
                          {!form.id && option.value === 'uncategorized' && (
                            <View style={[styles.countPill, { backgroundColor: colors.primary }]}>
                              <Text style={[styles.countText, { color: colors.onPrimary }]}>Recommended</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>{option.hint}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View
              style={[
                styles.sheetFooter,
                { borderTopColor: colors.outline, paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.surface },
              ]}
            >
              <Button
                label={form.id ? 'Save changes' : 'Create rule'}
                icon={Check}
                fullWidth
                loading={saveMutation.isPending}
                onPress={submit}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/** Numbered heading for each part of the rule sheet. */
function StepLabel({ step, title }: { step: number; title: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepBadge, { backgroundColor: colors.primaryContainer }]}>
        <Text style={[styles.stepNumber, { color: colors.onPrimaryContainer }]}>{step}</Text>
      </View>
      <Text style={[styles.stepTitle, { color: colors.onSurface }]}>{title}</Text>
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
    maxHeight: '92%',
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.sm,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 12.5,
    marginTop: 1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  sheetBody: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
  },
  segmentItem: {
    flex: 1,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 50,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  inputField: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    paddingVertical: 0,
  },
  hint: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeTile: {
    flex: 1,
    height: 62,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  emptyCategories: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    maxWidth: '100%',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 13.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  subPanel: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  subPill: {
    height: 32,
    maxWidth: '100%',
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  subPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 6,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  previewSamples: {
    fontSize: 12,
  },
  applyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  applyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  applyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sheetFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
