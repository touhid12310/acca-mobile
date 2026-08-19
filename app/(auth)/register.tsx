import React, { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  Pressable,
} from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { Lock, Mail, UserPlus, User2 } from "lucide-react-native";

import { useAuth } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { Button, Input, AlertBar } from "../../src/components/ui";
import { gradients, radius, shadow, spacing } from "../../src/constants/theme";
import SocialAuthButtons from "../../src/components/auth/SocialAuthButtons";
import authService from "../../src/services/authService";
import { SocialProvider } from "../../src/services/socialAuthService";
import { startGoogleBrowserAuth } from "../../src/services/googleBrowserAuth";
import { startAppleAuth } from "../../src/services/appleAuth";
import socialAuthService from "../../src/services/socialAuthService";

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { register, loginWithToken } = useAuth();
  const { colors } = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [isResendingLink, setIsResendingLink] = useState(false);
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(
    null,
  );

  const handleResendVerificationLink = async () => {
    if (isResendingLink) return;
    setIsResendingLink(true);
    try {
      const result = await authService.resendEmailLink(email.trim());
      if (result.success) {
        setErrors({ general: "Verification link sent — check your inbox." });
      } else {
        const msg = (result.data as any)?.message || "Could not resend the verification link.";
        setErrors({ general: msg });
      }
    } catch {
      setErrors({ general: "Could not resend the verification link." });
    } finally {
      setIsResendingLink(false);
    }
  };

  // Open the browser-based Google flow; the code → Sanctum exchange (plus
  // the 2FA prompt when needed) lives in app/auth/callback.tsx.
  const handleSocialSignup = async (provider: SocialProvider) => {
    if (socialProvider) return;
    setErrors({});

    setSocialProvider(provider);
    try {
      if (provider === "apple") {
        const result = await startAppleAuth();
        if (result.type === "success") {
          const exchanged = await socialAuthService.exchangeApple({
            identityToken: result.identityToken,
            appleUser: result.appleUser,
            fullName: result.fullName,
          });
          if (exchanged.requiresTwoFactor && exchanged.pendingToken) {
            router.push({
              pathname: "/auth/callback",
              params: { pending_token: exchanged.pendingToken },
            });
          } else if (exchanged.success && exchanged.accessToken) {
            await loginWithToken(exchanged.accessToken, exchanged.user);
            router.replace("/(tabs)");
          } else {
            setErrors({ general: exchanged.message || "Apple sign-up failed" });
          }
        } else if (result.type === "error") {
          setErrors({ general: result.message || "Apple sign-up failed" });
        }
        return;
      }

      if (provider !== "google") {
        setErrors({ general: "Only Google and Apple sign-up are available." });
        return;
      }

      const result = await startGoogleBrowserAuth("signup");
      if (result.type === "success" && result.code && result.state) {
        router.push({
          pathname: "/auth/callback",
          params: { code: result.code, state: result.state },
        });
      } else if (result.type === "error") {
        setErrors({ general: result.message || "Google sign-up failed" });
      }
    } catch (err: any) {
      setErrors({ general: err?.message || "Could not start social sign-up" });
    } finally {
      setSocialProvider(null);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    else if (name.trim().length < 2)
      newErrors.name = "Name must be at least 2 characters";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email))
      newErrors.email = "Please enter a valid email";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (!confirmPassword)
      newErrors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    try {
      const result = await register(
        name.trim(),
        email.trim(),
        password,
        confirmPassword,
      );
      if (result.success) {
        router.replace("/(tabs)");
      } else if (result.requiresEmailVerification) {
        setRequiresEmailVerification(true);
        setErrors({});
      } else {
        setErrors({
          general: result.message || "Registration failed. Please try again.",
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
      setErrors({ general: "An unexpected error occurred. Please try again." });
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
          {/* Hero */}
          <View style={styles.hero}>
            <LinearGradient
              colors={gradients.heroAccent as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.logoBadge, shadow.md]}
            >
              <UserPlus size={34} color="#ffffff" strokeWidth={2.2} />
            </LinearGradient>
            <Text style={[styles.title, { color: colors.onSurface }]}>
              Create account
            </Text>
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              Start managing your finances with clarity
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {errors.general && (
              <AlertBar tone="error" message={errors.general} />
            )}

            <SocialAuthButtons
              onSelect={handleSocialSignup}
              activeProvider={socialProvider}
              disabled={isLoading}
            />

            <Input
              label="Full name"
              placeholder="Jane Doe"
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (errors.name) setErrors((p) => ({ ...p, name: "" }));
              }}
              autoCapitalize="words"
              autoComplete="name"
              icon={User2}
              error={errors.name}
            />
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errors.email) setErrors((p) => ({ ...p, email: "" }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              icon={Mail}
              error={errors.email}
            />
            <Input
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errors.password) setErrors((p) => ({ ...p, password: "" }));
              }}
              autoCapitalize="none"
              autoComplete="password-new"
              icon={Lock}
              secureTextEntry
              secureToggleable
              error={errors.password}
            />
            <Input
              label="Confirm password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (errors.confirmPassword)
                  setErrors((p) => ({ ...p, confirmPassword: "" }));
              }}
              autoCapitalize="none"
              autoComplete="password-new"
              icon={Lock}
              secureTextEntry
              secureToggleable
              error={errors.confirmPassword}
            />

            {requiresEmailVerification ? (
              <View
                style={{
                  backgroundColor: colors.surfaceVariant ?? `${colors.primary}10`,
                  borderRadius: 12,
                  padding: spacing.md,
                  gap: spacing.xs,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Mail size={18} color={colors.primary} />
                  <Text style={{ color: colors.onSurface, fontWeight: "700", fontSize: 14 }}>
                    Check your inbox
                  </Text>
                </View>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
                  We sent a verification link to <Text style={{ fontWeight: "600", color: colors.onSurface }}>{email}</Text>. Click it to activate your account. The link expires in 60 minutes.
                </Text>
                <Pressable
                  onPress={handleResendVerificationLink}
                  disabled={isResendingLink}
                  style={{ alignSelf: "flex-start", paddingVertical: spacing.xs }}
                  hitSlop={6}
                >
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>
                    {isResendingLink ? "Sending…" : "Send a new link"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Button
                label={isLoading ? "Creating account..." : "Create account"}
                onPress={handleRegister}
                loading={isLoading}
                disabled={isLoading}
                fullWidth
                size="lg"
                icon={UserPlus}
                style={styles.primaryButton}
              />
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text
              style={[styles.footerText, { color: colors.onSurfaceVariant }]}
            >
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable hitSlop={6}>
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  Sign in
                </Text>
              </Pressable>
            </Link>
          </View>
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
    letterSpacing: -0.3,
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButton: {
    marginTop: spacing.xs,
  },
});
