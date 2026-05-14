import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  Pressable,
  TouchableOpacity,
  Image,
} from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { LogIn, Mail, Lock, ShieldCheck } from "lucide-react-native";

import { useAuth } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { Button, Input, AlertBar } from "../../src/components/ui";
import { spacing } from "../../src/constants/theme";
import SocialAuthButtons from "../../src/components/auth/SocialAuthButtons";
import socialAuthService, {
  SocialProvider,
} from "../../src/services/socialAuthService";
import authService from "../../src/services/authService";
import { getPublicAppConfig } from "../../src/services/appConfigService";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, loginWithToken } = useAuth();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [isResendingLink, setIsResendingLink] = useState(false);
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(
    null,
  );

  // Pull the per-platform Google client IDs from /api/public/app-config so
  // they can be rotated/managed in the admin panel without a mobile rebuild.
  const [googleClientIds, setGoogleClientIds] = useState<{
    iosClientId?: string;
    androidClientId?: string;
    webClientId?: string;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await getPublicAppConfig();
      if (cancelled || !cfg) return;
      setGoogleClientIds({
        iosClientId: cfg.google_oauth.ios_client_id || undefined,
        androidClientId: cfg.google_oauth.android_client_id || undefined,
        webClientId: cfg.google_oauth.web_client_id || undefined,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // expo-auth-session/providers/google handles the platform-specific OAuth
  // dance natively — iOS uses the reverse-bundle-ID redirect, Android
  // validates by package + SHA-1, web uses the registered HTTPS callback.
  // It returns a Google id_token which we send to the backend for Sanctum
  // issuance via socialAuthService.exchangeIdToken().
  // Pass non-null placeholders until the real IDs land — Google.useAuthRequest
  // throws "must be defined" on undefined. Empty strings pass the null
  // check, and we still block promptGoogleAsync() below until real IDs load.
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    iosClientId: googleClientIds?.iosClientId ?? "",
    androidClientId: googleClientIds?.androidClientId ?? "",
    webClientId: googleClientIds?.webClientId ?? "",
    scopes: ["openid", "email", "profile"],
  });

  // React to the Google provider's response — exchange id_token → Sanctum.
  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type !== "success") {
      if (googleResponse.type === "error") {
        setErrors({
          general: googleResponse.error?.message || "Google sign-in failed",
        });
      }
      setSocialProvider(null);
      return;
    }

    const idToken = googleResponse.params?.id_token
      ?? googleResponse.authentication?.idToken;
    if (!idToken) {
      setErrors({ general: "Google did not return an id_token." });
      setSocialProvider(null);
      return;
    }

    (async () => {
      try {
        const platform = Platform.OS === "android" ? "android"
          : Platform.OS === "ios" ? "ios" : "web";
        const exchange = await socialAuthService.exchangeIdToken(idToken, platform);

        if (exchange.requiresTwoFactor && exchange.pendingToken) {
          router.replace({
            pathname: "/auth/callback",
            params: { pending_token: exchange.pendingToken },
          });
          return;
        }

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
        setErrors({ general: err?.message || "Sign-in failed" });
      } finally {
        setSocialProvider(null);
      }
    })();
  }, [googleResponse, loginWithToken]);

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

  // Trigger the platform-native Google sheet. The actual id_token →
  // Sanctum handoff happens in the useEffect on `googleResponse` above.
  const handleSocialLogin = async (provider: SocialProvider) => {
    if (socialProvider) return;
    setErrors({});

    if (provider !== "google") {
      setErrors({ general: "Only Google sign-in is wired up so far." });
      return;
    }

    if (!googleClientIds?.iosClientId && !googleClientIds?.androidClientId) {
      setErrors({
        general:
          "Google sign-in is not configured yet. Ask an administrator to set the iOS / Android client IDs in the admin panel.",
      });
      return;
    }

    if (!googleRequest) {
      // Hook hasn't initialized yet (shouldn't normally happen once IDs
      // are loaded, but guard so the press doesn't no-op silently).
      setErrors({ general: "Google sign-in isn't ready yet — try again." });
      return;
    }

    setSocialProvider(provider);
    try {
      await promptGoogleAsync();
    } catch (err: any) {
      setErrors({ general: err?.message || "Could not open Google sign-in" });
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
      } else if (result.requiresEmailVerification) {
        setRequiresEmailVerification(true);
        setErrors({});
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
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => setMagicAuthStep("email")}
                style={{
                  width: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: "#cbd5e1",
                  borderRadius: 10,
                  backgroundColor: "transparent",
                  marginTop: 6,
                }}
              >
                <Mail size={16} color="#2563eb" />
                <Text
                  style={{
                    color: "#2563eb",
                    fontWeight: "600",
                    fontSize: 13,
                    marginLeft: 6,
                  }}
                >
                  Sign in with an email code
                </Text>
              </TouchableOpacity>
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

            {requiresEmailVerification && (
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
                  We sent a verification link to <Text style={{ fontWeight: "600", color: colors.onSurface }}>{email}</Text>. Click it to finish signing in. The link expires in 60 minutes.
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
            )}

            {!requiresEmailVerification && (
              <>
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
              </>
            )}
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
