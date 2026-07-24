import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Bell } from "lucide-react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { useTheme } from "../../contexts/ThemeContext";
import { radius } from "../../constants/theme";
import notificationService from "../../services/notificationService";

/**
 * Bell + unread badge shown in the brand strip. Opens the full notification
 * feed (web parity with the TanStack header bell).
 */
export function NotificationBell() {
  const { colors } = useTheme();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const result = await notificationService.unreadCount();
      if (!result.success || !result.data) return 0;
      const payload = result.data as any;
      return Number(payload.data?.unread_count ?? payload.unread_count ?? 0);
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  return (
    <Pressable
      onPress={() => router.push("/notifications" as any)}
      hitSlop={8}
      style={styles.bellButton}
      accessibilityLabel="Notifications"
    >
      <Bell size={20} color={colors.onSurface} strokeWidth={2} />
      {unreadCount > 0 && (
        <View style={[styles.bellBadge, { backgroundColor: colors.error }]}>
          <Text style={styles.bellBadgeText}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },
});

export default NotificationBell;
