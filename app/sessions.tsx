import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  Monitor,
  ShieldCheck,
  Smartphone,
  LucideIcon,
} from "lucide-react-native";

import { useTheme } from "../src/contexts/ThemeContext";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconBadge,
  ScreenHeader,
} from "../src/components/ui";
import { authService, Session } from "../src/services/authService";
import { radius, shadow, spacing } from "../src/constants/theme";

export default function SessionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [pendingSession, setPendingSession] = useState<Session | null>(null);

  const {
    data: sessionsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const result = await authService.getSessions();
      if (result.success && result.data) {
        const data = result.data as { data?: { sessions?: Session[] } };
        return data?.data?.sessions || [];
      }
      return [];
    },
  });

  const sessions = sessionsData || [];

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: number) => authService.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      Alert.alert("Success", "Session revoked successfully");
    },
    onError: () => Alert.alert("Error", "Failed to revoke session"),
    onSettled: () => setRevokingId(null),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => authService.revokeOtherSessions(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      const data = result.data as {
        data?: { revoked_count?: number };
        message?: string;
      };
      Alert.alert("Success", data?.message || "All other sessions revoked");
    },
    onError: () => Alert.alert("Error", "Failed to revoke sessions"),
  });

  const handleRevokeSession = (sessionId: number) => {
    const target = sessions.find((s) => s.id === sessionId) || null;
    setPendingSession(target);
  };

  const otherSessionCount = sessions.filter((s) => !s.is_current).length;

  const handleRevokeAll = () => {
    if (otherSessionCount === 0) {
      Alert.alert("Info", "No other sessions to revoke");
      return;
    }
    setConfirmAllOpen(true);
  };

  const getDeviceIcon = (browser: string): LucideIcon =>
    browser === "Mobile App" ? Smartphone : Monitor;

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
        <ScreenHeader title="Login activity" subtitle="Active sessions" showBack />
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
        <Card variant="elevated" padding="xl" radiusSize="xxl" style={styles.infoCard}>
          <View
            style={[
              styles.infoIcon,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <ShieldCheck size={28} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={[styles.infoTitle, { color: colors.onSurface }]}>
            Your active sessions
          </Text>
          <Text
            style={[styles.infoDescription, { color: colors.onSurfaceVariant }]}
          >
            These are the devices currently logged into your account. Revoke any
            session to sign out from that device.
          </Text>
        </Card>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No active sessions"
            message="Once you sign in on a device, it'll appear here."
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {sessions.map((session) => {
              const Icon = getDeviceIcon(session.browser);
              return (
                <Card
                  key={session.id}
                  variant={session.is_current ? "tinted" : "elevated"}
                  tint={session.is_current ? colors.tertiaryContainer : undefined}
                  padding="lg"
                  radiusSize="xl"
                >
                  <View style={styles.sessionRow}>
                    <IconBadge
                      icon={Icon}
                      tone={session.is_current ? "success" : "primary"}
                      size="lg"
                      shape="rounded"
                    />
                    <View style={styles.sessionInfo}>
                      <View style={styles.sessionHeader}>
                        <Text
                          style={[
                            styles.sessionName,
                            { color: colors.onSurface },
                          ]}
                          numberOfLines={1}
                        >
                          {session.device_name}
                        </Text>
                        {session.is_current && (
                          <Badge
                            label="Current"
                            tone="success"
                            size="sm"
                            solid
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.sessionDetail,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {session.browser} • {session.platform}
                      </Text>
                      <View style={styles.sessionMeta}>
                        <Text
                          style={[
                            styles.sessionIp,
                            { color: colors.onSurfaceVariant },
                          ]}
                        >
                          {session.ip_address}
                        </Text>
                        <Text
                          style={[
                            styles.sessionTime,
                            { color: colors.onSurfaceVariant },
                          ]}
                        >
                          Last active: {session.last_active}
                        </Text>
                      </View>
                    </View>
                    {!session.is_current && (
                      <Pressable
                        onPress={() => handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                        style={({ pressed }) => [
                          styles.revokeButton,
                          { borderColor: colors.error, opacity: pressed ? 0.6 : 1 },
                        ]}
                      >
                        {revokingId === session.id ? (
                          <ActivityIndicator size="small" color={colors.error} />
                        ) : (
                          <Text
                            style={[
                              styles.revokeButtonText,
                              { color: colors.error },
                            ]}
                          >
                            Revoke
                          </Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                </Card>
              );
            })}

            {sessions.filter((s) => !s.is_current).length > 0 && (
              <Button
                label="Revoke all other sessions"
                variant="destructive"
                icon={LogOut}
                fullWidth
                loading={revokeAllMutation.isPending}
                onPress={handleRevokeAll}
                style={{ marginTop: spacing.md }}
              />
            )}
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={confirmAllOpen}
        icon={LogOut}
        title="Revoke all other sessions?"
        message={`This will sign you out of ${otherSessionCount} other device${otherSessionCount === 1 ? "" : "s"}. You'll stay signed in here.`}
        confirmLabel="Revoke all"
        cancelLabel="Cancel"
        loading={revokeAllMutation.isPending}
        onCancel={() => setConfirmAllOpen(false)}
        onConfirm={() => {
          setConfirmAllOpen(false);
          revokeAllMutation.mutate();
        }}
      />

      <ConfirmDialog
        visible={pendingSession !== null}
        icon={LogOut}
        title="Revoke this session?"
        message={(() => {
          if (!pendingSession) return "";
          const device = pendingSession.device_name || pendingSession.browser || "this device";
          return `${device} will be signed out immediately. They'll need to log in again to continue.`;
        })()}
        confirmLabel="Revoke"
        cancelLabel="Cancel"
        loading={revokeSessionMutation.isPending && revokingId === pendingSession?.id}
        onCancel={() => setPendingSession(null)}
        onConfirm={() => {
          if (!pendingSession) return;
          const id = pendingSession.id;
          setPendingSession(null);
          setRevokingId(id);
          revokeSessionMutation.mutate(id);
        }}
      />
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
    padding: spacing.lg,
    gap: spacing.lg,
  },
  infoCard: {
    alignItems: "center",
    gap: spacing.sm,
  },
  infoIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  infoDescription: {
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  sessionInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  sessionDetail: {
    fontSize: 12.5,
  },
  sessionMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  sessionIp: {
    fontSize: 11.5,
    fontFamily: "monospace",
  },
  sessionTime: {
    fontSize: 11.5,
  },
  revokeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    minWidth: 78,
    alignItems: "center",
    justifyContent: "center",
  },
  revokeButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
