import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import {
  Text,
  Surface,
  Switch,
  Divider,
  Avatar,
  Portal,
  Modal,
  Button,
  RadioButton,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { getInitials } from '../../src/utils/format';

type MenuSection = {
  title: string;
  items: MenuItem[];
};

type MenuItem = {
  icon: string;
  label: string;
  description?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  color?: string;
};

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const { colors, themeMode, setThemeMode, toggleTheme, isDark } = useTheme();
  const {
    currency,
    availableCurrencies,
    updateCurrency,
    isCurrencyUpdating,
  } = useCurrency();

  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  const filteredCurrencies = availableCurrencies.filter(
    (curr) =>
      curr.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      curr.label.toLowerCase().includes(currencySearch.toLowerCase())
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const menuSections: MenuSection[] = [
    {
      title: 'Finance Management',
      items: [
        {
          icon: 'bank',
          label: 'Accounts',
          description: 'Manage your bank accounts',
          onPress: () => router.push('/accounts'),
        },
        {
          icon: 'target',
          label: 'Budgets',
          description: 'Set and track budgets',
          onPress: () => router.push('/budgets'),
        },
        {
          icon: 'flag',
          label: 'Goals',
          description: 'Savings goals tracker',
          onPress: () => router.push('/goals'),
        },
        {
          icon: 'credit-card',
          label: 'Loans',
          description: 'Track loan payments',
          onPress: () => router.push('/loans'),
        },
        {
          icon: 'calendar-check',
          label: 'Bills',
          description: 'Recurring bills reminder',
          onPress: () => router.push('/bills'),
        },
        {
          icon: 'tag-multiple',
          label: 'Categories',
          description: 'Manage transaction categories',
          onPress: () => router.push('/categories'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'palette',
          label: 'Theme',
          description: themeMode === 'system' ? 'System default' : themeMode === 'dark' ? 'Dark mode' : 'Light mode',
          onPress: () => setThemeModalVisible(true),
          rightElement: (
            <View style={styles.themePreview}>
              <MaterialCommunityIcons
                name={isDark ? 'weather-night' : 'weather-sunny'}
                size={20}
                color={colors.onSurfaceVariant}
              />
            </View>
          ),
        },
        {
          icon: 'currency-usd',
          label: 'Currency',
          description: currency,
          onPress: () => setCurrencyModalVisible(true),
        },
        {
          icon: 'bell',
          label: 'Notifications',
          description: 'Manage notification settings',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: 'account-edit',
          label: 'Edit Profile',
          description: 'Update your profile & photo',
          onPress: () => router.push('/profile'),
        },
        {
          icon: 'lock',
          label: 'Change Password',
          description: 'Update your password',
          onPress: () => router.push('/profile'),
        },
        {
          icon: 'shield-key',
          label: 'Two-Factor Auth',
          description: 'Add extra security',
          onPress: () => router.push('/profile'),
        },
        {
          icon: 'shield-account',
          label: 'Login Activity',
          description: 'Manage active sessions',
          onPress: () => router.push('/sessions'),
        },
        {
          icon: 'download',
          label: 'Export Data',
          description: 'Download your data',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle',
          label: 'Help & FAQ',
          onPress: () => {},
        },
        {
          icon: 'message-text',
          label: 'Contact Support',
          onPress: () => {},
        },
        {
          icon: 'information',
          label: 'About',
          description: 'Version 1.0.0',
          onPress: () => {},
        },
      ],
    },
    {
      title: '',
      items: [
        {
          icon: 'logout',
          label: 'Logout',
          color: colors.error,
          onPress: handleLogout,
        },
      ],
    },
  ];

  const renderMenuItem = (item: MenuItem, index: number, isLast: boolean) => (
    <React.Fragment key={item.label}>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={item.onPress}
        disabled={!item.onPress}
      >
        <View
          style={[
            styles.menuItemIcon,
            { backgroundColor: `${item.color || colors.primary}15` },
          ]}
        >
          <MaterialCommunityIcons
            name={item.icon as never}
            size={22}
            color={item.color || colors.primary}
          />
        </View>
        <View style={styles.menuItemContent}>
          <Text
            variant="bodyLarge"
            style={{ color: item.color || colors.onSurface }}
          >
            {item.label}
          </Text>
          {item.description && (
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {item.description}
            </Text>
          )}
        </View>
        {item.rightElement || (
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={colors.onSurfaceVariant}
          />
        )}
      </TouchableOpacity>
      {!isLast && <Divider style={{ marginLeft: 56 }} />}
    </React.Fragment>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Surface
            style={[styles.profileCard, { backgroundColor: colors.surface }]}
            elevation={1}
          >
            {(user as any)?.profile_picture_url ? (
              <Image
                source={{ uri: (user as any).profile_picture_url }}
                style={styles.profileAvatar}
              />
            ) : (
              <Avatar.Text
                size={64}
                label={getInitials(user?.name || 'User')}
                style={{ backgroundColor: colors.primaryContainer }}
                labelStyle={{ color: colors.primary }}
              />
            )}
            <View style={styles.profileInfo}>
              <Text variant="titleLarge" style={{ color: colors.onSurface }}>
                {user?.name || 'User'}
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                {user?.email || 'No email'}
              </Text>
            </View>
            <View style={styles.editProfileButton}>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={colors.onSurfaceVariant}
              />
            </View>
          </Surface>
        </TouchableOpacity>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            {section.title && (
              <Text
                variant="labelLarge"
                style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}
              >
                {section.title}
              </Text>
            )}
            <Surface
              style={[styles.menuSection, { backgroundColor: colors.surface }]}
              elevation={1}
            >
              {section.items.map((item, itemIndex) =>
                renderMenuItem(item, itemIndex, itemIndex === section.items.length - 1)
              )}
            </Surface>
          </View>
        ))}
      </ScrollView>

      {/* Theme Modal */}
      <Portal>
        <Modal
          visible={themeModalVisible}
          onDismiss={() => setThemeModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
            Choose Theme
          </Text>
          <RadioButton.Group
            value={themeMode}
            onValueChange={(value) => {
              setThemeMode(value as 'light' | 'dark' | 'system');
              setThemeModalVisible(false);
            }}
          >
            <TouchableOpacity
              style={styles.radioItem}
              onPress={() => {
                setThemeMode('light');
                setThemeModalVisible(false);
              }}
            >
              <MaterialCommunityIcons
                name="weather-sunny"
                size={24}
                color={colors.onSurface}
              />
              <Text style={{ color: colors.onSurface, flex: 1, marginLeft: 12 }}>
                Light
              </Text>
              <RadioButton value="light" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioItem}
              onPress={() => {
                setThemeMode('dark');
                setThemeModalVisible(false);
              }}
            >
              <MaterialCommunityIcons
                name="weather-night"
                size={24}
                color={colors.onSurface}
              />
              <Text style={{ color: colors.onSurface, flex: 1, marginLeft: 12 }}>
                Dark
              </Text>
              <RadioButton value="dark" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioItem}
              onPress={() => {
                setThemeMode('system');
                setThemeModalVisible(false);
              }}
            >
              <MaterialCommunityIcons
                name="cellphone"
                size={24}
                color={colors.onSurface}
              />
              <Text style={{ color: colors.onSurface, flex: 1, marginLeft: 12 }}>
                System Default
              </Text>
              <RadioButton value="system" />
            </TouchableOpacity>
          </RadioButton.Group>
        </Modal>
      </Portal>

      {/* Currency Modal */}
      <Portal>
        <Modal
          visible={currencyModalVisible}
          onDismiss={() => {
            setCurrencyModalVisible(false);
            setCurrencySearch('');
          }}
          contentContainerStyle={[styles.modal, styles.currencyModal, { backgroundColor: colors.surface }]}
        >
          <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 12 }}>
            Choose Currency
          </Text>
          <TextInput
            placeholder="Search currency..."
            value={currencySearch}
            onChangeText={setCurrencySearch}
            mode="outlined"
            dense
            left={<TextInput.Icon icon="magnify" />}
            right={currencySearch ? <TextInput.Icon icon="close" onPress={() => setCurrencySearch('')} /> : null}
            style={{ marginBottom: 12 }}
          />
          <ScrollView style={styles.currencyList}>
            {filteredCurrencies.map((curr) => (
              <TouchableOpacity
                key={curr.code}
                style={[
                  styles.currencyItem,
                  currency === curr.code && { backgroundColor: colors.primaryContainer },
                ]}
                onPress={async () => {
                  await updateCurrency(curr.code);
                  setCurrencyModalVisible(false);
                  setCurrencySearch('');
                }}
                disabled={isCurrencyUpdating}
              >
                <Text style={{ color: colors.onSurface, fontSize: 18, width: 40 }}>
                  {curr.symbol}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.onSurface }}>{curr.code}</Text>
                  <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
                    {curr.label}
                  </Text>
                </View>
                {currency === curr.code && (
                  <MaterialCommunityIcons
                    name="check"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
            {filteredCurrencies.length === 0 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.onSurfaceVariant }}>No currencies found</Text>
              </View>
            )}
          </ScrollView>
          <Button mode="text" onPress={() => {
            setCurrencyModalVisible(false);
            setCurrencySearch('');
          }}>
            Cancel
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  editProfileButton: {
    padding: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuSection: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  themePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  currencyModal: {
    maxHeight: '70%',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  currencyList: {
    maxHeight: 400,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
});
