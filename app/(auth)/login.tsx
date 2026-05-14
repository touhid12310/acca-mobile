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
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Mail, ShieldCheck, ArrowRight } from "lucide-react-native";

import { useAuth } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { Button, Input, AlertBar } from "../../src/components/ui";
import { spacing } from "../../src/constants/theme";
import authService from "../../src/services/authService";

WebBrowser.maybeCompleteAuthSession();

// Deep-link redirect captured by app/auth/callback.tsx (the URL must also be
// added as an Authorized Redirect URI in Google Cloud Console for the OAuth
// client we use — the same client whose ID/secret are stored in the admin
// panel under GOOGLE_OAUTH_CLIENT_ID / _SECRET).
const MOBILE_REDIRECT_URI = "accounte://auth/callback";

type Step = "email" | "code";

export default function LoginScreen() {
  const { loginWithToken } = useAuth();
  const { colors, isDark } = useTheme();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleRequestCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setErrors({ email: "Email is required" });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      setErrors({ email: "That doesn't look like a valid email" });
      return;
    }
    if (isSendingCode) return;

    setErrors({});
    setIsSendingCode(true);
    try {
      const result = await authService.requestEmailCode(trimmed);
      if (result.success) {
        setStep("code");
      } else {
        setErrors({
          general:
            (result.data as { message?: string } | undefined)?.message ||
            "Could not send the code. Try again.",
        });
      }
    } catch {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setErrors({ code: "Enter the code we emailed you" });
      return;
    }
    if (isVerifying) return;

    setErrors({});
    setIsVerifying(true);
    try {
      const result = await authService.verifyEmailCode(
        email.trim().toLowerCase(),
        trimmed,
      );
      if (result.success && result.data) {
        const data = result.data as {
          data?: { access_token?: string; user?: any };
        };
        const accessToken = data.data?.access_token;
        const user = data.data?.user;
        if (accessToken) {
          await loginWithToken(accessToken, user);
          router.replace("/(tabs)");
          return;
        }
      }
      setErrors({
        general:
          (result.data as { message?: string } | undefined)?.message ||
          "Incorrect or expired code",
      });
    } catch {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleLoading) return;
    setErrors({});
    setIsGoogleLoading(true);
    try {
      const urlResult = await authService.googleAuthorizationUrl(
        MOBILE_REDIRECT_URI,
        "login",
      );
      if (!urlResult.success) {
        setErrors({
          general:
            (urlResult.data as { message?: string } | undefined)?.message ||
            "Could not start Google sign-in",
        });
        return;
      }
      const data = urlResult.data as {
        data?: { url?: string; state?: string };
      };
      const url = data.data?.url;
      if (!url) {
        setErrors({ general: "Google sign-in is not configured." });
        return;
      }

      const browserResult = await WebBrowser.openAuthSessionAsync(
        url,
        MOBILE_REDIRECT_URI,
      );

      if (browserResult.type !== "success" || !browserResult.url) {
        // User cancelled or dismissed — silent.
        return;
      }

      const parsed = Linking.parse(browserResult.url);
      const queryCode = parsed.queryParams?.code as string | undefined;
      const queryState = parsed.queryParams?.state as string | undefined;
      const queryError = parsed.queryParams?.error as string | undefined;

      if (queryError) {
        setErrors({ general: `Sign-in cancelled: ${queryError}` });
        return;
      }
      if (!queryCode || !queryState) {
        setErrors({ general: "Google did not return a sign-in code." });
        return;
      }

      const exchange = await authService.googleExchange(
        queryCode,
        queryState,
        MOBILE_REDIRECT_URI,
      );
      if (exchange.success && exchange.data) {
        const data2 = exchange.data as {
          data?: { access_token?: string; user?: any };
        };
        const accessToken = data2.data?.access_token;
        const user = data2.data?.user;
        if (accessToken) {
          await loginWithToken(accessToken, user);
          router.replace("/(tabs)");
          return;
        }
      }
      setErrors({
        general:
          (exchange.data as { message?: string } | undefined)?.message ||
          "Google sign-in failed",
      });
    } catch (err) {
      setErrors({
        general:
          (err as Error)?.message || "Could not complete Google sign-in",
      });
    } finally {
      setIsGoogleLoading(false);
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
              style={[styles.logoDivider, { backgroundColor: colors.onSurface }]}
            />
            <Text style={[styles.title, { color: colors.onSurface }]}>
              Sign in to Accounte
            </Text>
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              No password — just your email or your Google account.
            </Text>
          </View>

          <View style={styles.form}>
            {errors.general && (
              <AlertBar tone="error" message={errors.general} />
            )}

            <Pressable
              onPress={handleGoogleLogin}
              disabled={isGoogleLoading || isSendingCode || isVerifying}
              style={({ pressed }) => [
                styles.googleBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.outline ?? "#cbd5e1",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.googleIconWrap}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text
                style={[styles.googleBtnText, { color: colors.onSurface }]}
              >
                {isGoogleLoading ? "Redirecting…" : "Continue with Google"}
              </Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: colors.outlineVariant ?? "#e2e8f0" },
                ]}
              />
              <Text
                style={[
                  styles.dividerLabel,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                or use your email
              </Text>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: colors.outlineVariant ?? "#e2e8f0" },
                ]}
              />
            </View>

            {step === "email" && (
              <>
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
                  autoFocus
                />
                <Button
                  label={isSendingCode ? "Sending code…" : "Email me a sign-in code"}
                  onPress={handleRequestCode}
                  loading={isSendingCode}
                  disabled={isSendingCode}
                  fullWidth
                  size="lg"
                  icon={ArrowRight}
                />
                <Text
                  style={[
                    styles.fineprint,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  First time? We'll create your account when you submit the
                  code.
                </Text>
              </>
            )}

            {step === "code" && (
              <>
                <Text
                  style={{
                    color: colors.onSurface,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  Enter the code sent to {email}
                </Text>
                <Input
                  label="Sign-in code"
                  placeholder="000000"
                  value={code}
                  onChangeText={(t) => {
                    setCode(t.replace(/\s+/g, "").slice(0, 10));
                    if (errors.code || errors.general) setErrors({});
                  }}
                  keyboardType="number-pad"
                  maxLength={10}
                  icon={ShieldCheck}
                  error={errors.code}
                  autoFocus
                />
                <Button
                  label={isVerifying ? "Verifying…" : "Verify & sign in"}
                  onPress={handleVerifyCode}
                  loading={isVerifying}
                  disabled={isVerifying}
                  fullWidth
                  size="lg"
                  icon={ArrowRight}
                />
                <View style={styles.codeActions}>
                  <Pressable
                    onPress={handleRequestCode}
                    disabled={isSendingCode}
                    hitSlop={6}
                  >
                    <Text style={{ color: colors.primary, fontSize: 13 }}>
                      Resend code
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setStep("email");
                      setCode("");
                      setErrors({});
                    }}
                    hitSlop={6}
                  >
                    <Text
                      style={{
                        color: colors.onSurfaceVariant,
                        fontSize: 13,
                      }}
                    >
                      Use a different email
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
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
  logoImageDark: { width: 220, height: 33, marginBottom: spacing.sm },
  logoImageLight: { width: 220, height: 47, marginBottom: spacing.sm },
  logoDivider: {
    width: 220,
    height: 2,
    borderRadius: 999,
    marginBottom: spacing.xs,
  },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  form: { gap: spacing.lg },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  googleIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  googleG: { fontSize: 14, fontWeight: "700", color: "#4285F4" },
  googleBtnText: { fontSize: 15, fontWeight: "600" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: 12, fontWeight: "500" },
  fineprint: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  codeActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
