import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';

export default function Index() {
  const { isAuthenticated, loading } = useAuth();
  const { colors } = useTheme();

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.text, { color: colors.onSurface }]}>
          Loading...
        </Text>
      </View>
    );
  }

  // Redirect based on auth status
  if (isAuthenticated) {
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
