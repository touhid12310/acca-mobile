import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  Banknote,
  Building2,
  CircleEllipsis,
  CreditCard,
  HandCoins,
  Landmark,
  LucideIcon,
  PiggyBank,
  Smartphone,
  TrendingUp,
  WalletCards,
} from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";

// Values match the backend `type` strings. Single source for every picker.
export const accountTypeOptions: {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { value: "Cash", label: "Cash", icon: Banknote, color: "#10B981" },
  {
    value: "Bank Account",
    label: "Bank Account",
    icon: Landmark,
    color: "#3B82F6",
  },
  {
    value: "Savings Account",
    label: "Savings",
    icon: PiggyBank,
    color: "#14B8A6",
  },
  {
    value: "Credit Card",
    label: "Credit Card",
    icon: CreditCard,
    color: "#EF4444",
  },
  {
    value: "Mobile Banking/e-Wallet",
    label: "e-Wallet",
    icon: Smartphone,
    color: "#EC4899",
  },
  { value: "Loan Account", label: "Loan", icon: HandCoins, color: "#F59E0B" },
  {
    value: "Investment Account",
    label: "Investment",
    icon: TrendingUp,
    color: "#8B5CF6",
  },
  {
    value: "Digital Bank Account",
    label: "Digital Bank",
    icon: Building2,
    color: "#6366F1",
  },
  {
    value: "Prepaid Card",
    label: "Prepaid",
    icon: WalletCards,
    color: "#F97316",
  },
  { value: "Other", label: "Other", icon: CircleEllipsis, color: "#64748B" },
];

const COLUMNS = 3;

interface AccountTypePickerProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Account type grid — same visual language as the category Type buttons:
 * tinted fill + coloured border on the selected tile. TouchableOpacity with a
 * static style (as on the categories screen): Pressable tiles here rendered
 * with no background/border on Android after the RN 0.86 upgrade.
 */
export function AccountTypePicker({ value, onChange }: AccountTypePickerProps) {
  const { colors } = useTheme();

  const rows: (typeof accountTypeOptions)[] = [];
  for (let i = 0; i < accountTypeOptions.length; i += COLUMNS) {
    rows.push(accountTypeOptions.slice(i, i + COLUMNS));
  }

  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((opt) => {
            const active = value === opt.value;
            const Icon = opt.icon;
            const fg = active ? opt.color : colors.onSurfaceVariant;
            return (
              <TouchableOpacity
                key={opt.value}
                activeOpacity={0.8}
                onPress={() => onChange(opt.value)}
                style={[
                  styles.tile,
                  {
                    backgroundColor: active
                      ? `${opt.color}20`
                      : colors.surfaceVariant,
                    borderColor: active ? opt.color : "transparent",
                  },
                ]}
              >
                <Icon
                  size={18}
                  color={active ? opt.color : opt.color + "B3"}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.label,
                    { color: fg, fontWeight: active ? "700" : "500" },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          {Array.from({ length: COLUMNS - row.length }, (_, i) => (
            <View key={`spacer-${i}`} style={styles.spacer} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  spacer: {
    flex: 1,
  },
  tile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
  },
});
