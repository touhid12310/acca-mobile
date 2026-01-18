import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';

import { useTheme } from '../../src/contexts/ThemeContext';

type IconNames = {
  focused: string;
  unfocused: string;
};

const TAB_ICONS: Record<string, IconNames> = {
  dashboard: { focused: 'view-dashboard', unfocused: 'view-dashboard-outline' },
  transactions: { focused: 'format-list-bulleted-square', unfocused: 'format-list-bulleted' },
  chat: { focused: 'chat', unfocused: 'chat-outline' },
  reports: { focused: 'chart-bar', unfocused: 'chart-bar' },
  more: { focused: 'menu', unfocused: 'menu' },
};

export default function TabsLayout() {
  const { colors, isDark } = useTheme();

  const getTabBarIcon = (
    tabName: string,
    focused: boolean,
    color: string,
    isCenter: boolean = false
  ) => {
    const icons = TAB_ICONS[tabName];
    const iconName = focused ? icons.focused : icons.unfocused;

    if (isCenter) {
      return (
        <View
          style={[
            styles.centerIconContainer,
            {
              backgroundColor: focused ? colors.primary : colors.primaryContainer,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={iconName as any}
            size={28}
            color={focused ? '#ffffff' : colors.primary}
          />
        </View>
      );
    }

    return (
      <MaterialCommunityIcons
        name={iconName as any}
        size={24}
        color={color}
      />
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused, color }) =>
            getTabBarIcon('dashboard', focused, color),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Activity',
          tabBarIcon: ({ focused, color }) =>
            getTabBarIcon('transactions', focused, color),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) =>
            getTabBarIcon('chat', focused, colors.primary, true),
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 10,
          },
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ focused, color }) =>
            getTabBarIcon('reports', focused, color),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused, color }) =>
            getTabBarIcon('more', focused, color),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
