import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Check, Clock3, Crown, FileText, ShieldCheck, Sparkles, Zap } from "lucide-react-native";

import { BrandStrip } from "../src/components";
import { Button, Card, ScreenHeader } from "../src/components/ui";
import { useTheme } from "../src/contexts/ThemeContext";
import { useToast } from "../src/contexts/NotificationContext";
import billingService, { BillingPlan, SubscriptionInvoice } from "../src/services/billingService";
import { radius, spacing, typography } from "../src/constants/theme";

const money = (amount: string | number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
};

const apiMessage = (response: any, fallback: string) =>
  response?.data?.message || response?.message || response?.error || fallback;

const unwrapData = <T,>(value: T | { data: T; message?: string } | undefined): T | undefined => {
  if (!value) return undefined;
  return typeof value === "object" && "data" in value ? value.data : value;
};

export default function BillingScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ payment?: string; status?: string }>();
  const verifiedRef = useRef<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => {
      const response = await billingService.getPlans();
      if (!response.success) throw new Error(apiMessage(response, "Could not load plans."));
      return unwrapData(response.data) || [];
    },
  });
  const overviewQuery = useQuery({
    queryKey: ["billing-overview"],
    queryFn: async () => {
      const response = await billingService.getOverview();
      if (!response.success) throw new Error(apiMessage(response, "Could not load billing."));
      return unwrapData(response.data);
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["billing-overview"] });

  useEffect(() => {
    if (!params.payment || verifiedRef.current === params.payment) return;
    verifiedRef.current = params.payment;
    const verify = async () => {
      if (params.status === "cancel" || params.status === "fail") {
        toast.error(params.status === "cancel" ? "Payment was cancelled." : "Payment was not completed.");
      } else {
        const response = await billingService.verifyPayment(params.payment!);
        if (response.success) toast.success("Payment confirmed. Premium is active.");
        else toast.error(apiMessage(response, "EPS has not confirmed this payment yet."));
      }
      await refresh();
      router.replace("/billing" as never);
    };
    verify();
  }, [params.payment, params.status]);

  const trialMutation = useMutation({
    mutationFn: async (plan: BillingPlan) => {
      const response = await billingService.startTrial(plan.slug);
      if (!response.success) throw new Error(apiMessage(response, "Could not start trial."));
      return response;
    },
    onSuccess: async () => {
      toast.success("Your Premium trial has started.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const checkout = async (invoice: SubscriptionInvoice) => {
    setBusy(invoice.uuid);
    try {
      const returnUrl = Linking.createURL("/billing");
      const response = await billingService.checkout(invoice.uuid, returnUrl);
      const checkoutData = unwrapData(response.data);
      if (!response.success || !checkoutData?.redirect_url) {
        throw new Error(apiMessage(response, "Could not open EPS checkout."));
      }
      const result = await WebBrowser.openAuthSessionAsync(checkoutData.redirect_url, returnUrl);
      if (result.type === "success" && result.url) {
        const parsed = Linking.parse(result.url);
        const payment = String(parsed.queryParams?.payment || checkoutData.payment_uuid);
        const status = String(parsed.queryParams?.status || "pending");
        router.replace({ pathname: "/billing" as never, params: { payment, status } });
      } else {
        setBusy(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start payment.");
      setBusy(null);
    }
  };

  const buyPlan = async (plan: BillingPlan) => {
    setBusy(plan.slug);
    try {
      const response = await billingService.createInvoice(plan.slug);
      const invoice = unwrapData(response.data);
      if (!response.success || !invoice) throw new Error(apiMessage(response, "Could not create invoice."));
      await checkout(invoice);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create invoice.");
      setBusy(null);
    }
  };

  const overview = overviewQuery.data;
  const pending = useMemo(() => overview?.invoices?.filter((invoice) => invoice.status === "pending") || [], [overview]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <BrandStrip />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Plans & Billing" subtitle="Your package, usage and invoices" showBack onBack={() => router.back()} />

        {overviewQuery.isLoading || plansQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : (
          <>
            <Card variant="tinted" tint={colors.primaryContainer} style={styles.currentCard}>
              <View style={styles.currentTitle}><ShieldCheck size={22} color={colors.primary} /><Text style={[styles.eyebrow, { color: colors.primary }]}>CURRENT PACKAGE</Text></View>
              <Text style={[styles.currentName, { color: colors.onSurface }]}>{overview?.current_plan?.name || "Free Forever"}</Text>
              <Text style={[styles.muted, { color: colors.onSurfaceVariant }]}>Status: {overview?.subscription?.status || "free"}</Text>
              {overview?.usage?.limit !== null && overview?.usage?.limit !== undefined && (
                <Text style={[styles.muted, { color: colors.onSurfaceVariant }]}>{overview.usage.used} of {overview.usage.limit} AI transactions used</Text>
              )}
            </Card>

            {overview?.subscription?.in_grace_period && (
              <View style={[styles.notice, { backgroundColor: colors.warningContainer }]}><Clock3 size={20} color={colors.warning} /><View style={styles.flex}><Text style={[styles.noticeTitle, { color: colors.onWarningContainer }]}>Grace period active</Text><Text style={[styles.noticeText, { color: colors.onWarningContainer }]}>Pay before {new Date(overview.subscription.grace_ends_at!).toLocaleDateString()} to keep Premium.</Text></View></View>
            )}

            {(plansQuery.data || []).map((plan) => {
              const current = overview?.current_plan?.slug === plan.slug;
              const premium = plan.slug !== "free";
              const canTrial = premium && plan.trial_enabled && overview?.subscription?.can_start_trial && plan.trial_days > 0 && overview?.current_plan?.slug === "free";
              return (
                <Card key={plan.slug} variant="outlined" style={[styles.planCard, plan.is_featured && { borderColor: colors.primary, borderWidth: 2 }]}>
                  {plan.is_featured && <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}><Crown size={15} color={colors.primary} /><Text style={[styles.badgeText, { color: colors.primary }]}>BEST VALUE</Text></View>}
                  <View style={styles.planTop}><View style={styles.flex}><Text style={[styles.planName, { color: colors.onSurface }]}>{plan.name}</Text><Text style={[styles.muted, { color: colors.onSurfaceVariant }]}>{plan.tagline}</Text></View><Text style={[styles.price, { color: colors.onSurface }]}>{money(plan.price, plan.currency)}<Text style={[styles.period, { color: colors.onSurfaceVariant }]}>/{plan.billing_interval === "year" ? "yr" : "mo"}</Text></Text></View>
                  {premium && plan.trial_enabled && plan.trial_days > 0 && <View style={styles.trial}><Zap size={16} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: "700" }}>{plan.trial_days}-day free trial</Text></View>}
                  <View style={styles.features}>{Object.entries(plan.features || {}).map(([key, label]) => <View style={styles.feature} key={key}><Check size={17} color={colors.tertiary} /><Text style={[styles.featureText, { color: colors.onSurface }]}>{label}</Text></View>)}</View>
                  {plan.ai_monthly_limit ? <View style={[styles.quota, { backgroundColor: colors.primaryContainer }]}><Sparkles size={16} color={colors.primary} /><Text style={{ color: colors.onPrimaryContainer, fontWeight: "700" }}>Up to {plan.ai_monthly_limit} AI transactions per period</Text></View> : null}
                  {current ? <Button label="Current package" icon={ShieldCheck} variant="secondary" fullWidth disabled /> : canTrial ? <Button label={`Start ${plan.trial_days}-day free trial`} fullWidth loading={trialMutation.isPending} onPress={() => trialMutation.mutate(plan)} /> : premium ? <Button label="Create invoice & pay" fullWidth loading={busy === plan.slug} onPress={() => buyPlan(plan)} /> : null}
                </Card>
              );
            })}

            <Card variant="elevated" style={styles.invoiceCard}>
              <View style={styles.invoiceHeading}><View><Text style={[styles.eyebrow, { color: colors.onSurfaceVariant }]}>RENEWAL CENTER</Text><Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Invoices</Text></View><FileText size={23} color={colors.primary} /></View>
              {overview?.invoices?.length ? overview.invoices.map((invoice) => <View key={invoice.uuid} style={[styles.invoiceRow, { borderTopColor: colors.outlineVariant }]}><View style={styles.flex}><Text style={[styles.invoiceNumber, { color: colors.onSurface }]}>{invoice.invoice_number}</Text><Text style={[styles.muted, { color: colors.onSurfaceVariant }]}>{invoice.plan?.name} · {new Date(invoice.created_at).toLocaleDateString()}</Text></View><View style={styles.invoiceRight}><Text style={[styles.invoiceNumber, { color: colors.onSurface }]}>{money(invoice.total, invoice.currency)}</Text>{invoice.status === "pending" ? <Button label={busy === invoice.uuid ? "Opening…" : "Pay"} size="sm" loading={busy === invoice.uuid} onPress={() => checkout(invoice)} /> : <Text style={{ color: invoice.status === "paid" ? colors.tertiary : colors.onSurfaceVariant, textTransform: "capitalize", fontWeight: "700" }}>{invoice.status}</Text>}</View></View>) : <Text style={[styles.empty, { color: colors.onSurfaceVariant }]}>No invoices yet. Monthly renewal invoices will appear here.</Text>}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  loading: { marginTop: 80 },
  flex: { flex: 1 },
  currentCard: { gap: spacing.sm },
  currentTitle: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  eyebrow: { ...typography.micro },
  currentName: { ...typography.display },
  muted: { ...typography.caption },
  notice: { flexDirection: "row", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  noticeTitle: { ...typography.bodyStrong },
  noticeText: { ...typography.caption, marginTop: 2 },
  planCard: { gap: spacing.lg },
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  badgeText: { ...typography.micro },
  planTop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  planName: { ...typography.h1 },
  price: { fontSize: 23, fontWeight: "800" },
  period: { fontSize: 12, fontWeight: "500" },
  trial: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  features: { gap: spacing.md },
  feature: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  featureText: { ...typography.body, flex: 1 },
  quota: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  invoiceCard: { gap: spacing.md },
  invoiceHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { ...typography.h2, marginTop: 3 },
  invoiceRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  invoiceRight: { alignItems: "flex-end", gap: spacing.sm },
  invoiceNumber: { ...typography.captionStrong },
  empty: { ...typography.body, textAlign: "center", paddingVertical: spacing.xl },
});
