import React, { useEffect, useState } from "react";
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
import * as Google from "expo-auth-session/providers/google";
import { Lock, Mail, UserPlus, User2 } from "lucide-react-native";

import { useAuth } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { Button, Input, AlertBar } from "../../src/components/ui";
import { gradients, radius, shadow, spacing } from "../../src/constants/theme";
import SocialAuthButtons from "../../src/components/auth/SocialAuthButtons";
import authService from "../../src/services/authService";
import socialAuthService, {
  SocialProvider,
} from "../../src/services/socialAuthService";
import { getPublicAppConfig } from "../../src/services/appConfigService";

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

  // Native Google sign-up via expo-auth-session/providers/google.
  // Same flow as Login: fetch the per-platform client IDs from
  // /api/public/app-config, hand them to Google.useAuthRequest, then
  // exchange the returned id_token for a Sanctum token via the backend.
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

  // Pass non-null placeholders until the real IDs land — Google.useAuthRequest
  // throws "must be defined" on undefined. Empty strings pass the null
  // check, and we still block promptGoogleAsync() below until real IDs load.
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    iosClientId: googleClientIds?.iosClientId ?? "",
    androidClientId: googleClientIds?.androidClientId ?? "",
    webClientId: googleClientIds?.webClientId ?? "",
    scopes: ["openid", "email", "profile"],
  });

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

    const idToken =
      googleResponse.params?.id_token ?? googleResponse.authentication?.idToken;
    if (!idToken) {
      setErrors({ general: "Google did not return an id_token." });
      setSocialProvider(null);
      return;
    }

    (async () => {
      try {
        const platform =
          Platform.OS === "android" ? "android"
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

        setErrors({ general: exchange.message || "Sign-up failed" });
      } catch (err: any) {
        setErrors({ general: err?.message || "Sign-up failed" });
      } finally {
        setSocialProvider(null);
      }
    })();
  }, [googleResponse, loginWithToken]);

  const handleSocialSignup = async (provider: SocialProvider) => {
    if (socialProvider) return;
    setErrors({});

    if (provider !== "google") {
      setErrors({ general: "Only Google sign-up is wired up so far." });
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
