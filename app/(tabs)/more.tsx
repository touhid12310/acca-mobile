import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Text,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Bell,
  Building2,
  Calendar,
  ChevronRight,
  CreditCard,
  Download,
  Flag,
  HelpCircle,
  Info,
  LogOut,
  Mail,
  Moon,
  Palette,
  Search,
  Shield,
  Smartphone,
  Sun,
  Tags,
  Target,
  LucideIcon,
  X,
  Check,
  DollarSign,
} from "lucide-react-native";

import { useAuth } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useCurrency } from "../../src/contexts/CurrencyContext";
import {
  ScreenHeader,
  Card,
  IconBadge,
  Button,
  ConfirmDialog,
  HeroCard,
} from "../../src/components/ui";
import { getInitials } from "../../src/utils/format";
import { radius, shadow, spacing } from "../../src/constants/theme";

type MenuItem = {
  icon: LucideIcon;
  label: string;
  description?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
  tone?: "primary" | "success" | "danger" | "warning" | "info" | "neutral";
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { currency, availableCurrencies, updateCurrency, isCurrencyUpdating } =
    useCurrency();

  const [themeModal, setThemeModal] = useState(false);
  const [currencyModal, setCurrencyModal] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");

  const filteredCurrencies = availableCurrencies.filter(
    (curr) =>
      curr.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      curr.label.toLowerCase().includes(currencySearch.toLowerCase()),
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const menuSections: MenuSection[] = [
    {
      title: "Finance Management",
      items: [
        {
          icon: Building2,
          label: "Accounts",
          description: "Manage your bank accounts",
          onPress: () => router.push("/accounts"),
          tone: "primary",
        },
        {
          icon: Target,
          label: "Budgets",
          description: "Set and track budgets",
          onPress: () => router.push("/budgets"),
          tone: "info",
        },
        {
          icon: Flag,
          label: "Goals",
          description: "Savings goals tracker",
          onPress: () => router.push("/goals"),
          tone: "success",
        },
        {
          icon: CreditCard,
          label: "Loans",
          description: "Track loan payments",
          onPress: () => router.push("/loans"),
          tone: "warning",
        },
        {
          icon: Calendar,
          label: "Schedules",
          description: "Recurring bills reminder",
          onPress: () => router.push("/schedules"),
          tone: "primary",
        },
        {
          icon: Tags,
          label: "Categories",
          description: "Manage transaction categories",
          onPress: () => router.push("/categories"),
          tone: "neutral",
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: Palette,
          label: "Theme",
          description:
            themeMode === "system"
              ? "System default"
              : themeMode === "dark"
                ? "Dark mode"
                : "Light mode",
          onPress: () => setThemeModal(true),
          tone: "primary",
        },
        {
          icon: DollarSign,
          label: "Currency",
          description: currency,
          onPress: () => setCurrencyModal(true),
          tone: "success",
        },
        {
          icon: Bell,
          label: "Notifications",
          description: "Manage notification settings",
          onPress: () => {},
          tone: "warning",
        },
      ],
    },
    {
      title: "Security & Privacy",
      items: [
        {
          icon: Shield,
          label: "Login Activity",
          description: "Manage active sessions",
          onPress: () => router.push("/sessions"),
          tone: "info",
        },
        {
          icon: Download,
          label: "Export Data",
          description: "Download your data",
          onPress: () => {},
          tone: "neutral",
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: HelpCircle,
          label: "Help & FAQ",
          onPress: () => {},
          tone: "neutral",
        },
        {
          icon: Mail,
          label: "Contact Support",
          onPress: () => {},
          tone: "neutral",
        },
        {
          icon: Info,
          label: "About",
          description: "Version 1.0.0",
          onPress: () => {},
          tone: "neutral",
        },
      ],
    },
    {
      title: "",
      items: [
        {
          icon: LogOut,
          label: "Logout",
          onPress: () => setLogoutConfirm(true),
          destructive: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={{ paddingHorizontal: spacing.lg }}>
        <ScreenHeader title="More" subtitle="Settings & tools" />
      </View>

      <ScrollView
        style={{ backgroundColor: "transparent" }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Pressable onPress={() => router.push("/profile")}>
          <HeroCard style={styles.profileCard}>
            {(user as any)?.profile_picture_url ? (
              <Image
                source={{ uri: (user as any).profile_picture_url }}
                style={styles.profileAvatar}
              />
            ) : (
              <View style={styles.profileAvatarFallback}>
                <Text style={styles.profileAvatarText}>
                  {getInitials(user?.name || "User")}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.name || "User"}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email || "No email"}
              </Text>
            </View>
            <ChevronRight size={22} color="#ffffff" strokeWidth={2.2} />
          </HeroCard>
        </Pressable>

        {/* Menu Sections */}
        {menuSections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            {section.title && (
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {section.title}
              </Text>
            )}
            <Card variant="elevated" padding={0} radiusSize="xl">
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const isLast = itemIdx === section.items.length - 1;
                return (
                  <Pressable
                    key={item.label}
                    onPress={item.onPress}
                    disabled={!item.onPress}
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.menuItem,
                          {
                            borderBottomColor: colors.outlineVariant,
                            borderBottomWidth: isLast
                              ? 0
                              : StyleSheet.hairlineWidth,
                            opacity: pressed ? 0.6 : 1,
                          },
                        ]}
                      >
                        <IconBadge
                          icon={Icon}
                          tone={
                            item.destructive ? "danger" : item.tone || "primary"
                          }
                          size="sm"
                          shape="rounded"
                        />
                        <View style={styles.menuItemContent}>
                          <Text
                            style={[
                              styles.menuLabel,
                              {
                                color: item.destructive
                                  ? colors.error
                                  : colors.onSurface,
                              },
                            ]}
                          >
                            {item.label}
                          </Text>
                          {item.description && (
                            <Text
                              style={[
                                styles.menuDescription,
                                { color: colors.onSurfaceVariant },
                              ]}
                            >
                              {item.description}
                            </Text>
                          )}
                        </View>
                        {item.rightElement ?? (
                          <ChevronRight
                            size={18}
                            color={colors.onSurfaceVariant}
                            strokeWidth={2}
                          />
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </Card>
          </View>
        ))}
      </ScrollView>

      {/* Theme Modal */}
      <Modal
        visible={themeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setThemeModal(false)}
        >
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: colors.surface },
              shadow.lg,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: colors.onSurface }]}>
              Choose theme
            </Text>
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System default", icon: Smartphone },
            ].map(({ value, label, icon: Icon }) => {
              const selected = themeMode === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    setThemeMode(value as any);
                    setThemeModal(false);
                  }}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.radioRow,
                        {
                          backgroundColor: selected
                            ? colors.primaryContainer
                            : "transparent",
                          opacity: pressed ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Icon
                        size={20}
                        color={selected ? colors.primary : colors.onSurface}
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.radioLabel,
                          {
                            color: selected ? colors.primary : colors.onSurface,
                            fontWeight: selected ? "700" : "500",
                          },
                        ]}
                      >
                        {label}
                      </Text>
                      {selected && (
                        <Check
                          size={18}
                          color={colors.primary}
                          strokeWidth={2.4}
                        />
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={currencyModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCurrencyModal(false);
          setCurrencySearch("");
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setCurrencyModal(false);
            setCurrencySearch("");
          }}
        >
          <Pressable
            style={[
              styles.sheet,
              styles.currencySheet,
              { backgroundColor: colors.surface },
              shadow.lg,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: colors.onSurface }]}>
              Choose currency
            </Text>

            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <Search
                size={18}
                color={colors.onSurfaceVariant}
                strokeWidth={2}
              />
              <TextInput
                placeholder="Search currency"
                placeholderTextColor={colors.onSurfaceVariant}
                value={currencySearch}
                onChangeText={setCurrencySearch}
                style={[styles.searchInput, { color: colors.onSurface }]}
              />
              {currencySearch.length > 0 && (
                <Pressable onPress={() => setCurrencySearch("")} hitSlop={8}>
                  <X
                    size={16}
                    color={colors.onSurfaceVariant}
                    strokeWidth={2}
                  />
                </Pressable>
              )}
            </View>

            <ScrollView style={styles.currencyList}>
              {filteredCurrencies.map((curr) => {
                const selected = currency === curr.code;
                return (
                  <Pressable
                    key={curr.code}
                    onPress={async () => {
                      await updateCurrency(curr.code);
                      setCurrencyModal(false);
                      setCurrencySearch("");
                    }}
                    disabled={isCurrencyUpdating}
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.currencyRow,
                          {
                            backgroundColor: selected
                              ? colors.primaryContainer
                              : "transparent",
                            opacity: pressed ? 0.6 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.currencySymbol,
                            { color: colors.onSurface },
                          ]}
                        >
                          {curr.symbol}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.currencyCode,
                              {
                                color: selected
                                  ? colors.primary
                                  : colors.onSurface,
                              },
                            ]}
                          >
                            {curr.code}
                          </Text>
                          <Text
                            style={[
                              styles.currencyLabel,
                              { color: colors.onSurfaceVariant },
                            ]}
                            numberOfLines={1}
                          >
                            {curr.label}
                          </Text>
                        </View>
                        {selected && (
                          <Check
                            size={20}
                            color={colors.primary}
                            strokeWidth={2.4}
                          />
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
              {filteredCurrencies.length === 0 && (
                <View style={{ padding: spacing.xl, alignItems: "center" }}>
                  <Text style={{ color: colors.onSurfaceVariant }}>
                    No currencies found
                  </Text>
                </View>
              )}
            </ScrollView>
            <Button
              label="Close"
              variant="secondary"
              fullWidth
              onPress={() => {
                setCurrencyModal(false);
                setCurrencySearch("");
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={logoutConfirm}
        title="Logout?"
        message="You'll need to sign in again to access your account."
        icon={LogOut}
        confirmLabel="Logout"
        onCancel={() => setLogoutConfirm(false)}
        onConfirm={() => {
          setLogoutConfirm(false);
          handleLogout();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
  },
  profileAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  profileName: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  profileEmail: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginLeft: spacing.xs,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuItemContent: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  menuDescription: {
    fontSize: 12.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.xxl,
    gap: spacing.sm,
    minWidth: 300,
    maxWidth: 420,
    alignSelf: "stretch",
  },
  currencySheet: {
    maxHeight: "80%",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  radioLabel: {
    flex: 1,
    fontSize: 15,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    height: 46,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  currencyList: {
    maxHeight: 400,
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
    marginBottom: 2,
  },
  currencySymbol: {
    fontSize: 17,
    fontWeight: "700",
    width: 36,
  },
  currencyCode: {
    fontSize: 14,
    fontWeight: "700",
  },
  currencyLabel: {
    fontSize: 12,
    marginTop: 1,
  },
  confirmCard: {
    margin: spacing.xl,
    padding: spacing.xxl,
    borderRadius: radius.xxl,
    alignItems: "center",
    gap: spacing.md,
    maxWidth: 400,
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  confirmText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    alignSelf: "stretch",
  },
});
