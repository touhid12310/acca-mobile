import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  Trophy,
  Mail,
  PieChart,
  Bell,
} from "lucide-react-native";

import { useTheme } from "../src/contexts/ThemeContext";
import { useToast } from "../src/contexts/NotificationContext";
import { Card, IconBadge, ScreenHeader } from "../src/components/ui";
import settingsService from "../src/services/settingsService";
import { NotificationPreferences } from "../src/types";
import { radius, spacing } from "../src/constants/theme";

type PrefKey = keyof Required<NotificationPreferences>;

const DEFAULT_PREFS: Required<NotificationPreferences> = {
  budget_alerts: true,
  payment_reminders: true,
  goal_reached: true,
  email_notifications: false,
  weekly_summary: false,
};

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState<Required<NotificationPreferences>>(DEFAULT_PREFS);
  const [savingKey, setSavingKey] = useState<PrefKey | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["settings", "me"],
    queryFn: async () => {
      const result = await settingsService.get();
      if (!result.success) throw new Error("Failed to load settings");
      const payload = result.data as { data?: { notification_preferences?: NotificationPreferences } };
      return payload?.data ?? null;
    },
  });

  useEffect(() => {
    const incoming = data?.notification_preferences;
    if (incoming && typeof incoming === "object") {
      setPrefs((prev) => ({ ...prev, ...incoming }));
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      const result = await settingsService.update({
        notification_preferences: patch,
      });
      if (!result.success) {
        throw new Error("Could not save preference");
      }
      return result.data as { data?: { notification_preferences?: NotificationPreferences } };
    },
    onSuccess: (result) => {
      const fresh = result?.data?.notification_preferences;
      if (fresh && typeof fresh === "object") {
        setPrefs((prev) => ({ ...prev, ...fresh }));
        queryClient.invalidateQueries({ queryKey: ["settings", "me"] });
      }
    },
  });

  const togglePref = async (key: PrefKey, nextValue: boolean) => {
    const previous = prefs[key];
    setPrefs((prev) => ({ ...prev, [key]: nextValue }));
    setSavingKey(key);
    try {
      await updateMutation.mutateAsync({ [key]: nextValue });
      toast.success(nextValue ? "Notifications enabled" : "Notifications disabled");
    } catch (error) {
      setPrefs((prev) => ({ ...prev, [key]: previous }));
      toast.error("Could not save preference");
    } finally {
      setSavingKey(null);
    }
  };

  const toneFor = (key: PrefKey): "warning" | "primary" | "success" | "info" => {
    switch (key) {
      case "budget_alerts":
        return "warning";
      case "payment_reminders":
        return "primary";
      case "goal_reached":
        return "success";
      case "email_notifications":
        return "info";
      case "weekly_summary":
      default:
        return "primary";
    }
  };

  const renderRow = (
    key: PrefKey,
    Icon: typeof AlertTriangle,
    title: string,
    description: string,
    activeLabel: string,
  ) => (
    <Card variant="elevated" padding="lg" radiusSize="xl" style={styles.row}>
      <View style={styles.rowMain}>
        <IconBadge icon={Icon} tone={toneFor(key)} size="md" />
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: colors.onSurface }]}>{title}</Text>
          <Text
            style={[styles.rowDescription, { color: colors.onSurfaceVariant }]}
          >
            {description}
          </Text>
          <Text
            style={[
              styles.rowMeta,
              {
                color: prefs[key] ? colors.primary : colors.onSurfaceVariant,
              },
            ]}
          >
            {prefs[key] ? activeLabel : "Disabled"}
          </Text>
        </View>
        <Switch
          value={prefs[key]}
          onValueChange={(value) => togglePref(key, value)}
          disabled={savingKey === key}
          trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
          thumbColor="#ffffff"
        />
      </View>
    </Card>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingHorizontal: spacing.lg }}>
        <ScreenHeader
          title="Notifications"
          subtitle="Choose what you want to hear about"
          showBack
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Card variant="elevated" padding="xl" radiusSize="xxl" style={styles.intro}>
          <View
            style={[
              styles.introIcon,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <Bell size={28} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={[styles.introTitle, { color: colors.onSurface }]}>
            Push notifications
          </Text>
          <Text
            style={[styles.introDescription, { color: colors.onSurfaceVariant }]}
          >
            Disabling a category turns it off everywhere — both push notifications
            on this device and the in-app feed.
          </Text>
        </Card>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {renderRow(
              "budget_alerts",
              AlertTriangle,
              "Budget Alerts",
              "Pings you when a budget hits 80% or 100%.",
              "At 80% and 100% thresholds",
            )}

            {renderRow(
              "payment_reminders",
              Calendar,
              "Payment Reminders",
              "Reminders for repeating transactions due tomorrow.",
              "1 day before due",
            )}

            {renderRow(
              "goal_reached",
              Trophy,
              "Goal Reached",
              "Celebrates when you hit a savings goal target.",
              "Enabled",
            )}

            <View style={[styles.sectionLabel]}>
              <Text style={[styles.sectionLabelText, { color: colors.onSurfaceVariant }]}>
                Email
              </Text>
            </View>

            {renderRow(
              "email_notifications",
              Mail,
              "Email Notifications",
              "Receive the alerts above (budget, payment, goal) by email too.",
              "Sending to your registered email",
            )}

            {renderRow(
              "weekly_summary",
              PieChart,
              "Weekly Summary",
              "Weekly digest of spending patterns. Requires email notifications on.",
              prefs.email_notifications
                ? "Every Sunday at 8 AM"
                : "Enable email to receive",
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  intro: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  introDescription: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  row: {},
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  rowDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 4,
  },
  rowMeta: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  sectionLabel: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
