import React, { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  Pressable,
  Image,
} from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { LogIn, Mail, Lock, ShieldCheck } from "lucide-react-native";

import { useAuth } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { Button, Input, AlertBar } from "../../src/components/ui";
import { spacing } from "../../src/constants/theme";
import SocialAuthButtons from "../../src/components/auth/SocialAuthButtons";
import workosService, {
  WorkOSProvider,
} from "../../src/services/workosService";
import authService from "../../src/services/authService";

WebBrowser.maybeCompleteAuthSession();

const MOBILE_REDIRECT_URI = "accounte://auth/callback";

export default function LoginScreen() {
  const { login, loginWithToken } = useAuth();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [socialProvider, setSocialProvider] = useState<WorkOSProvider | null>(
    null,
  );
  const [magicAuthStep, setMagicAuthStep] = useState<"idle" | "email" | "code">("idle");
  const [magicAuthEmail, setMagicAuthEmail] = useState("");
  const [magicAuthCode, setMagicAuthCode] = useState("");
  const [isMagicAuthLoading, setIsMagicAuthLoading] = useState(false);

  const handleMagicAuthStart = async () => {
    const trimmed = magicAuthEmail.trim();
    if (!trimmed) {
      setErrors({ general: "Enter your email first" });
      return;
    }
    if (isMagicAuthLoading) return;
    setIsMagicAuthLoading(true);
    setErrors({});
    try {
      const result = await authService.requestMagicLink(trimmed);
      if (result.success) {
        setMagicAuthStep("code");
      } else {
        setErrors({
          general: (result.data as any)?.message || "Could not send code",
        });
      }
    } catch {
      setErrors({ general: "Could not send code" });
    } finally {
      setIsMagicAuthLoading(false);
    }
  };

  const handleMagicAuthVerify = async () => {
    const trimmed = magicAuthCode.trim();
    if (!trimmed) {
      setErrors({ general: "Enter the code from your email" });
      return;
    }
    if (isMagicAuthLoading) return;
    setIsMagicAuthLoading(true);
    setErrors({});
    try {
      const result = await authService.verifyMagicLink(magicAuthEmail.trim(), trimmed);
      const data = result.data as any;
      const payload = data?.data || data;
      if (result.success && payload?.access_token) {
        await loginWithToken(payload.access_token, payload.user);
        router.replace("/(tabs)");
      } else {
        setErrors({
          general: data?.message || "Invalid or expired code",
        });
      }
    } catch {
      setErrors({ general: "Could not verify code" });
    } finally {
      setIsMagicAuthLoading(false);
    }
  };

  const handleSocialLogin = async (provider: WorkOSProvider) => {
    if (socialProvider) return;
    setSocialProvider(provider);
    setErrors({});
    try {
      const urlResult = await workosService.getAuthorizationUrl({
        provider,
        intent: "login",
      });
      if (!urlResult.success || !urlResult.url) {
        setErrors({
          general: urlResult.message || "Could not start social sign-in",
        });
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        urlResult.url,
        MOBILE_REDIRECT_URI,
      );

      if (result.type !== "success" || !result.url) {
        // user dismissed or cancelled — silent
        return;
      }

      const parsed = new URL(result.url);
      const errorParam = parsed.searchParams.get("error");
      if (errorParam) {
        setErrors({
          general:
            parsed.searchParams.get("error_description") || errorParam,
        });
        return;
      }

      const code = parsed.searchParams.get("code");
      if (!code) {
        setErrors({ general: "Missing authorization code from provider" });
        return;
      }

      const exchange = await workosService.exchange(code);
      if (exchange.success && exchange.accessToken) {
        await loginWithToken(exchange.accessToken, exchange.user);
        router.replace("/(tabs)");
        return;
      }

      if (exchange.requiresPasswordLogin) {
        setErrors({
          general:
            exchange.message ||
            "An account with this email already exists. Sign in with your password first to link.",
        });
        return;
      }

      setErrors({ general: exchange.message || "Sign-in failed" });
    } catch (err: any) {
      console.error("WorkOS login failed:", err);
      setErrors({ general: err?.message || "Sign-in failed" });
    } finally {
      setSocialProvider(null);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email))
      newErrors.email = "Please enter a valid email";
    if (!password) newErrors.password = "Password is required";
    if (requiresTwoFactor && !twoFactorCode.trim())
      newErrors.twoFactorCode = "Two-factor code is required";
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
        requiresTwoFactor ? twoFactorCode.trim() : undefined,
      );
      if (result.success) {
        router.replace("/(tabs)");
      } else if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
      } else {
        setErrors({
          general: result.message || "Login failed. Please try again.",
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
            <Image
              source={
                isDark
                  ? require("../../assets/logo-dark.png")
                  : require("../../assets/logo-light.png")
              }
              style={isDark ? styles.logoImageDark : styles.logoImageLight}
              resizeMode="contain"
            />
            <View
              style={[
                styles.logoDivider,
                { backgroundColor: colors.onSurface },
              ]}
            />
            <Text style={[styles.title, { color: colors.onSurface }]}>
              Welcome back
            </Text>
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              Sign in to continue managing your finances
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {errors.general && (
              <AlertBar tone="error" message={errors.general} />
            )}

            <SocialAuthButtons
              onSelect={handleSocialLogin}
              activeProvider={socialProvider}
              disabled={isLoading}
            />

            {magicAuthStep === "idle" && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: spacing.lg,
                  flexWrap: "wrap",
                }}
              >
                <Pressable
                  onPress={() => setMagicAuthStep("email")}
                  style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }}
                  hitSlop={6}
                >
                  <Text
                    style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}
                  >
                    Email code
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleSocialLogin("passkey" as WorkOSProvider)}
                  style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }}
                  hitSlop={6}
                  disabled={!!socialProvider}
                >
                  <Text
                    style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}
                  >
                    Use a passkey
                  </Text>
                </Pressable>
              </View>
            )}

            {magicAuthStep === "email" && (
              <View
                style={{
                  backgroundColor: colors.surfaceVariant ?? `${colors.primary}10`,
                  borderRadius: 12,
                  padding: spacing.md,
                  gap: spacing.sm,
                }}
              >
                <Text
                  style={{ color: colors.onSurface, fontWeight: "600", fontSize: 13 }}
                >
                  Email me a one-time sign-in code
                </Text>
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  value={magicAuthEmail}
                  onChangeText={setMagicAuthEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  icon={Mail}
                />
                <Button
                  label={isMagicAuthLoading ? "Sending..." : "Send code"}
                  onPress={handleMagicAuthStart}
                  loading={isMagicAuthLoading}
                  disabled={isMagicAuthLoading}
                  fullWidth
                />
                <Pressable
                  onPress={() => setMagicAuthStep("idle")}
                  style={{ alignSelf: "center", paddingVertical: spacing.xs }}
                  hitSlop={6}
                >
                  <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            )}

            {magicAuthStep === "code" && (
              <View
                style={{
                  backgroundColor: colors.surfaceVariant ?? `${colors.primary}10`,
                  borderRadius: 12,
                  padding: spacing.md,
                  gap: spacing.sm,
                }}
              >
                <Text
                  style={{ color: colors.onSurface, fontWeight: "600", fontSize: 13 }}
                >
                  Enter the code we emailed to {magicAuthEmail}
                </Text>
                <Input
                  label="Code"
                  placeholder="123456"
                  value={magicAuthCode}
                  onChangeText={(t) => setMagicAuthCode(t.replace(/\s+/g, ""))}
                  keyboardType="number-pad"
                  maxLength={10}
                  icon={ShieldCheck}
                />
                <Button
                  label={isMagicAuthLoading ? "Verifying..." : "Sign in"}
                  onPress={handleMagicAuthVerify}
                  loading={isMagicAuthLoading}
                  disabled={isMagicAuthLoading}
                  fullWidth
                />
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Pressable
                    onPress={handleMagicAuthStart}
                    disabled={isMagicAuthLoading}
                    hitSlop={6}
                  >
                    <Text style={{ color: colors.primary, fontSize: 12 }}>
                      Resend code
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setMagicAuthStep("idle");
                      setMagicAuthCode("");
                    }}
                    hitSlop={6}
                  >
                    <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

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
              placeholder="••••••••"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errors.password) setErrors((p) => ({ ...p, password: "" }));
              }}
              autoCapitalize="none"
              autoComplete="password"
              icon={Lock}
              secureTextEntry
              secureToggleable
              error={errors.password}
            />

            {requiresTwoFactor && (
              <Input
                label="Two-factor code"
                placeholder="123456"
                value={twoFactorCode}
                onChangeText={(t) => {
                  setTwoFactorCode(t);
                  if (errors.twoFactorCode)
                    setErrors((p) => ({ ...p, twoFactorCode: "" }));
                }}
                keyboardType="number-pad"
                maxLength={6}
                icon={ShieldCheck}
                error={errors.twoFactorCode}
              />
            )}

            <Pressable
              style={styles.forgotPassword}
              onPress={() => router.push("/(auth)/forgot-password")}
              hitSlop={6}
            >
              <Text
                style={[styles.forgotPasswordText, { color: colors.primary }]}
              >
                Forgot password?
              </Text>
            </Pressable>

            <Button
              label={isLoading ? "Signing in..." : "Sign in"}
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              size="lg"
              icon={LogIn}
              style={styles.primaryButton}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text
              style={[styles.footerText, { color: colors.onSurfaceVariant }]}
            >
              Don't have an account?{" "}
            </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable hitSlop={6}>
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  Sign up
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
  logoImageDark: {
    width: 220,
    height: 33,
    marginBottom: spacing.sm,
  },
  logoImageLight: {
    width: 220,
    height: 47,
    marginBottom: spacing.sm,
  },
  logoDivider: {
    width: 220,
    height: 2,
    borderRadius: 999,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 28,
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
  forgotPassword: {
    alignSelf: "flex-end",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: "600",
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
