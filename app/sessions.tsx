import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../src/contexts/ThemeContext';
import { authService, Session } from '../src/services/authService';

export default function SessionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState<number | null>(null);

  // Fetch sessions
  const {
    data: sessionsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['sessions'],
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

  // Revoke session mutation
  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: number) => authService.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      Alert.alert('Success', 'Session revoked successfully');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to revoke session');
    },
    onSettled: () => {
      setRevokingId(null);
    },
  });

  // Revoke all other sessions mutation
  const revokeAllMutation = useMutation({
    mutationFn: () => authService.revokeOtherSessions(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      const data = result.data as { data?: { revoked_count?: number }; message?: string };
      Alert.alert('Success', data?.message || 'All other sessions revoked');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to revoke sessions');
    },
  });

  const handleRevokeSession = (sessionId: number) => {
    Alert.alert(
      'Revoke Session',
      'Are you sure you want to revoke this session? The device will be logged out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            setRevokingId(sessionId);
            revokeSessionMutation.mutate(sessionId);
          },
        },
      ]
    );
  };

  const handleRevokeAll = () => {
    const otherSessions = sessions.filter((s) => !s.is_current);
    if (otherSessions.length === 0) {
      Alert.alert('Info', 'No other sessions to revoke');
      return;
    }

    Alert.alert(
      'Revoke All Sessions',
      `Are you sure you want to revoke ${otherSessions.length} other session(s)? All other devices will be logged out.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke All',
          style: 'destructive',
          onPress: () => revokeAllMutation.mutate(),
        },
      ]
    );
  };

  const getDeviceIcon = (browser: string) => {
    if (browser === 'Mobile App') return 'cellphone';
    return 'monitor';
  };

  const styles = createStyles(colors, isDark);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{
          title: 'Login Activity',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />

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
      >
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="shield-account"
            size={48}
            color={colors.primary}
          />
          <Text style={styles.headerTitle}>Active Sessions</Text>
          <Text style={styles.headerDescription}>
            These are the devices currently logged into your account. You can revoke
            any session to sign out from that device.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading sessions...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="shield-check"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No active sessions found</Text>
          </View>
        ) : (
          <>
            {sessions.map((session) => (
              <View
                key={session.id}
                style={[
                  styles.sessionCard,
                  session.is_current && styles.currentSession,
                ]}
              >
                <View
                  style={[
                    styles.sessionIcon,
                    session.is_current && styles.currentSessionIcon,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={getDeviceIcon(session.browser)}
                    size={24}
                    color={session.is_current ? '#10b981' : colors.primary}
                  />
                </View>

                <View style={styles.sessionInfo}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionName}>{session.device_name}</Text>
                    {session.is_current && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sessionDetails}>
                    {session.browser} • {session.platform}
                  </Text>
                  <View style={styles.sessionMeta}>
                    <Text style={styles.sessionIp}>{session.ip_address}</Text>
                    <Text style={styles.sessionTime}>
                      Last active: {session.last_active}
                    </Text>
                  </View>
                </View>

                {!session.is_current && (
                  <TouchableOpacity
                    style={styles.revokeButton}
                    onPress={() => handleRevokeSession(session.id)}
                    disabled={revokingId === session.id}
                  >
                    {revokingId === session.id ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <Text style={styles.revokeButtonText}>Revoke</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {sessions.filter((s) => !s.is_current).length > 0 && (
              <TouchableOpacity
                style={styles.revokeAllButton}
                onPress={handleRevokeAll}
                disabled={revokeAllMutation.isPending}
              >
                {revokeAllMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="logout"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.revokeAllButtonText}>
                      Revoke All Other Sessions
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
      padding: 20,
      backgroundColor: colors.card,
      borderRadius: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginTop: 12,
      marginBottom: 8,
    },
    headerDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 60,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 60,
    },
    emptyText: {
      marginTop: 12,
      fontSize: 16,
      color: colors.textSecondary,
    },
    sessionCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#e5e7eb',
    },
    currentSession: {
      borderColor: '#10b981',
      backgroundColor: isDark
        ? 'rgba(16, 185, 129, 0.1)'
        : 'rgba(16, 185, 129, 0.05)',
    },
    sessionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark
        ? 'rgba(59, 130, 246, 0.2)'
        : 'rgba(59, 130, 246, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    currentSessionIcon: {
      backgroundColor: isDark
        ? 'rgba(16, 185, 129, 0.2)'
        : 'rgba(16, 185, 129, 0.1)',
    },
    sessionInfo: {
      flex: 1,
    },
    sessionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    sessionName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginRight: 8,
    },
    currentBadge: {
      backgroundColor: '#10b981',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    currentBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
      textTransform: 'uppercase',
    },
    sessionDetails: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    sessionMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    sessionIp: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: 'monospace',
    },
    sessionTime: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    revokeButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: '#ef4444',
      minWidth: 80,
      alignItems: 'center',
    },
    revokeButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#ef4444',
    },
    revokeAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#ef4444',
      padding: 16,
      borderRadius: 12,
      marginTop: 16,
    },
    revokeAllButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
  });
