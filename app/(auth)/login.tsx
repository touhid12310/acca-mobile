import React, { useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { KeyRound, Lock, Mail, MailCheck, ShieldCheck } from "lucide-react-native";

import { useAuth } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { AlertBar } from "../../src/components/ui";
import { AuthShell, Reveal } from "../../src/components/auth/AuthShell";
import {
  AuthIconBadge,
  AuthLink,
  AuthTitle,
} from "../../src/components/auth/AuthParts";
import { AuthField, AuthFieldHandle } from "../../src/components/auth/AuthField";
import { CodeInput } from "../../src/components/auth/CodeInput";
import {
  PrimaryButton,
  OutlineButton,
} from "../../src/components/auth/AuthButtons";
import SocialAuthButtons from "../../src/components/auth/SocialAuthButtons";
import { SocialProvider } from "../../src/services/socialAuthService";
import authService from "../../src/services/authService";
import { startGoogleBrowserAuth } from "../../src/services/googleBrowserAuth";
import { startAppleAuth } from "../../src/services/appleAuth";
import socialAuthService from "../../src/services/socialAuthService";
import analyticsService from "../../src/services/analyticsService";
import metaEvents from "../../src/services/metaEvents";

WebBrowser.maybeCompleteAuthSession();

type Notice = { tone: "success" | "info"; message: string };

export default function LoginScreen() {
  const { login, loginWithToken } = useAuth();
  const { colors } = useTheme();
  const passwordRef = useRef<AuthFieldHandle>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [isResendingLink, setIsResendingLink] = useState(false);
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(
    null,
  );

  const handleResendVerificationLink = async () => {
    if (isResendingLink) return;
    setIsResendingLink(true);
    setNotice(null);
    try {
      const result = await authService.resendEmailLink(email.trim());
      if (result.success) {
        setErrors({});
        setNotice({ tone: "success", message: "Verification link sent — check your inbox." });
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
  const [magicTwoFactorCode, setMagicTwoFactorCode] = useState("");
  const [magicRequiresTwoFactor, setMagicRequiresTwoFactor] = useState(false);
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
    setNotice(null);
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

  // `codes` carries a code that was just completed, before its state lands.
  const handleMagicAuthVerify = async (codes?: { email?: string; twoFactor?: string }) => {
    const trimmed = (codes?.email ?? magicAuthCode).trim();
    const twoFactorDigits = codes?.twoFactor ?? magicTwoFactorCode;
    if (!trimmed) {
      setErrors({ general: "Enter the code from your email" });
      return;
    }
    if (magicRequiresTwoFactor && twoFactorDigits.length !== 6) {
      setErrors({ general: "Enter the 6-digit code from your authenticator app" });
      return;
    }
    if (isMagicAuthLoading) return;
    setIsMagicAuthLoading(true);
    setErrors({});
    setNotice(null);
    try {
      const result = await authService.verifyMagicLink(
        magicAuthEmail.trim(),
        trimmed,
        magicRequiresTwoFactor ? twoFactorDigits : undefined,
      );
      const data = result.data as any;
      const payload = data?.data || data;
      if (result.success && payload?.access_token) {
        await loginWithToken(payload.access_token, payload.user);
        analyticsService.logLogin("email_code");
        router.replace("/(tabs)");
      } else if (data?.requires_two_factor) {
        setMagicRequiresTwoFactor(true);
        setNotice({
          tone: "info",
          message: "Enter your authenticator code to finish signing in",
        });
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

  // Open the browser-based Google flow; the code → Sanctum exchange (plus
  // the 2FA prompt when needed) lives in app/auth/callback.tsx.
  const handleSocialLogin = async (provider: SocialProvider) => {
    if (socialProvider) return;
    setErrors({});
    setNotice(null);

    setSocialProvider(provider);
    try {
      if (provider === "apple") {
        const result = await startAppleAuth();
        if (result.type === "success") {
          const exchanged = await socialAuthService.exchangeApple({
            identityToken: result.identityToken,
            appleUser: result.appleUser,
            fullName: result.fullName,
            authorizationCode: result.authorizationCode,
          });
          if (exchanged.requiresTwoFactor && exchanged.pendingToken) {
            router.push({
              pathname: "/auth/callback",
              params: { pending_token: exchanged.pendingToken },
            });
          } else if (exchanged.success && exchanged.accessToken) {
            await loginWithToken(exchanged.accessToken, exchanged.user);
            analyticsService.logLogin("apple");
            // Sign in with Apple on the login screen creates the account too.
            if (exchanged.isNewUser) metaEvents.logRegistration("apple");
            router.replace("/(tabs)");
          } else {
            setErrors({ general: exchanged.message || "Apple sign-in failed" });
          }
        } else if (result.type === "error") {
          setErrors({ general: result.message || "Apple sign-in failed" });
        }
        return;
      }

      if (provider !== "google") {
        setErrors({ general: "Only Google and Apple sign-in are available." });
        return;
      }

      const result = await startGoogleBrowserAuth("login");
      if (result.type === "success" && result.code && result.state) {
        router.push({
          pathname: "/auth/callback",
          params: { code: result.code, state: result.state },
        });
      } else if (result.type === "error") {
        setErrors({ general: result.message || "Google sign-in failed" });
      }
    } catch (err: any) {
      setErrors({ general: err?.message || "Could not start social sign-in" });
    } finally {
      setSocialProvider(null);
    }
  };

  const validateForm = (code: string) => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email))
      newErrors.email = "Please enter a valid email";
    if (!password) newErrors.password = "Password is required";
    if (requiresTwoFactor && !code)
      newErrors.twoFactorCode = "Two-factor code is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // `twoFactorOverride` is a code that was just completed, before its state lands.
  const handleLogin = async (twoFactorOverride?: string) => {
    const code = (twoFactorOverride ?? twoFactorCode).trim();
    if (!validateForm(code)) return;
    setIsLoading(true);
    setErrors({});
    setNotice(null);
    try {
      const result = await login(
        email.trim(),
        password,
        requiresTwoFactor ? code : undefined,
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
    } catch {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard "Go" / "Done" submits, but never twice.
  const submitLogin = () => {
    if (!isLoading) handleLogin();
  };

  const openMagicAuth = () => {
    setErrors({});
    setNotice(null);
    // Carry over an email already typed for the password sign-in.
    setMagicAuthEmail((prev) => prev || email.trim());
    setMagicAuthStep("email");
  };

  const leaveMagicAuth = () => {
    setErrors({});
    setNotice(null);
    setMagicAuthStep("idle");
    setMagicAuthCode("");
  };

  // Which card the sheet shows. Each is keyed so its content staggers in.
  const panel =
    magicAuthStep === "email"
      ? "magic-email"
      : magicAuthStep === "code"
        ? "magic-code"
        : requiresTwoFactor
          ? "two-factor"
          : requiresEmailVerification
            ? "check-inbox"
            : "password";

  const banner = errors.general ? (
    <Reveal key={`error-${errors.general}`} delay={0}>
      <AlertBar tone="error" message={errors.general} />
    </Reveal>
  ) : notice ? (
    <Reveal key={`notice-${notice.message}`} delay={0}>
      <AlertBar tone={notice.tone} message={notice.message} />
    </Reveal>
  ) : null;

  const strong = { fontWeight: "700" as const, color: colors.onSurface };

  return (
    <AuthShell
      prompt={{
        text: "Don't have an account?",
        action: "Get started",
        onPress: () => router.push("/(auth)/register"),
      }}
    >
      {panel === "password" && (
        <React.Fragment key="password">
          <AuthTitle
            title="Welcome back"
            subtitle="Sign in to continue managing your finances"
            index={0}
          />
          {banner}
          <Reveal index={1}>
            <AuthField
              label="Email address"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errors.email) setErrors((p) => ({ ...p, email: "" }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              // iOS Password AutoFill pairs the password with a "username" field.
              textContentType="username"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={errors.email}
            />
          </Reveal>
          <Reveal index={2}>
            <AuthField
              ref={passwordRef}
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errors.password) setErrors((p) => ({ ...p, password: "" }));
              }}
              autoCapitalize="none"
              autoComplete="current-password"
              secureTextEntry
              secureToggleable
              returnKeyType="go"
              onSubmitEditing={submitLogin}
              error={errors.password}
            />
          </Reveal>
          <Reveal index={3} style={styles.actionTop}>
            <PrimaryButton
              label="Sign in securely"
              icon={Lock}
              loadingLabel="Signing in…"
              onPress={() => handleLogin()}
              loading={isLoading}
            />
          </Reveal>
          <Reveal index={4}>
            <AuthLink
              label="Forgot your password?"
              onPress={() => router.push("/(auth)/forgot-password")}
            />
          </Reveal>
          <Reveal index={5} style={styles.alternatives}>
            <SocialAuthButtons
              heading="Or sign in with"
              onSelect={handleSocialLogin}
              activeProvider={socialProvider}
              disabled={isLoading}
            />
            <OutlineButton
              label="Sign in with an email code"
              icon={Mail}
              onPress={openMagicAuth}
            />
          </Reveal>
        </React.Fragment>
      )}

      {panel === "two-factor" && (
        <React.Fragment key="two-factor">
          <AuthIconBadge icon={ShieldCheck} index={0} />
          <AuthTitle
            title="Two-step verification"
            subtitle="Enter the 6-digit code from your authenticator app to finish signing in."
            index={1}
          />
          {banner}
          <Reveal index={2}>
            <CodeInput
              value={twoFactorCode}
              onChangeText={(t) => {
                setTwoFactorCode(t);
                if (errors.twoFactorCode)
                  setErrors((p) => ({ ...p, twoFactorCode: "" }));
              }}
              autoFocus
              error={!!errors.twoFactorCode}
              accessibilityLabel="Two-factor code"
              onSubmitEditing={submitLogin}
              onComplete={(digits) => {
                if (!isLoading) handleLogin(digits);
              }}
            />
            {errors.twoFactorCode ? (
              <Text style={[styles.fieldError, { color: colors.error }]}>
                {errors.twoFactorCode}
              </Text>
            ) : null}
          </Reveal>
          <Reveal index={3} style={styles.actionTop}>
            <PrimaryButton
              label="Verify & sign in"
              loadingLabel="Verifying…"
              onPress={() => handleLogin()}
              loading={isLoading}
            />
          </Reveal>
          <Reveal index={4}>
            <AuthLink
              label="Back to sign in"
              muted
              onPress={() => {
                setErrors({});
                setRequiresTwoFactor(false);
                setTwoFactorCode("");
              }}
            />
          </Reveal>
        </React.Fragment>
      )}

      {panel === "check-inbox" && (
        <React.Fragment key="check-inbox">
          <AuthIconBadge icon={MailCheck} index={0} />
          <AuthTitle
            title="Check your inbox"
            subtitle={
              <>
                We sent a verification link to <Text style={strong}>{email}</Text>.
                Tap it to finish signing in. The link expires in 60 minutes.
              </>
            }
            index={1}
          />
          {banner}
          <Reveal index={2} style={styles.actionTop}>
            <OutlineButton
              label="Send a new link"
              loadingLabel="Sending…"
              icon={Mail}
              onPress={handleResendVerificationLink}
              loading={isResendingLink}
            />
          </Reveal>
          <Reveal index={3}>
            <AuthLink
              label="Back to sign in"
              muted
              onPress={() => {
                setErrors({});
                setNotice(null);
                setRequiresEmailVerification(false);
              }}
            />
          </Reveal>
        </React.Fragment>
      )}

      {panel === "magic-email" && (
        <React.Fragment key="magic-email">
          <AuthIconBadge icon={Mail} index={0} />
          <AuthTitle
            title="Sign in with a code"
            subtitle="We'll email you a one-time 6-digit code. No password needed."
            index={1}
          />
          {banner}
          <Reveal index={2}>
            <AuthField
              label="Email address"
              placeholder="you@example.com"
              value={magicAuthEmail}
              onChangeText={setMagicAuthEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={handleMagicAuthStart}
            />
          </Reveal>
          <Reveal index={3} style={styles.actionTop}>
            <PrimaryButton
              label="Send code"
              loadingLabel="Sending…"
              onPress={handleMagicAuthStart}
              loading={isMagicAuthLoading}
            />
          </Reveal>
          <Reveal index={4}>
            <AuthLink label="Use my password instead" muted onPress={leaveMagicAuth} />
          </Reveal>
        </React.Fragment>
      )}

      {panel === "magic-code" && (
        <React.Fragment key="magic-code">
          <AuthIconBadge icon={KeyRound} index={0} />
          <AuthTitle
            title="Check your email"
            subtitle={
              <>
                Enter the code we emailed to <Text style={strong}>{magicAuthEmail}</Text>
              </>
            }
            index={1}
          />
          {banner}
          <Reveal index={2}>
            <CodeInput
              value={magicAuthCode}
              onChangeText={setMagicAuthCode}
              autoFocus
              accessibilityLabel="Code from your email"
              onSubmitEditing={() => handleMagicAuthVerify()}
              // With 2FA on, the authenticator code below submits instead.
              onComplete={
                magicRequiresTwoFactor
                  ? undefined
                  : (digits) => handleMagicAuthVerify({ email: digits })
              }
            />
          </Reveal>
          {magicRequiresTwoFactor && (
            <Reveal delay={0} style={styles.codeGroup}>
              <Text style={[styles.codeLabel, { color: colors.onSurfaceVariant }]}>
                Authenticator code
              </Text>
              <CodeInput
                value={magicTwoFactorCode}
                onChangeText={setMagicTwoFactorCode}
                autoFocus
                accessibilityLabel="Authenticator code"
                onSubmitEditing={() => handleMagicAuthVerify()}
                onComplete={(digits) => handleMagicAuthVerify({ twoFactor: digits })}
              />
            </Reveal>
          )}
          <Reveal index={3} style={styles.actionTop}>
            <PrimaryButton
              label="Sign in"
              loadingLabel="Verifying…"
              onPress={() => handleMagicAuthVerify()}
              loading={isMagicAuthLoading}
            />
          </Reveal>
          <Reveal index={4} style={styles.linkRow}>
            <AuthLink
              label="Resend code"
              onPress={handleMagicAuthStart}
              disabled={isMagicAuthLoading}
            />
            <AuthLink label="Cancel" muted onPress={leaveMagicAuth} />
          </Reveal>
        </React.Fragment>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actionTop: {
    marginTop: 4,
  },
  alternatives: {
    gap: 14,
    marginTop: 4,
  },
  fieldError: {
    fontSize: 12.5,
    marginTop: 8,
    textAlign: "center",
  },
  codeGroup: {
    gap: 8,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
