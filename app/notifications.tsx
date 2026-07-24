import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  Calendar,
  CheckCheck,
  Target,
  Trash2,
  Wallet,
} from "lucide-react-native";

import { useTheme } from "../src/contexts/ThemeContext";
import { useToast } from "../src/contexts/NotificationContext";
import { BrandedHeader, BrandStrip } from "../src/components";
import notificationService, {
  AppNotification,
} from "../src/services/notificationService";
import { radius, spacing } from "../src/constants/theme";

// Mirrors the web NotificationDropdown TYPE_CONFIG, with mobile routes.
const TYPE_CONFIG: Record<
  string,
  { Icon: typeof Bell; tone: "warn" | "danger" | "success" | "info"; route: string | null }
> = {
  budget_warning: { Icon: AlertTriangle, tone: "warn", route: "/budgets" },
  budget_overage: { Icon: AlertCircle, tone: "danger", route: "/budgets" },
  goal_completed: { Icon: Target, tone: "success", route: "/goals" },
  schedule_due_soon: { Icon: Calendar, tone: "info", route: "/schedules" },
  daily_log_nudge: { Icon: Wallet, tone: "info", route: "/transaction-modal" },
};

const DEFAULT_CONFIG = { Icon: Bell, tone: "info" as const, route: null };

const formatRelative = (iso: string | null): string => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const toneColor = (tone: "warn" | "danger" | "success" | "info"): string => {
    switch (tone) {
      case "warn":
        return "#f59e0b";
      case "danger":
        return colors.error;
      case "success":
        return colors.tertiary;
      default:
        return colors.primary;
    }
  };

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const result = await notificationService.list();
      if (!result.success || !result.data) {
        throw new Error("Failed to load notifications");
      }
      const payload = result.data as any;
      const feed = payload.data || payload;
      return {
        items: (Array.isArray(feed.items) ? feed.items : []) as AppNotification[],
        unreadCount: Number(feed.unread_count ?? 0),
      };
    },
    refetchInterval: 30000,
  });

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const invalidateFeed = () =>
    queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: invalidateFeed,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: async () => {
      await invalidateFeed();
      toast.success("All notifications marked as read");
    },
    onError: () => toast.error("Could not mark all as read"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => notificationService.remove(id),
    onSuccess: invalidateFeed,
    onError: () => toast.error("Could not delete notification"),
  });

  const handleOpen = (notification: AppNotification) => {
    if (!notification.read_at) {
      markReadMutation.mutate(notification.id);
    }
    const config = TYPE_CONFIG[notification.type] || DEFAULT_CONFIG;
    if (config.route) {
      router.push(config.route as any);
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const config = TYPE_CONFIG[item.type] || DEFAULT_CONFIG;
    const tint = toneColor(config.tone);
    const unread = !item.read_at;

    return (
      <Pressable
        onPress={() => handleOpen(item)}
        style={[
          styles.itemRow,
          { backgroundColor: unread ? `${colors.primary}0d` : "transparent" },
        ]}
      >
        <View style={[styles.itemIcon, { backgroundColor: `${tint}1f` }]}>
          <config.Icon size={18} color={tint} strokeWidth={2.2} />
        </View>
        <View style={styles.itemBody}>
          <Text
            style={[
              styles.itemTitle,
              { color: colors.onSurface, fontWeight: unread ? "800" : "600" },
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {!!item.body && (
            <Text
              style={[styles.itemMessage, { color: colors.onSurfaceVariant }]}
              numberOfLines={3}
            >
              {item.body}
            </Text>
          )}
          <Text style={[styles.itemTime, { color: colors.onSurfaceVariant }]}>
            {formatRelative(item.created_at)}
          </Text>
        </View>
        <View style={styles.itemRight}>
          {unread && (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          )}
          <Pressable
            onPress={() => removeMutation.mutate(item.id)}
            hitSlop={8}
            style={styles.deleteBtn}
          >
            <Trash2 size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <BrandStrip showNotifications={false} />
      <BrandedHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        showBack
        showBrand={false}
        showNotifications={false}
        right={
          unreadCount > 0 ? (
            <Pressable
              onPress={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              style={[styles.markAllBtn, { borderColor: colors.outline }]}
            >
              <CheckCheck size={16} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.markAllText, { color: colors.primary }]}>
                Mark all read
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceVariant }]}>
            <BellOff size={28} color={colors.onSurfaceVariant} strokeWidth={2} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
            No notifications yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            Budget alerts, payment reminders, and goal updates will show up
            here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => (
            <View
              style={[styles.separator, { backgroundColor: colors.outlineVariant }]}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 14,
  },
  itemMessage: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  itemTime: {
    fontSize: 11,
    marginTop: 4,
  },
  itemRight: {
    alignItems: "center",
    gap: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 36 + spacing.md,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
