// Client-side twin of App\Models\CategorizationRule::matchesText() and the
// ordering in CategorizationRuleService::rulesFor(), so the transaction form
// can pre-fill a category the moment a merchant is typed. Mirrors
// acca-tanstack/src/utils/categorizationRules.js — change both together.
import type { CategorizationRule } from '../services/ruleService';

const PLACEHOLDER_MERCHANTS = new Set(['unknown', 'n a', 'na', 'none', 'transaction']);

const MATCH_WEIGHT: Record<string, number> = { exact: 3000, starts_with: 2000, contains: 1000 };

/** "FOODPANDA*BD" and "Foodpanda Bangladesh Ltd." normalise to letters/digits + single spaces. */
export const normalizeRuleText = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const specificity = (rule: CategorizationRule): number =>
  (MATCH_WEIGHT[rule.match_type] ?? 1000) + normalizeRuleText(rule.pattern).length;

const matchesText = (rule: CategorizationRule, text: string): boolean => {
  const pattern = normalizeRuleText(rule.pattern);
  if (!pattern || !text) return false;
  if (rule.match_type === 'exact') return text === pattern;
  if (rule.match_type === 'starts_with') return text.startsWith(pattern);
  return text.includes(pattern);
};

/**
 * The most specific active rule for a merchant and type, or null. A rule only
 * fires for its category's own type (it never turns income into an expense).
 */
export const findMatchingRule = (
  rules: CategorizationRule[] | undefined,
  merchant: string,
  type: string,
): CategorizationRule | null => {
  const text = normalizeRuleText(merchant);
  if (!text || PLACEHOLDER_MERCHANTS.has(text)) return null;
  const wantedType = String(type || '').toLowerCase();

  return (
    (rules ?? [])
      .filter((rule) => rule?.is_active && (!wantedType || rule.type === wantedType))
      .sort((a, b) => specificity(b) - specificity(a) || b.id - a.id)
      .find((rule) => matchesText(rule, text)) ?? null
  );
};
