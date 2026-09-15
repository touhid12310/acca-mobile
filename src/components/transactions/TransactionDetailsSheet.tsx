import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { Copy, FileText, Mail, Pencil, Trash2, X } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useToast } from "../../contexts/NotificationContext";
import { Badge } from "../ui";
import { spacing } from "../../constants/theme";
import transactionService, {
  InboundEmailBody,
} from "../../services/transactionService";
import { formatDate } from "../../utils/date";
import { getAmountSign } from "../../utils/transactions";
import { Transaction, TransactionType } from "../../types";

type Colors = ReturnType<typeof useTheme>["colors"];

type EmailBodyState = {
  loading: boolean;
  data: InboundEmailBody | null;
  error: string | null;
} | null;

interface Props {
  visible: boolean;
  /** Row data from the list; the sheet fetches the full record itself. */
  transaction: Transaction | null;
  onClose: () => void;
  /** Called after the sheet closes. */
  onEdit: (transaction: Transaction) => void;
  /** Called after the sheet closes. */
  onDelete: (transaction: Transaction) => void;
  deleteLabel?: string;
}

const getTone = (type: TransactionType) => {
  switch (type) {
    case "income":
      return "success" as const;
    case "expense":
      return "danger" as const;
    case "transfer":
      return "primary" as const;
    case "asset":
      return "success" as const;
    case "liability":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
};

/** One label/value line in the details sheet. */
function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: Colors;
}) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.outlineVariant }]}>
      <Text style={[styles.detailRowLabel, { color: colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text style={[styles.detailRowValue, { color: colors.onSurface }]}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Transaction details bottom sheet — mirrors the web view modal. Shared by the
 * Transactions tab and the account screen so both show exactly the same thing.
 */
export default function TransactionDetailsSheet({
  visible,
  transaction,
  onClose,
  onEdit,
  onDelete,
  deleteLabel = "Archive",
}: Props) {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [fullTransaction, setFullTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  // Fetched on demand rather than with the list: bodies are large and most
  // drafts are never opened.
  const [emailBody, setEmailBody] = useState<EmailBodyState>(null);

  // The list payload is trimmed, so pull the full record (items, receipt,
  // categories) before showing it — same detail the web modal renders.
  const transactionId = transaction?.id;
  useEffect(() => {
    setFullTransaction(null);
    setEmailBody(null);
    if (!visible || !transactionId) return;

    let cancelled = false;
    setLoading(true);
    transactionService
      .getById(transactionId)
      .then((result) => {
        if (cancelled || !result.success || !result.data) return;
        const payload = result.data as any;
        setFullTransaction((payload?.data ?? payload) as Transaction);
      })
      .catch(() => {
        // Keep the row data already on screen rather than blanking the sheet.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, transactionId]);

  const loadEmailBody = async (id: number) => {
    setEmailBody({ loading: true, data: null, error: null });
    try {
      const response = await transactionService.getEmailBody(id);
      const payload = (response.data as any)?.data ?? response.data;
      if (!response.success || !payload) {
        throw new Error((response.data as any)?.message || "Could not load the email.");
      }
      setEmailBody({ loading: false, data: payload as InboundEmailBody, error: null });
    } catch (error) {
      setEmailBody({
        loading: false,
        data: null,
        error: error instanceof Error ? error.message : "Could not load the email.",
      });
    }
  };

  const getAmountColor = (type: TransactionType) => {
    switch (type) {
      case "income":
        return colors.tertiary;
      case "expense":
        return colors.error;
      case "transfer":
        return colors.primary;
      default:
        return colors.onSurface;
    }
  };

  const detail = fullTransaction ?? transaction;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.detailBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.detailSheet,
            {
              backgroundColor: colors.surface,
              // Clear the gesture bar, or the pinned actions sit under it.
              paddingBottom: 20 + insets.bottom,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.detailGrabber}>
            <View style={[styles.detailGrabberBar, { backgroundColor: colors.outlineVariant }]} />
          </View>

          <View style={styles.detailHeader}>
            <Text style={[styles.detailTitle, { color: colors.onSurface }]}>
              Transaction details
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {detail && (
            <>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing.sm }}
              >
                {/* Headline amount */}
                <View style={styles.detailAmountBlock}>
                  <Text style={[styles.detailAmount, { color: getAmountColor(detail.type) }]}>
                    {getAmountSign(detail)}
                    {formatAmount(parseFloat(String(detail.amount)) || 0)}
                  </Text>
                  <Text style={[styles.detailMerchant, { color: colors.onSurface }]}>
                    {detail.merchant_name || detail.description || "Transaction"}
                  </Text>
                  <View style={styles.detailBadgeRow}>
                    <Badge
                      label={detail.type.charAt(0).toUpperCase() + detail.type.slice(1)}
                      tone={getTone(detail.type)}
                      size="sm"
                    />
                    {detail.status && detail.status !== "approved" && (
                      <Badge label={detail.status.replace("_", " ")} tone="warning" size="sm" />
                    )}
                    {!!detail.source && (
                      <Badge label={detail.source} tone="neutral" size="sm" />
                    )}
                  </View>
                </View>

                {loading && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginBottom: spacing.md }}
                  />
                )}

                {/* Field rows */}
                <DetailRow label="Date" value={formatDate(detail.date)} colors={colors} />
                <DetailRow
                  label={detail.type === "transfer" ? "Transfer" : "Account"}
                  value={
                    (detail as any).payment_method_account?.account_name ||
                    (detail as any).account?.account_name ||
                    "-"
                  }
                  colors={colors}
                />
                {!!detail.transaction_categories?.length && (
                  <DetailRow
                    label="Categories"
                    value={detail.transaction_categories
                      .map((tc: any) =>
                        tc.subcategory?.name
                          ? `${tc.category?.name} > ${tc.subcategory.name}`
                          : tc.category?.name,
                      )
                      .filter(Boolean)
                      .join(", ")}
                    colors={colors}
                  />
                )}
                {!!detail.notes && (
                  <DetailRow label="Notes" value={detail.notes} colors={colors} />
                )}

                {/* Line items */}
                {!!(detail as any).items?.length && (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={[styles.detailSectionTitle, { color: colors.onSurface }]}>
                      Items
                    </Text>
                    {(detail as any).items.map((item: any, index: number) => (
                      <View
                        key={item.id ?? index}
                        style={[styles.detailItemRow, { borderBottomColor: colors.outlineVariant }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.onSurface }}>{item.name}</Text>
                          <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
                            {item.quantity} x {formatAmount(parseFloat(String(item.price)) || 0)}
                          </Text>
                        </View>
                        <Text style={{ color: colors.onSurface, fontWeight: "600" }}>
                          {formatAmount(parseFloat(String(item.total)) || 0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Source files. The email button toggles, so the row keeps
                    both slots and the body opens full width underneath. */}
                {(detail.source === "email" || !!detail.receipt_file) && (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={[styles.detailSectionTitle, { color: colors.onSurface }]}>
                      Original
                    </Text>

                    <View style={styles.detailFileRow}>
                      {detail.source === "email" && (
                        <Pressable
                          style={[
                            styles.detailReceiptButton,
                            styles.detailFileButton,
                            { borderColor: colors.outlineVariant },
                          ]}
                          onPress={() =>
                            emailBody ? setEmailBody(null) : loadEmailBody(detail.id)
                          }
                        >
                          <Mail size={18} color={colors.primary} />
                          <Text style={[styles.detailFileLabel, { color: colors.primary }]}>
                            {emailBody ? "Hide email" : "Email text"}
                          </Text>
                        </Pressable>
                      )}

                      {!!detail.receipt_file && (
                        <Pressable
                          style={[
                            styles.detailReceiptButton,
                            styles.detailFileButton,
                            { borderColor: colors.outlineVariant },
                          ]}
                          onPress={() => WebBrowser.openBrowserAsync(String(detail.receipt_file))}
                        >
                          <FileText size={18} color={colors.primary} />
                          <Text style={[styles.detailFileLabel, { color: colors.primary }]}>
                            Receipt
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {emailBody?.loading && (
                      <Text style={{ color: colors.onSurfaceVariant, marginTop: spacing.sm }}>
                        Loading the email…
                      </Text>
                    )}

                    {emailBody?.error && (
                      <Text style={{ color: colors.error, marginTop: spacing.sm }}>
                        {emailBody.error}
                      </Text>
                    )}

                    {emailBody?.data && (
                      <View style={{ marginTop: spacing.sm }}>
                        <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
                          {emailBody.data.from || "Unknown sender"}
                          {emailBody.data.attachment_count > 0
                            ? ` · ${emailBody.data.attachment_count} attachment${emailBody.data.attachment_count > 1 ? "s" : ""} not shown`
                            : ""}
                        </Text>

                        {emailBody.data.body_text ? (
                          <>
                            <ScrollView
                              style={[
                                styles.emailBodyBox,
                                {
                                  borderColor: colors.outlineVariant,
                                  backgroundColor: colors.surfaceVariant,
                                },
                              ]}
                              nestedScrollEnabled
                            >
                              <Text style={[styles.emailBodyText, { color: colors.onSurface }]}>
                                {emailBody.data.body_text}
                              </Text>
                            </ScrollView>
                            <Pressable
                              style={[
                                styles.detailReceiptButton,
                                { borderColor: colors.outlineVariant, marginTop: spacing.sm },
                              ]}
                              onPress={async () => {
                                await Clipboard.setStringAsync(String(emailBody.data?.body_text));
                                toast.success("Email text copied.");
                              }}
                            >
                              <Copy size={18} color={colors.primary} />
                              <Text style={{ color: colors.primary, marginLeft: 8 }}>
                                Copy text
                              </Text>
                            </Pressable>
                          </>
                        ) : (
                          <Text style={{ color: colors.onSurfaceVariant, marginTop: spacing.xs }}>
                            This email had no readable text — probably an attachment only.
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Pinned below the scroll area: these are the reason the
                  sheet is open, so they must never need scrolling to reach. */}
              <View style={styles.detailActions}>
                <Pressable
                  style={[styles.detailActionButton, { backgroundColor: colors.primaryContainer }]}
                  onPress={() => {
                    const target = detail;
                    onClose();
                    onEdit(target);
                  }}
                >
                  <Pencil size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, marginLeft: 8, fontWeight: "600" }}>
                    Edit
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.detailActionButton, { backgroundColor: `${colors.error}1f` }]}
                  onPress={() => {
                    const target = detail;
                    onClose();
                    onDelete(target);
                  }}
                >
                  <Trash2 size={18} color={colors.error} />
                  <Text style={{ color: colors.error, marginLeft: 8, fontWeight: "600" }}>
                    {deleteLabel}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  detailBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  detailSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    // paddingBottom is applied inline: it has to include the safe-area inset.
  },
  detailGrabber: { alignItems: "center", paddingVertical: 10 },
  detailGrabberBar: { width: 42, height: 4, borderRadius: 999 },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  detailTitle: { fontSize: 17, fontWeight: "700" },
  detailAmountBlock: { alignItems: "center", marginBottom: 18 },
  detailAmount: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  detailMerchant: { fontSize: 15, fontWeight: "600", marginTop: 4 },
  detailBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
    justifyContent: "center",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailRowLabel: { fontSize: 13, flexShrink: 0 },
  detailRowValue: { fontSize: 14, fontWeight: "500", flex: 1, textAlign: "right" },
  detailSectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emailBodyBox: {
    maxHeight: 260,
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  emailBodyText: {
    fontSize: 12.5,
    lineHeight: 19,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  detailReceiptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailFileRow: { flexDirection: "row", gap: 10 },
  detailFileButton: { flex: 1, paddingHorizontal: 8 },
  detailFileLabel: { marginLeft: 8, fontWeight: "600" },
  detailActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  detailActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
  },
});
