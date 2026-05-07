import React from "react";
import { Tabs, Redirect } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  BarChart3,
  LayoutGrid,
  ListChecks,
  Menu,
  Sparkles,
  LucideIcon,
} from "lucide-react-native";

import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { radius, shadow, gradients } from "../../src/constants/theme";

const TAB_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutGrid,
  transactions: ListChecks,
  chat: Sparkles,
  reports: BarChart3,
  more: Menu,
};

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const insets = useSafeAreaInsets();

  // First-time login users must finish onboarding before they can use the app.
  if (isAuthenticated && user && !user.onboarding_completed_at) {
    return <Redirect href="/onboarding" />;
  }

  const renderIcon = (
    tabName: string,
    focused: boolean,
    isCenter: boolean = false,
  ) => {
    const Icon = TAB_ICONS[tabName];
    if (!Icon) return null;

    if (isCenter) {
      return (
        <View style={[styles.centerIconWrap, shadow.md]}>
          <LinearGradient
            colors={gradients.primary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Icon
            size={24}
            color="#ffffff"
            strokeWidth={2.3}
          />
        </View>
      );
    }

    return (
      <View style={styles.iconWrap}>
        <Icon
          size={22}
          color={focused ? colors.primary : colors.onSurfaceVariant}
          strokeWidth={focused ? 2.4 : 2}
        />
      </View>
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Let AppDarkBackground + transparent screen roots show through in dark mode
        sceneStyle: {
          backgroundColor: isDark ? "transparent" : colors.background,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: "600",
          marginTop: 2,
          letterSpacing: 0.1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => renderIcon("dashboard", focused),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Activity",
          tabBarIcon: ({ focused }) => renderIcon("transactions", focused),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "AI Chat",
          tabBarIcon: ({ focused }) => renderIcon("chat", focused, true),
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: "600",
            marginTop: 10,
          },
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ focused }) => renderIcon("reports", focused),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => renderIcon("more", focused),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 28,
  },
  centerIconWrap: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    overflow: "hidden",
  },
});
