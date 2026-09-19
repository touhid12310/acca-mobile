import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { BadgePlus, Wallet } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/NotificationContext";
import { AccountTypePicker, Button, IconBadge, Input } from "../ui";
import { radius, shadow, spacing } from "../../constants/theme";
import accountService from "../../services/accountService";
import analyticsService from "../../services/analyticsService";

/**
 * Blocks the add-transaction screen until the user has at least one account —
 * every transaction is posted against one. The account is created right here
 * (not on /accounts) so the transaction form, and anything prefilled into it
 * (chat preview, receipt scan), stays intact underneath.
 *
 * Uses its own ['accounts', 'gate'] key: the ['accounts'] cache is shared by
 * screens that shape the response differently. Invalidating ['accounts'] after
 * any account create still refreshes it (prefix match).
 */
export default function NoAccountGate() {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [type, setType] = useState("Cash");
  const [created, setCreated] = useState(false);

  const { data: accountCount } = useQuery({
    queryKey: ["accounts", "gate"],
    queryFn: async (): Promise<number | null> => {
      const result = await accountService.getAll();
      // Unknown (offline / server error) → null → never block the form.
      if (!result.success || !result.data) return null;
      const payload = result.data as any;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.data)
            ? payload.data.data
            : null;
      return list ? list.length : null;
    },
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await accountService.create({
        account_name: name.trim(),
        type,
        current_balance: parseFloat(balance) || 0,
      });
      if (!result.success) {
        const res = result as any;
        throw new Error(
          res.data?.message || res.error || "Could not create account",
        );
      }
      return result;
    },
    onSuccess: () => {
      // The backend makes a user's first account the default.
      setCreated(true);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      analyticsService.logEvent("account_created", {
        source: "transaction_gate",
        type,
      });
      toast.success(`${name.trim()} created — now add your transaction`);
    },
    onError: (error: Error) =>
      toast.error(error.message || "Could not create account"),
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter an account name");
      return;
    }
    createMutation.mutate();
  };

  const leave = () => router.back();

  return (
    <Modal
      visible={accountCount === 0 && !created}
      transparent
      animationType="fade"
      onRequestClose={leave}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View
          style={[styles.sheet, { backgroundColor: colors.surface }, shadow.lg]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <View style={styles.header}>
              <IconBadge icon={Wallet} tone="primary" size="lg" shape="rounded" />
              <Text style={[styles.title, { color: colors.onSurface }]}>
                Create an account first
              </Text>
              <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>
                Every transaction belongs to an account — cash, a bank account,
                a card or a wallet. Add your first one to start recording
                transactions.
              </Text>
            </View>

            <Input
              label="Account name"
              placeholder="e.g. Cash, Main bank"
              value={name}
              onChangeText={setName}
            />
            <Input
              label="Current balance"
              placeholder="0.00"
              value={balance}
              onChangeText={setBalance}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
              Account type
            </Text>
            <AccountTypePicker value={type} onChange={setType} />

            <View style={styles.buttons}>
              <View style={styles.buttonCell}>
                <Button
                  label="Not now"
                  variant="secondary"
                  onPress={leave}
                  disabled={createMutation.isPending}
                  fullWidth
                />
              </View>
              <View style={styles.buttonCell}>
                <Button
                  label="Create"
                  variant="primary"
                  icon={BadgePlus}
                  onPress={handleCreate}
                  loading={createMutation.isPending}
                  fullWidth
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    // Overlay scrim — not a themed surface.
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderRadius: radius.xl,
    maxHeight: "90%",
    overflow: "hidden",
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  buttons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  buttonCell: {
    flex: 1,
  },
});
