import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';

export default function Index() {
  const { isAuthenticated, loading, user } = useAuth();
  const { colors } = useTheme();

  // Show loading spinner while checking auth status. We also wait for the
  // user object so we can branch on onboarding state without flashing the
  // tabs first.
  if (loading || (isAuthenticated && !user)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.text, { color: colors.onSurface }]}>
          Loading...
        </Text>
      </View>
    );
  }

  if (isAuthenticated) {
    if (!user?.onboarding_completed_at) {
      return <Redirect href="/onboarding" />;
    }
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
});
