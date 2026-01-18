import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (requiresTwoFactor && !twoFactorCode.trim()) {
      newErrors.twoFactorCode = 'Two-factor code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const result = await login(
        email.trim(),
        password,
        requiresTwoFactor ? twoFactorCode.trim() : undefined
      );

      if (result.success) {
        router.replace('/(tabs)');
      } else if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
      } else {
        setErrors({
          general: result.message || 'Login failed. Please try again.',
        });

        if (result.errors) {
          const fieldErrors: Record<string, string> = {};
          Object.entries(result.errors).forEach(([key, messages]) => {
            fieldErrors[key] = Array.isArray(messages) ? messages[0] : messages;
          });
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        }
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoContainer,
                { backgroundColor: colors.primaryContainer },
              ]}
            >
              <MaterialCommunityIcons
                name="wallet"
                size={48}
                color={colors.primary}
              />
            </View>
            <Text variant="headlineMedium" style={[styles.title, { color: colors.onSurface }]}>
              Welcome Back
            </Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              Sign in to continue managing your finances
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {errors.general && (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: colors.errorContainer },
                ]}
              >
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color={colors.error}
                />
                <Text style={[styles.errorBannerText, { color: colors.error }]}>
                  {errors.general}
                </Text>
              </View>
            )}

            <TextInput
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={!!errors.email}
              left={<TextInput.Icon icon="email" />}
              style={styles.input}
            />
            {errors.email && (
              <HelperText type="error" visible={!!errors.email}>
                {errors.email}
              </HelperText>
            )}

            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password)
                  setErrors((prev) => ({ ...prev, password: '' }));
              }}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              error={!!errors.password}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
            />
            {errors.password && (
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>
            )}

            {requiresTwoFactor && (
              <>
                <TextInput
                  label="Two-Factor Code"
                  value={twoFactorCode}
                  onChangeText={(text) => {
                    setTwoFactorCode(text);
                    if (errors.twoFactorCode)
                      setErrors((prev) => ({ ...prev, twoFactorCode: '' }));
                  }}
                  mode="outlined"
                  keyboardType="number-pad"
                  maxLength={6}
                  error={!!errors.twoFactorCode}
                  left={<TextInput.Icon icon="shield-key" />}
                  style={styles.input}
                />
                {errors.twoFactorCode && (
                  <HelperText type="error" visible={!!errors.twoFactorCode}>
                    {errors.twoFactorCode}
                  </HelperText>
                )}
              </>
            )}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text
                style={[styles.forgotPasswordText, { color: colors.primary }]}
              >
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.onSurfaceVariant }]}>
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 4,
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
});
