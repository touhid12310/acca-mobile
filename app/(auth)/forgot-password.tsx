import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { KeyRound } from "lucide-react-native";

import { AlertBar } from "../../src/components/ui";
import { AuthShell, Reveal } from "../../src/components/auth/AuthShell";
import {
  AuthIconBadge,
  AuthLink,
  AuthTitle,
} from "../../src/components/auth/AuthParts";
import { AuthField } from "../../src/components/auth/AuthField";
import { PrimaryButton } from "../../src/components/auth/AuthButtons";
import authService from "../../src/services/authService";

// Back to sign in: pop when we came from there, otherwise replace.
const backToSignIn = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/(auth)/login");
};

export default function ForgotPasswordScreen() {
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
    <AuthShell onBack={backToSignIn}>
      <AuthIconBadge icon={KeyRound} index={0} />
      <AuthTitle
        title="Forgot password?"
        subtitle="Enter your email and we will send a password reset link."
        index={1}
      />

      {!!error && (
        <Reveal key={`error-${error}`} delay={0}>
          <AlertBar tone="error" message={error} />
        </Reveal>
      )}
      {!!success && (
        <Reveal key={`success-${success}`} delay={0}>
          <AlertBar tone="success" message={success} />
        </Reveal>
      )}

      <Reveal index={2}>
        <AuthField
          label="Email address"
          placeholder="you@example.com"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (error) setError("");
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={() => {
            if (!isLoading) handleSubmit();
          }}
        />
      </Reveal>

      <Reveal index={3} style={styles.actionTop}>
        <PrimaryButton
          label="Send reset link"
          loadingLabel="Sending…"
          onPress={handleSubmit}
          loading={isLoading}
        />
      </Reveal>

      <Reveal index={4}>
        <AuthLink label="Back to sign in" onPress={backToSignIn} />
      </Reveal>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actionTop: {
    marginTop: 4,
  },
});
