import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, KeyRound, Mail } from "lucide-react-native";

import { useTheme } from "../../src/contexts/ThemeContext";
import { AlertBar, Button, Input } from "../../src/components/ui";
import authService from "../../src/services/authService";
import { gradients, radius, shadow, spacing } from "../../src/constants/theme";

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Email is required");
      setSuccess("");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setError("Please enter a valid email");
      setSuccess("");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await authService.forgotPassword(trimmedEmail);
      const responseMessage =
        result.message ||
        result.error ||
        ((result.data as { message?: string } | undefined)?.message ?? "");

      if (result.success) {
        setSuccess(
          responseMessage ||
            "If an account exists for this email, a reset link has been sent.",
        );
      } else {
        setError(responseMessage || "Could not send reset link. Try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <LinearGradient
              colors={gradients.heroAccent as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.logoBadge, shadow.md]}
            >
              <KeyRound size={34} color="#ffffff" strokeWidth={2.2} />
            </LinearGradient>
            <Text style={[styles.title, { color: colors.onSurface }]}>
              Forgot password
            </Text>
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              Enter your email and we will send a password reset link.
            </Text>
          </View>

          <View style={styles.form}>
            {!!error && <AlertBar tone="error" message={error} />}
            {!!success && <AlertBar tone="success" message={success} />}

            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (error) setError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              icon={Mail}
            />

            <Button
              label="Send reset link"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              size="lg"
              icon={Mail}
              style={styles.primaryButton}
            />

            <Button
              label="Back to sign in"
              onPress={() => router.back()}
              fullWidth
              size="lg"
              variant="secondary"
              icon={ArrowLeft}
            />
          </View>

          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            hitSlop={8}
            style={styles.footerLink}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Return to login
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    justifyContent: "center",
    gap: spacing.xxl,
  },
  hero: {
    alignItems: "center",
    gap: spacing.md,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: radius.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
  form: {
    gap: spacing.lg,
  },
  primaryButton: {
    marginTop: spacing.xs,
  },
  footerLink: {
    alignSelf: "center",
    padding: spacing.xs,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
