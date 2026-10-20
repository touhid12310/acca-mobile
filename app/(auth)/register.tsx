import React, { useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ArrowRight, Mail, MailCheck } from "lucide-react-native";

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
import { PasswordStrength } from "../../src/components/auth/PasswordStrength";
import {
  PrimaryButton,
  OutlineButton,
} from "../../src/components/auth/AuthButtons";
import SocialAuthButtons from "../../src/components/auth/SocialAuthButtons";
import authService from "../../src/services/authService";
import { SocialProvider } from "../../src/services/socialAuthService";
import { startGoogleBrowserAuth } from "../../src/services/googleBrowserAuth";
import { startAppleAuth } from "../../src/services/appleAuth";
import socialAuthService from "../../src/services/socialAuthService";
import analyticsService from "../../src/services/analyticsService";
import metaEvents from "../../src/services/metaEvents";

WebBrowser.maybeCompleteAuthSession();

// Sign up is normally opened from sign in, so going back keeps the stack
// short; a deep link straight here replaces it with sign in instead.
const goToSignIn = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/(auth)/login");
};

export default function RegisterScreen() {
  const { register, loginWithToken } = useAuth();
  const { colors } = useTheme();
  const emailRef = useRef<AuthFieldHandle>(null);
  const mobileRef = useRef<AuthFieldHandle>(null);
  const passwordRef = useRef<AuthFieldHandle>(null);
  const confirmRef = useRef<AuthFieldHandle>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [isResendingLink, setIsResendingLink] = useState(false);
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(
    null,
  );

  const handleResendVerificationLink = async () => {
    if (isResendingLink) return;
    setIsResendingLink(true);
    setNotice("");
    try {
      const result = await authService.resendEmailLink(email.trim());
      if (result.success) {
        setErrors({});
        setNotice("Verification link sent — check your inbox.");
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
            analyticsService.logLogin("apple");
            if (exchanged.isNewUser) metaEvents.logRegistration("apple");
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
    if (!mobile.trim()) newErrors.mobile = "Mobile number is required";
    else if (!/^\+?[0-9][0-9\s\-()]{6,19}$/.test(mobile.trim()))
      newErrors.mobile = "Please enter a valid mobile number";
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
        mobile.trim(),
        password,
        confirmPassword,
      );
      // Either way the account now exists; verification only gates sign-in.
      if (result.success || result.requiresEmailVerification) {
        metaEvents.logRegistration("email");
      }
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
    } catch {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard "Go" on the last field submits, but never twice.
  const submitRegister = () => {
    if (!isLoading) handleRegister();
  };

  // Clears a field's error as soon as the user edits it.
  const clearError = (key: string) => {
    if (errors[key]) setErrors((p) => ({ ...p, [key]: "" }));
  };

  const banner = errors.general ? (
    <Reveal key={`error-${errors.general}`} delay={0}>
      <AlertBar tone="error" message={errors.general} />
    </Reveal>
  ) : notice ? (
    <Reveal key={`notice-${notice}`} delay={0}>
      <AlertBar tone="success" message={notice} />
    </Reveal>
  ) : null;

  return (
    <AuthShell
      onBack={router.canGoBack() ? () => router.back() : undefined}
      prompt={{
        text: "Already have an account?",
        action: "Sign in",
        onPress: goToSignIn,
      }}
    >
      {requiresEmailVerification ? (
        <React.Fragment key="check-inbox">
          <AuthIconBadge icon={MailCheck} index={0} />
          <AuthTitle
            title="Check your inbox"
            subtitle={
              <>
                We sent a verification link to{" "}
                <Text style={{ fontWeight: "700", color: colors.onSurface }}>{email}</Text>.
                Tap it to activate your account. The link expires in 60 minutes.
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
            <AuthLink label="Back to sign in" muted onPress={goToSignIn} />
          </Reveal>
        </React.Fragment>
      ) : (
        <React.Fragment key="form">
          <AuthTitle
            title="Get started free"
            subtitle="Free forever plan. No credit card needed."
            index={0}
          />
          {banner}
          <Reveal index={1}>
            <AuthField
              label="Your name"
              placeholder="Jane Doe"
              value={name}
              onChangeText={(t) => {
                setName(t);
                clearError("name");
              }}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => emailRef.current?.focus()}
              error={errors.name}
            />
          </Reveal>
          <Reveal index={2}>
            <AuthField
              ref={emailRef}
              label="Email address"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clearError("email");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => mobileRef.current?.focus()}
              error={errors.email}
            />
          </Reveal>
          <Reveal index={3}>
            <AuthField
              ref={mobileRef}
              label="Mobile number"
              placeholder="+8801XXXXXXXXX"
              value={mobile}
              onChangeText={(t) => {
                setMobile(t);
                clearError("mobile");
              }}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoComplete="tel"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={errors.mobile}
            />
          </Reveal>
          <Reveal index={4}>
            <AuthField
              ref={passwordRef}
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                clearError("password");
              }}
              autoCapitalize="none"
              autoComplete="password-new"
              secureTextEntry
              secureToggleable
              accessory={<PasswordStrength password={password} />}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => confirmRef.current?.focus()}
              error={errors.password}
            />
          </Reveal>
          <Reveal index={5}>
            <AuthField
              ref={confirmRef}
              label="Confirm password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                clearError("confirmPassword");
              }}
              autoCapitalize="none"
              autoComplete="password-new"
              secureTextEntry
              secureToggleable
              returnKeyType="go"
              onSubmitEditing={submitRegister}
              error={errors.confirmPassword}
            />
          </Reveal>
          <Reveal index={6} style={styles.actionTop}>
            <PrimaryButton
              label="Create my free account"
              iconRight={ArrowRight}
              loadingLabel="Creating account…"
              onPress={handleRegister}
              loading={isLoading}
            />
          </Reveal>
          <Reveal index={7} style={styles.actionTop}>
            <SocialAuthButtons
              heading="Or sign up with"
              onSelect={handleSocialSignup}
              activeProvider={socialProvider}
              disabled={isLoading}
            />
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
});
