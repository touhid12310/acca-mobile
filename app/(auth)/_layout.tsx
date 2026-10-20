import React from "react";
import { Stack } from "expo-router";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function AuthLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        // Every auth screen shares the same header, so a cross-fade reads as
        // the sheet content changing rather than a new page sliding in.
        animation: "fade",
        animationDuration: 280,
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: "Login",
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: "Register",
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Forgot Password",
        }}
      />
    </Stack>
  );
}
