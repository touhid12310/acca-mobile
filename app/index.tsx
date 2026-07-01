import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
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
    // Branded loading screen shown while we check auth / fetch the user.
    // Using the same splash-icon asset as the native splash for a smooth
    // transition. Constrain the logo size so the top never gets clipped
    // against the status bar or screen edge.
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Image
          source={require('../assets/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
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
    paddingHorizontal: 24,
  },
  logo: {
    // Constrain size + let the container center it.
    // This prevents the top of the logo from being clipped by the
    // status bar / display cutout on splash/loading.
    width: '48%',
    maxWidth: 190,
    height: 170,
    marginBottom: 16,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
  },
});
