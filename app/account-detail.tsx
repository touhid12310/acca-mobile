import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Pressable,
  Keyboard,
} from "react-native";
import { RectButton, Swipeable } from "react-native-gesture-handler";
import {
  Text,
  Surface,
  ActivityIndicator,
  Button,
  IconButton,
  Menu,
  Chip,
  Modal,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Archive,
  Edit3,
  Eraser,
  Star,
  Trash2,
  TriangleAlert,
  Wallet,
} from "lucide-react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import { useTheme } from "../src/contexts/ThemeContext";
import { radius, shadow, spacing } from "../src/constants/theme";
import { ConfirmDialog, HeroCard } from "../src/components/ui";
import { useCurrency } from "../src/contexts/CurrencyContext";
import { useToast } from "../src/contexts/NotificationContext";
import { BrandedHeader } from "../src/components";
import accountService from "../src/services/accountService";
import transactionService from "../src/services/transactionService";
import categoryService from "../src/services/categoryService";
import DateField from "../src/components/common/DateField";
import TransactionDetailsSheet from "../src/components/transactions/TransactionDetailsSheet";
import { getAmountSign } from "../src/utils/transactions";
import { parseDecimalInput, toDecimalInput } from "../src/utils/number";
import { parseCalendarDate } from "../src/utils/date";
import { useAuth } from "../src/contexts/AuthContext";
import { ensureAiConsent } from "../src/services/aiConsent";
import { withFlow } from "../src/services/appExitMonitor";
import { Account, Transaction } from "../src/types";
import { PaperTextInput as TextInput } from "../src/components/ui/SafeTextInput";
import { invalidateMoneyQueries } from "../src/services/moneyQueries";
import { apiErrorMessage } from "../src/utils/apiError";

interface ReconcileTransaction {
  /** Stable list key: indexes shift when a card is created or skipped (QA AE-117). */
  key: string;
  date: string;
  merchant_name: string;
  /** The statement's Description column (QA AE-125). */
  description?: string;
  amount: number;
  /** The Amount field's text as typed; parsed into a number on save. */
  amountText?: string;
  type: "income" | "expense" | "transfer";
  /** The AI's (or an auto-rule's) pick from the CSV upload, until changed. */
  category_id?: number;
  subcategory_id?: number;
  notes?: string;
  isMatched?: boolean;
  matchedData?: Transaction;
  /** Why the last Create was refused, shown on the card itself (QA AE-120). */
  rowError?: string;
}

let reconcileKeySeed = 0;
const nextReconcileKey = () => `reconcile-${Date.now()}-${(reconcileKeySeed += 1)}`;

/** Newest first; same-day rows by id, newest first (QA AE-117). */
const byDateDesc = (a: Transaction, b: Transaction) => {
  const dateA = String(a.date || (a as any).transaction_date || "").slice(0, 10);
  const dateB = String(b.date || (b as any).transaction_date || "").slice(0, 10);
  if (dateA !== dateB) return dateA < dateB ? 1 : -1;
  return (Number(b.id) || 0) - (Number(a.id) || 0);
};

/** What a card still needs before it can be created, or null when it's ready. */
const reconcileProblem = (tx: ReconcileTransaction): string | null => {
  if (!tx.merchant_name?.trim()) return "Add a merchant name.";
  if (!(getReconcileAmount(tx) > 0)) return "Enter an amount above 0.";
  if (!tx.date) return "Pick a date.";
  if (tx.type !== "transfer" && !tx.category_id) {
    return "Pick a category, then tap Create.";
  }
  return null;
};

/** Width of the Edit + Archive swipe actions (matches the Transactions tab). */
const TX_ACTION_WIDTH = 132;

const accountTypeOptions = [
  { value: "Cash", label: "Cash" },
  { value: "Bank Account", label: "Bank Account" },
  { value: "Savings Account", label: "Savings" },
  { value: "Credit Card", label: "Credit Card" },
  { value: "Mobile Banking/e-Wallet", label: "e-Wallet" },
  { value: "Loan Account", label: "Loan" },
  { value: "Investment Account", label: "Investment" },
  { value: "Digital Bank Account", label: "Digital Bank" },
  { value: "Prepaid Card", label: "Prepaid" },
  { value: "Other", label: "Other" },
];

// Plain words only: the field messages, never "Validation failed / field: …".
const formatApiError = (result: any): string => apiErrorMessage(result);

// parseDecimalInput reads the iOS comma decimal key but drops a '-', and a
// balance can be negative (credit cards, loans).
const parseBalanceInput = (text: string): number => {
  const value = parseDecimalInput(text);
  return text.trim().startsWith("-") ? -value : value;
};

// Statement amounts arrive unsigned (the type says which way the money went).
const getReconcileAmount = (tx: ReconcileTransaction): number =>
  parseDecimalInput(tx.amountText ?? String(tx.amount));

export default function AccountDetailScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Number(id);

  const [activeTab, setActiveTab] = useState<
    "transactions" | "reconcile" | "edit"
  >("transactions");
  const [formData, setFormData] = useState({
    account_name: "",
    account_type: "Bank Account",
    balance: "",
  });
  // Reconcile state
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [reconcileData, setReconcileData] = useState<ReconcileTransaction[]>(
    [],
  );
  const [matchedCount, setMatchedCount] = useState(0);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  // Category lists per transaction type, so an income card and an expense
  // card each show their own list (QA AE-120).
  const [categoriesByType, setCategoriesByType] = useState<
    Record<string, any[]>
  >({});
  // A matched card the user wants to create anyway, waiting for confirmation (QA AE-55).
  const [createAnywayKey, setCreateAnywayKey] = useState<string | null>(null);
  // Confirmation dialogs (same ConfirmDialog as Budgets / Loans / Schedules)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Transaction | null>(null);
  const [showClearReconcile, setShowClearReconcile] = useState(false);

  // Fetch account details
  const {
    data: account,
    isLoading: accountLoading,
    refetch: refetchAccount,
  } = useQuery({
    queryKey: ["account", accountId],
    queryFn: async () => {
      const result = await accountService.getById(accountId);
      if (result.success && result.data) {
        const acc = (result.data as any)?.data || result.data;
        return acc as Account;
      }
      return null;
    },
    enabled: !!accountId,
  });

  // Fetch transactions for this account
  const {
    data: transactions,
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["transactions", "account", accountId],
    queryFn: async () => {
      const result = await accountService.getTransactions(accountId);
      if (result.success && result.data) {
        const responseData = result.data as any;
        // Handle nested data structure from API: response.data.data.transactions
        let txData: any[] = [];
        if (responseData?.data?.transactions) {
          txData = responseData.data.transactions;
        } else if (responseData?.transactions) {
          txData = responseData.transactions;
        } else if (Array.isArray(responseData?.data)) {
          txData = responseData.data;
        } else if (Array.isArray(responseData)) {
          txData = responseData;
        }
        return txData;
      }
      return [];
    },
    enabled: !!accountId,
  });

  // Coming back from transaction-modal (edit) — refresh the balance and list.
  // Skips the first focus; the queries above already fetch on mount.
  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocused.current) {
        hasFocused.current = true;
        return;
      }
      refetchAccount();
      refetchTransactions();
    }, [refetchAccount, refetchTransactions]),
  );

  // The spinner follows the user's pull only, not the focus / archive
  // refetches (on iOS a programmatic refresh also shifts the list down).
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const handlePullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await refetchTransactions();
    } finally {
      setPullRefreshing(false);
    }
  }, [refetchTransactions]);

  // Newest first by date: the API orders an account's rows by id, which put
  // back-dated and imported rows in the wrong place (QA AE-117).
  const transactionsList = useMemo(
    () => (Array.isArray(transactions) ? [...transactions].sort(byDateDesc) : []),
    [transactions],
  );

  // Calculate totals
  const totalIncome = transactionsList
    .filter((t: Transaction) => t.type === "income")
    .reduce((sum: number, t: Transaction) => sum + Number(t.amount || 0), 0);

  const totalExpenses = transactionsList
    .filter((t: Transaction) => t.type === "expense")
    .reduce((sum: number, t: Transaction) => sum + Number(t.amount || 0), 0);

  const netAmount = totalIncome - totalExpenses;

  // Update form when account loads
  useEffect(() => {
    if (account) {
      setFormData({
        account_name: account.account_name || "",
        account_type: account.type || account.account_type || "Bank Account",
        balance: String(
          Number(account.current_balance) || Number(account.balance) || 0,
        ),
      });
    }
  }, [account]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await accountService.update(accountId, {
        account_name: data.account_name,
        type: data.account_type,
        current_balance: parseBalanceInput(data.balance),
      });
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      // A new balance changes Home's net worth and the reports too.
      void invalidateMoneyQueries(queryClient);
      toast.success("Account updated");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Could not update account"),
  });

  // Changing the default lives here; the Accounts list only marks the default.
  const setDefaultMutation = useMutation({
    mutationFn: async () => {
      const result = await accountService.setDefault(accountId);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      // Every cached account screen, not just this one: the previous default's
      // screen would otherwise keep showing a filled star for up to 5 minutes.
      queryClient.invalidateQueries({ queryKey: ["account"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      toast.success("Default account updated");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Could not set default account"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const result = await accountService.delete(accountId);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      setShowDeleteConfirm(false);
      void invalidateMoneyQueries(queryClient);
      toast.success("Account deleted");
      router.back();
    },
    onError: (error: Error) => {
      setShowDeleteConfirm(false);
      toast.error(error.message || "Could not delete account");
    },
  });

  // Row actions on the Transactions tab — same swipe-to-Edit/Archive as the
  // main Transactions screen. DELETE /transactions/{id} archives an approved
  // transaction; it can be restored from Transactions → Archived.
  const archiveTransactionMutation = useMutation({
    mutationFn: async (txId: number) => {
      const result = await transactionService.delete(txId);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      // Archiving a loan payment / budgeted spend rolls those trackers back,
      // so every money screen refetches.
      void invalidateMoneyQueries(queryClient);
      toast.success("Transaction moved to Archived");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Could not archive transaction"),
  });

  const swipeRefs = useRef(new Map<number, Swipeable>());
  const openRowId = useRef<number | null>(null);
  // Tapped row → details sheet (same one as the Transactions tab).
  const [detailTransaction, setDetailTransaction] =
    useState<Transaction | null>(null);

  const closeRow = (txId: number) => {
    swipeRefs.current.get(txId)?.close();
  };

  // Only one row open at a time, like the Transactions screen.
  const handleRowWillOpen = (txId: number) => {
    swipeRefs.current.forEach((row, key) => {
      if (key !== txId) row.close();
    });
    openRowId.current = txId;
  };

  const handleEditTransaction = (item: Transaction) => {
    let categoryId: number | undefined = item.category_id || item.category?.id;
    let subcategoryId: number | undefined =
      item.subcategory_id || item.subcategory?.id;

    if (item.transaction_categories && item.transaction_categories.length > 0) {
      const primary = item.transaction_categories[0];
      categoryId = primary.category_id;
      subcategoryId = primary.subcategory_id;
    }

    const txAccountId =
      item.payment_method || item.account_id || item.account?.id || accountId;

    router.push({
      pathname: "/transaction-modal",
      params: {
        id: item.id.toString(),
        type: item.type,
        amount: item.amount.toString(),
        merchant_name: item.merchant_name || "",
        description: item.description || "",
        category_id: categoryId?.toString() || "",
        subcategory_id: subcategoryId?.toString() || "",
        account_id: txAccountId?.toString() || "",
        notes: item.notes || "",
        date: item.date,
      },
    });
  };

  const handleArchiveTransaction = (item: Transaction) => {
    setArchiveTarget(item);
  };

  const handleConfirmArchive = () => {
    if (archiveTarget) archiveTransactionMutation.mutate(archiveTarget.id);
    setArchiveTarget(null);
  };

  const handleRowPress = (item: Transaction) => {
    // A tap on an open row just closes it; otherwise it opens the details
    // sheet, like the Transactions tab (edit/archive stay on the swipe too).
    if (openRowId.current === item.id) {
      closeRow(item.id);
      return;
    }
    setDetailTransaction(item);
  };

  const renderTxActions = (item: Transaction) => (
    <View style={[styles.txActions, { backgroundColor: colors.error }]}>
      <RectButton
        onPress={() => {
          closeRow(item.id);
          handleEditTransaction(item);
        }}
        rippleColor="rgba(255,255,255,0.2)"
        style={[styles.txAction, { backgroundColor: colors.primary }]}
      >
        <Edit3 size={20} color="#ffffff" strokeWidth={2.4} />
        <Text style={styles.txActionLabel}>Edit</Text>
      </RectButton>
      <RectButton
        onPress={() => {
          closeRow(item.id);
          handleArchiveTransaction(item);
        }}
        rippleColor="rgba(255,255,255,0.2)"
        style={[styles.txAction, { backgroundColor: colors.error }]}
      >
        <Trash2 size={20} color="#ffffff" strokeWidth={2.4} />
        <Text style={styles.txActionLabel}>Archive</Text>
      </RectButton>
    </View>
  );

  const handleSave = () => {
    if (!formData.account_name.trim()) {
      toast.error("Please enter an account name");
      return;
    }
    updateMutation.mutate(formData);
  };

  const handleDelete = () => {
    // The iOS keyboard stays up over a Modal and would cover the dialog's buttons.
    Keyboard.dismiss();
    if (transactionsList.length > 0) {
      toast.error(
        "Remove or reassign all transactions before deleting this account.",
      );
      return;
    }
    setShowDeleteConfirm(true);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "income":
        return "arrow-down";
      case "expense":
        return "arrow-up";
      case "transfer":
        return "swap-horizontal";
      default:
        return "cash";
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "income":
        return colors.tertiary;
      case "expense":
        return colors.error;
      case "transfer":
        return colors.primary;
      default:
        return colors.onSurfaceVariant;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = parseCalendarDate(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Reconcile functions

  // One list per type, loaded once and kept; an income card and an expense
  // card never share (or overwrite) each other's list (QA AE-120).
  const ensureCategories = useCallback(
    async (type: string) => {
      if (!type || type === "transfer" || categoriesByType[type]) return;
      try {
        const result = await categoryService.getForTransaction({ type });
        if (result.success && result.data) {
          const data = (result.data as any)?.data || result.data;
          setCategoriesByType((prev) => ({
            ...prev,
            [type]: Array.isArray(data) ? data : [],
          }));
        }
      } catch {
        // The card says "No categories yet"; picking a type again retries.
      }
    },
    [categoriesByType],
  );

  const updateReconcileRow = (
    key: string,
    change: (row: ReconcileTransaction) => ReconcileTransaction,
  ) =>
    setReconcileData((prev) =>
      prev.map((row) => (row.key === key ? change(row) : row)),
    );

  const removeReconcileRow = (key: string) =>
    setReconcileData((prev) => prev.filter((row) => row.key !== key));

  const handlePickCsv = async () => {
    Keyboard.dismiss();
    // The statement rows are categorised by Gemini on the server.
    if (!(await ensureAiConsent(user?.id))) return;
    try {
      const result = await withFlow("file picker", () =>
        DocumentPicker.getDocumentAsync({
          type: ["text/csv", "text/comma-separated-values", "application/csv"],
          copyToCacheDirectory: true,
        }),
      );

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      setIsProcessingCsv(true);

      const response = await transactionService.processCsv({
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "text/csv",
      });

      if (response.success && response.data) {
        const body = response.data as any;
        const csvData = body?.data || response.data;

        // The upload answers with every category the AI could pick from;
        // reuse it so each card's list (and its pre-picked chip) shows
        // straight away.
        const uploaded: any[] = Array.isArray(body?.categories)
          ? body.categories
          : [];
        if (uploaded.length > 0) {
          const grouped: Record<string, any[]> = {};
          uploaded.forEach((category) => {
            const type = String(category?.type || "").toLowerCase();
            if (!type) return;
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(category);
          });
          setCategoriesByType((prev) => ({ ...prev, ...grouped }));
        }

        const positiveId = (value: unknown) => {
          const id = Number(value);
          return Number.isFinite(id) && id > 0 ? id : undefined;
        };

        const bankTransactions: ReconcileTransaction[] = (
          Array.isArray(csvData) ? csvData : []
        ).map((tx: any) => {
          const description = String(tx.description || "").trim();
          const merchant = String(
            tx.merchant_name || tx.payee || description || "",
          ).trim();
          return {
            key: nextReconcileKey(),
            date: tx.date || "",
            merchant_name: merchant,
            // Shown on the card and saved as the description, so a row
            // named after the payee still says what it was (QA AE-125).
            description:
              description && description !== merchant ? description : "",
            amount: parseFloat(tx.amount) || 0,
            type: tx.type || "expense",
            // Keep the AI's / the auto-rule's category pick (QA AE-120).
            category_id: positiveId(tx.category_id),
            subcategory_id: positiveId(tx.subcategory_id),
            notes: tx.notes || tx.reference || "",
            isMatched: false,
          };
        });

        // Match with existing account transactions
        const existingTx = transactionsList || [];
        let matched = 0;
        let unmatched = 0;

        const remainingExisting = [...existingTx];
        const matchedData = bankTransactions.map((bankTx) => {
          const matchIndex = remainingExisting.findIndex(
            (accTx: Transaction) => {
              const bankDate = bankTx.date?.split("T")[0];
              const accDate = (accTx.date || "").split("T")[0];
              const amountMatch =
                Math.abs(
                  Math.abs(Number(accTx.amount)) - Math.abs(bankTx.amount),
                ) < 0.01;
              const dateMatch = bankDate === accDate;
              const merchantMatch =
                bankTx.merchant_name?.toLowerCase() ===
                accTx.merchant_name?.toLowerCase();
              const directionFor = (tx: any) => {
                if (tx.balance_direction) return tx.balance_direction;
                if (tx.type === "income" || tx.type === "liability")
                  return "credit";
                if (tx.type === "expense" || tx.type === "asset")
                  return "debit";
                return null;
              };
              const bankDirection = directionFor(bankTx);
              const accountDirection = directionFor(accTx);
              const directionMatch =
                !bankDirection ||
                !accountDirection ||
                bankDirection === accountDirection;
              return (
                dateMatch && amountMatch && merchantMatch && directionMatch
              );
            },
          );

          if (matchIndex !== -1) {
            const match = remainingExisting.splice(matchIndex, 1)[0];
            matched++;
            return { ...bankTx, isMatched: true, matchedData: match };
          } else {
            unmatched++;
            return bankTx;
          }
        });

        setReconcileData(matchedData);
        setMatchedCount(matched);
        setUnmatchedCount(unmatched);

        // Any type the upload didn't cover is fetched now.
        if (!uploaded.some((c) => c?.type === "expense")) void ensureCategories("expense");
        if (!uploaded.some((c) => c?.type === "income")) void ensureCategories("income");

        toast.success(
          `${bankTransactions.length} processed — ${matched} matched, ${unmatched} unmatched`,
        );
      } else {
        toast.error(response.error || "Failed to process CSV");
      }
    } catch {
      toast.error("Failed to pick or process CSV file");
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleUpdateReconcileItem = (
    key: string,
    field: keyof ReconcileTransaction,
    value: any,
  ) => {
    updateReconcileRow(key, (row) => {
      // Any edit clears the card's last error; it is re-checked on Create.
      const updated: ReconcileTransaction = { ...row, [field]: value, rowError: undefined };
      if (field === "type" && value !== row.type) {
        // A category only fits its own type: an expense pick can't stay on income.
        updated.category_id = undefined;
        updated.subcategory_id = undefined;
      }
      if (field === "category_id") {
        updated.subcategory_id = undefined;
      }
      return updated;
    });
    if (field === "type" && value) void ensureCategories(value);
  };

  /**
   * Refuses a card that isn't ready, and says why ON the card: with Android's
   * "pan" keyboard mode the toast at the top can be off screen (QA AE-120).
   */
  const flagProblem = (key: string, problem: string) => {
    Keyboard.dismiss();
    updateReconcileRow(key, (row) => ({ ...row, rowError: problem }));
    toast.error(problem);
  };

  const toBulkRow = (tx: ReconcileTransaction) => {
    const merchant = tx.merchant_name.trim();
    const description = tx.description?.trim();
    return {
      merchant_name: merchant,
      // Becomes the transaction's description and its item line.
      description: description || merchant,
      amount: getReconcileAmount(tx),
      type: tx.type,
      date: tx.date,
      category_id: tx.category_id,
      subcategory_id: tx.subcategory_id,
      payment_method: accountId,
      notes: tx.notes,
    };
  };

  const handleSaveSingle = async (key: string) => {
    const tx = reconcileData.find((row) => row.key === key);
    if (!tx) return;
    const problem = reconcileProblem(tx);
    if (problem) {
      flagProblem(key, problem);
      return;
    }

    setSavingKey(key);
    try {
      const result = await transactionService.bulkCreate([toBulkRow(tx) as any]);

      if (result.success) {
        // Remove saved transaction from list
        removeReconcileRow(key);
        if (tx.isMatched) {
          setMatchedCount((prev) => Math.max(0, prev - 1));
        } else {
          setUnmatchedCount((prev) => Math.max(0, prev - 1));
        }
        // The account's Current Balance, Home, Activity and Reports all
        // change with it (QA AE-98).
        void invalidateMoneyQueries(queryClient);
        toast.success("Transaction saved");
      } else {
        const message = formatApiError(result);
        updateReconcileRow(key, (row) => ({ ...row, rowError: message }));
        toast.error(message || "Failed to save transaction");
      }
    } catch {
      toast.error("Failed to save transaction");
    } finally {
      setSavingKey(null);
    }
  };

  const handleSkipTransaction = (key: string) => {
    const tx = reconcileData.find((row) => row.key === key);
    if (!tx) return;
    removeReconcileRow(key);
    if (tx.isMatched) {
      setMatchedCount((prev) => Math.max(0, prev - 1));
    } else {
      setUnmatchedCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleConfirmCreateAnyway = () => {
    const key = createAnywayKey;
    setCreateAnywayKey(null);
    if (key) void handleSaveSingle(key);
  };

  const handleSaveAll = async () => {
    // Matched cards are already in the ledger; Save All never re-creates them.
    const unmatchedTx = reconcileData.filter((tx) => !tx.isMatched);

    const problems = new Map<string, string>();
    unmatchedTx.forEach((tx) => {
      const problem = reconcileProblem(tx);
      if (problem) problems.set(tx.key, problem);
    });

    if (problems.size > 0) {
      Keyboard.dismiss();
      setReconcileData((prev) =>
        prev.map((row) =>
          problems.has(row.key) ? { ...row, rowError: problems.get(row.key) } : row,
        ),
      );
      toast.error(
        problems.size === 1
          ? "One card still needs details — it's marked in red."
          : `${problems.size} cards still need details — they're marked in red.`,
      );
      return;
    }

    setSavingAll(true);
    try {
      const transactions = unmatchedTx.map(toBulkRow);

      const result = await transactionService.bulkCreate(transactions as any);

      if (result.success) {
        setReconcileData([]);
        setMatchedCount(0);
        setUnmatchedCount(0);
        void invalidateMoneyQueries(queryClient);
        toast.success(
          `${transactions.length} ${transactions.length === 1 ? "transaction" : "transactions"} saved`,
        );
      } else {
        toast.error(formatApiError(result) || "Failed to save transactions");
      }
    } catch {
      toast.error("Failed to save transactions");
    } finally {
      setSavingAll(false);
    }
  };

  const handleClearReconcile = () => {
    Keyboard.dismiss();
    setShowClearReconcile(true);
  };

  const handleConfirmClearReconcile = () => {
    setReconcileData([]);
    setMatchedCount(0);
    setUnmatchedCount(0);
    setShowClearReconcile(false);
  };

  if (accountLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <BrandedHeader title="Account" subtitle="Account details" showBack />
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={64}
            color={colors.onSurfaceVariant}
          />
          <Text
            variant="bodyLarge"
            style={{ color: colors.onSurfaceVariant, marginTop: 16 }}
          >
            Account not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const accountBalance =
    Number(account.current_balance) || Number(account.balance) || 0;
  const openingBalance = Number(account.opening_balance ?? 0) || 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <BrandedHeader
        title={account.account_name}
        subtitle={account.type || account.account_type || "Account"}
        showBack
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setDefaultMutation.mutate()}
              disabled={!!account.is_default || setDefaultMutation.isPending}
              style={styles.deleteButton}
              hitSlop={8}
              accessibilityLabel={
                account.is_default
                  ? "Default account"
                  : "Set as default account"
              }
            >
              <Star
                size={22}
                color={
                  account.is_default ? colors.primary : colors.onSurfaceVariant
                }
                fill={account.is_default ? colors.primary : "transparent"}
                strokeWidth={2.2}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteButton}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={24}
                color={colors.error}
              />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Balance Card */}
      <HeroCard style={styles.balanceCard}>
        <View style={styles.balanceTopRow}>
          <View style={styles.balanceIcon}>
            <Wallet size={22} color="#ffffff" strokeWidth={2.2} />
          </View>
          <View style={styles.balanceTopText}>
            <Text style={styles.balanceLabelHero}>Current Balance</Text>
            <Text style={styles.balanceValueHero}>
              {formatAmount(accountBalance)}
            </Text>
            <Text style={styles.openingLabelHero} numberOfLines={1}>
              Opening {formatAmount(openingBalance)}
            </Text>
          </View>
        </View>
      </HeroCard>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.surfaceVariant }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "transactions" && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("transactions")}
        >
          <MaterialCommunityIcons
            name="format-list-bulleted"
            size={20}
            color={
              activeTab === "transactions"
                ? colors.primary
                : colors.onSurfaceVariant
            }
          />
          <Text
            style={{
              color:
                activeTab === "transactions"
                  ? colors.primary
                  : colors.onSurfaceVariant,
              fontWeight: activeTab === "transactions" ? "600" : "400",
              marginLeft: 6,
            }}
          >
            Transactions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "reconcile" && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("reconcile")}
        >
          <MaterialCommunityIcons
            name="check-decagram"
            size={20}
            color={
              activeTab === "reconcile"
                ? colors.primary
                : colors.onSurfaceVariant
            }
          />
          <Text
            style={{
              color:
                activeTab === "reconcile"
                  ? colors.primary
                  : colors.onSurfaceVariant,
              fontWeight: activeTab === "reconcile" ? "600" : "400",
              marginLeft: 6,
            }}
          >
            Reconcile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "edit" && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("edit")}
        >
          <MaterialCommunityIcons
            name="pencil"
            size={20}
            color={
              activeTab === "edit" ? colors.primary : colors.onSurfaceVariant
            }
          />
          <Text
            style={{
              color:
                activeTab === "edit" ? colors.primary : colors.onSurfaceVariant,
              fontWeight: activeTab === "edit" ? "600" : "400",
              marginLeft: 6,
            }}
          >
            Edit
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === "transactions" && (
        <View style={{ flex: 1 }}>
          {transactionsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={transactionsList}
              keyExtractor={(item: Transaction) => String(item.id)}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingTop: 12,
                paddingBottom: 32,
              }}
              refreshControl={
                <RefreshControl
                  refreshing={pullRefreshing}
                  onRefresh={handlePullRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              ListHeaderComponent={() => (
                <View style={styles.summaryCards}>
                  <Surface
                    style={[
                      styles.summaryCard,
                      { backgroundColor: colors.surface },
                    ]}
                    elevation={1}
                  >
                    <View
                      style={[
                        styles.summaryIcon,
                        { backgroundColor: `${colors.tertiary}15` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="arrow-down"
                        size={18}
                        color={colors.tertiary}
                      />
                    </View>
                    <Text
                      variant="titleSmall"
                      style={{ color: colors.tertiary, fontWeight: "bold" }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatAmount(totalIncome)}
                    </Text>
                    <Text
                      variant="labelSmall"
                      style={{ color: colors.onSurfaceVariant }}
                    >
                      Income
                    </Text>
                  </Surface>

                  <Surface
                    style={[
                      styles.summaryCard,
                      { backgroundColor: colors.surface },
                    ]}
                    elevation={1}
                  >
                    <View
                      style={[
                        styles.summaryIcon,
                        { backgroundColor: `${colors.error}15` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="arrow-up"
                        size={18}
                        color={colors.error}
                      />
                    </View>
                    <Text
                      variant="titleSmall"
                      style={{ color: colors.error, fontWeight: "bold" }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatAmount(totalExpenses)}
                    </Text>
                    <Text
                      variant="labelSmall"
                      style={{ color: colors.onSurfaceVariant }}
                    >
                      Expenses
                    </Text>
                  </Surface>

                  <Surface
                    style={[
                      styles.summaryCard,
                      { backgroundColor: colors.surface },
                    ]}
                    elevation={1}
                  >
                    <View
                      style={[
                        styles.summaryIcon,
                        { backgroundColor: `${colors.primary}15` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="scale-balance"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <Text
                      variant="titleSmall"
                      style={{
                        color: netAmount >= 0 ? colors.tertiary : colors.error,
                        fontWeight: "bold",
                      }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatAmount(Math.abs(netAmount))}
                    </Text>
                    <Text
                      variant="labelSmall"
                      style={{ color: colors.onSurfaceVariant }}
                    >
                      {netAmount >= 0 ? "Net Income" : "Net Expense"}
                    </Text>
                  </Surface>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="receipt"
                    size={64}
                    color={colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodyLarge"
                    style={{ color: colors.onSurfaceVariant, marginTop: 16 }}
                  >
                    No transactions yet
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{
                      color: colors.onSurfaceVariant,
                      textAlign: "center",
                    }}
                  >
                    Transactions for this account will appear here
                  </Text>
                </View>
              )}
              renderItem={({ item }: { item: Transaction }) => {
                const txType = item.type || "expense";
                const iconColor = getTransactionColor(txType);
                const merchantName =
                  item.merchant_name || item.description || "Transaction";
                // Get category name from transaction_categories pivot table like web version
                const transactionCategories = (item as any)
                  .transaction_categories;
                const categoryName =
                  transactionCategories && transactionCategories.length > 0
                    ? transactionCategories
                        .map((ec: any) => ec.category?.name || "")
                        .filter(Boolean)
                        .join(", ")
                    : (item as any).category_name ||
                      (item as any).category ||
                      "";
                const txDate = formatDate(
                  item.date || (item as any).transaction_date || "",
                );

                return (
                  <Swipeable
                    ref={(row) => {
                      if (row) swipeRefs.current.set(item.id, row);
                      else swipeRefs.current.delete(item.id);
                    }}
                    renderRightActions={() => renderTxActions(item)}
                    rightThreshold={TX_ACTION_WIDTH * 0.35}
                    overshootRight={false}
                    friction={1}
                    onSwipeableWillOpen={() => handleRowWillOpen(item.id)}
                    onSwipeableClose={() => {
                      if (openRowId.current === item.id)
                        openRowId.current = null;
                    }}
                    containerStyle={[
                      styles.txSwipeContainer,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Pressable
                      onPress={() => handleRowPress(item)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    >
                      <Surface
                        style={[
                          styles.transactionItem,
                          { backgroundColor: colors.surface },
                        ]}
                        elevation={1}
                      >
                        <View
                          style={[
                            styles.txIcon,
                            { backgroundColor: `${iconColor}15` },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={getTransactionIcon(txType) as any}
                            size={20}
                            color={iconColor}
                          />
                        </View>
                        <View style={styles.txInfo}>
                          <Text
                            variant="bodyLarge"
                            style={{ color: colors.onSurface }}
                            numberOfLines={1}
                          >
                            {merchantName}
                          </Text>
                          <Text
                            variant="bodySmall"
                            style={{ color: colors.onSurfaceVariant }}
                          >
                            {txDate}
                          </Text>
                          {categoryName ? (
                            <View
                              style={[
                                styles.categoryBadge,
                                {
                                  backgroundColor: `${iconColor}15`,
                                  marginTop: 2,
                                },
                              ]}
                            >
                              <Text style={{ color: iconColor, fontSize: 10 }}>
                                {categoryName}
                              </Text>
                            </View>
                          ) : null}
                          {item.notes ? (
                            <Text
                              variant="bodySmall"
                              style={{
                                color: colors.onSurfaceVariant,
                                fontSize: 10,
                                marginTop: 2,
                              }}
                              numberOfLines={1}
                            >
                              {item.notes}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.txAmount}>
                          <Text
                            variant="titleMedium"
                            style={{
                              color:
                                txType === "income" || txType === "asset"
                                  ? colors.tertiary
                                  : txType === "transfer"
                                    ? colors.primary
                                    : colors.error,
                              fontWeight: "600",
                            }}
                            numberOfLines={1}
                          >
                            {getAmountSign(item)}
                            {formatAmount(Number(item.amount) || 0)}
                          </Text>
                        </View>
                      </Surface>
                    </Pressable>
                  </Swipeable>
                );
              }}
            />
          )}
        </View>
      )}

      {activeTab === "reconcile" && (
        <View style={{ flex: 1 }}>
          {reconcileData.length === 0 ? (
            <ScrollView contentContainerStyle={styles.tabContent}>
              {/* Upload Section */}
              <Surface
                style={[
                  styles.reconcileCard,
                  { backgroundColor: colors.surface },
                ]}
                elevation={1}
              >
                <View
                  style={[
                    styles.reconcileIconBadge,
                    { backgroundColor: colors.primaryContainer },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="file-upload-outline"
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <Text
                  variant="titleLarge"
                  style={{
                    color: colors.onSurface,
                    marginTop: 16,
                    fontWeight: "700",
                  }}
                >
                  Upload Bank Statement
                </Text>
                <Text
                  variant="bodySmall"
                  style={{
                    color: colors.onSurfaceVariant,
                    textAlign: "center",
                    marginTop: 6,
                    lineHeight: 18,
                  }}
                >
                  Upload a CSV file from your bank to match transactions with
                  your records
                </Text>

                <View
                  style={[
                    styles.reconcileBalancePill,
                    { backgroundColor: colors.surfaceVariant },
                  ]}
                >
                  <Text
                    variant="labelMedium"
                    style={{
                      color: colors.onSurfaceVariant,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    Account Balance
                  </Text>
                  <Text
                    variant="titleMedium"
                    style={{ color: colors.onSurface, fontWeight: "700" }}
                  >
                    {formatAmount(accountBalance)}
                  </Text>
                </View>

                <Button
                  mode="contained"
                  icon="upload"
                  onPress={handlePickCsv}
                  loading={isProcessingCsv}
                  disabled={isProcessingCsv}
                  style={{ marginTop: 16, width: "100%" }}
                >
                  {isProcessingCsv ? "Processing..." : "Choose CSV File"}
                </Button>

                <View style={styles.reconcileRequirements}>
                  <Text
                    variant="labelMedium"
                    style={{
                      color: colors.onSurface,
                      marginBottom: 10,
                      fontWeight: "700",
                      letterSpacing: 0.3,
                      textTransform: "uppercase",
                      fontSize: 11,
                    }}
                  >
                    CSV Format Required
                  </Text>
                  {[
                    "Date, Description, Amount, Type, Payee, Reference",
                    "Date format: YYYY-MM-DD",
                    "Type: income, expense, or transfer",
                  ].map((line) => (
                    <View key={line} style={styles.reconcileBulletRow}>
                      <Text
                        style={[
                          styles.reconcileBullet,
                          { color: colors.primary },
                        ]}
                      >
                        {"•"}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{
                          color: colors.onSurfaceVariant,
                          flex: 1,
                          lineHeight: 18,
                        }}
                      >
                        {line}
                      </Text>
                    </View>
                  ))}
                </View>
              </Surface>
            </ScrollView>
          ) : (
            <FlatList
              data={reconcileData}
              // Stable per-row keys: index keys remounted every card below a
              // created / skipped one, so their field labels flashed (AE-117).
              keyExtractor={(item) => item.key}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingTop: 12,
                paddingBottom: 100,
              }}
              // iOS has no window pan: inset the list by the keyboard and
              // scroll the focused field above it (no-op on Android).
              automaticallyAdjustKeyboardInsets
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              // An element, not an inline component, so the header isn't
              // remounted on every keystroke.
              ListHeaderComponent={
                <View style={{ marginBottom: 16 }}>
                  {/* Summary Cards */}
                  <View style={styles.reconcileSummary}>
                    <Surface
                      style={[
                        styles.reconcileSummaryCard,
                        { backgroundColor: colors.tertiary },
                      ]}
                      elevation={1}
                    >
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={24}
                        color="#fff"
                      />
                      <Text
                        variant="titleLarge"
                        style={{ color: "#fff", fontWeight: "bold" }}
                      >
                        {matchedCount}
                      </Text>
                      <Text variant="labelSmall" style={{ color: "#fff" }}>
                        Matched
                      </Text>
                    </Surface>
                    <Surface
                      style={[
                        styles.reconcileSummaryCard,
                        { backgroundColor: colors.error },
                      ]}
                      elevation={1}
                    >
                      <MaterialCommunityIcons
                        name="alert-circle"
                        size={24}
                        color="#fff"
                      />
                      <Text
                        variant="titleLarge"
                        style={{ color: "#fff", fontWeight: "bold" }}
                      >
                        {unmatchedCount}
                      </Text>
                      <Text variant="labelSmall" style={{ color: "#fff" }}>
                        Unmatched
                      </Text>
                    </Surface>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.reconcileActions}>
                    <Button
                      mode="contained"
                      icon="content-save-all"
                      onPress={handleSaveAll}
                      loading={savingAll}
                      disabled={savingAll || unmatchedCount === 0}
                      style={{ flex: 1 }}
                    >
                      Save All ({unmatchedCount})
                    </Button>
                    <Button
                      mode="outlined"
                      icon="close"
                      onPress={handleClearReconcile}
                      disabled={savingAll}
                      style={{ marginLeft: 8 }}
                    >
                      Clear
                    </Button>
                  </View>

                  <Button
                    mode="text"
                    icon="plus"
                    onPress={handlePickCsv}
                    disabled={isProcessingCsv}
                    style={{ marginTop: 8 }}
                  >
                    Add More CSV Data
                  </Button>
                </View>
              }
              renderItem={({ item }) => {
                const isProcessing = savingKey === item.key;
                const typeCategories: any[] = categoriesByType[item.type] || [];
                // The picked category first, so an AI / rule pick is visible
                // without scrolling the chip row.
                const selectedCategory = typeCategories.find(
                  (cat) => Number(cat.id) === Number(item.category_id),
                );
                const orderedCategories = selectedCategory
                  ? [
                      selectedCategory,
                      ...typeCategories.filter((cat) => cat !== selectedCategory),
                    ]
                  : typeCategories;
                const selectedSubcategoryName = selectedCategory
                  ? (Array.isArray(selectedCategory.subcategories)
                      ? selectedCategory.subcategories
                      : []
                    ).find(
                      (sub: any) => Number(sub.id) === Number(item.subcategory_id),
                    )?.name
                  : undefined;

                return (
                  <Surface
                    style={[
                      styles.reconcileItem,
                      { backgroundColor: colors.surface },
                      !!item.rowError && {
                        borderWidth: 1,
                        borderColor: colors.error,
                      },
                    ]}
                    elevation={1}
                  >
                    {/* Status Badge */}
                    <View
                      style={[
                        styles.reconcileStatusBadge,
                        {
                          backgroundColor: item.isMatched
                            ? `${colors.tertiary}15`
                            : `${colors.error}15`,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={item.isMatched ? "check-circle" : "alert-circle"}
                        size={16}
                        color={item.isMatched ? colors.tertiary : colors.error}
                      />
                      <Text
                        style={{
                          color: item.isMatched
                            ? colors.tertiary
                            : colors.error,
                          fontSize: 10,
                          marginLeft: 4,
                        }}
                      >
                        {item.isMatched ? "Matched" : "Unmatched"}
                      </Text>
                    </View>

                    {/* What it matched, before anything can be done with it. */}
                    {item.isMatched && item.matchedData && (
                      <View
                        style={[
                          styles.matchedInfo,
                          { backgroundColor: `${colors.tertiary}10`, marginTop: 0, marginBottom: 8 },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={14}
                          color={colors.tertiary}
                        />
                        <Text
                          variant="bodySmall"
                          style={{
                            color: colors.tertiary,
                            marginLeft: 6,
                            flex: 1,
                          }}
                        >
                          Already in this account: {item.matchedData.merchant_name} -{" "}
                          {formatAmount(Number(item.matchedData.amount))} on{" "}
                          {formatDate(item.matchedData.date || "")}
                        </Text>
                      </View>
                    )}

                    {/* Transaction Info */}
                    <View style={styles.reconcileItemHeader}>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          label="Merchant"
                          value={item.merchant_name}
                          onChangeText={(text) =>
                            handleUpdateReconcileItem(
                              item.key,
                              "merchant_name",
                              text,
                            )
                          }
                          mode="outlined"
                          dense
                          style={styles.reconcileInput}
                        />
                      </View>
                      <View style={{ width: 100, marginLeft: 8 }}>
                        <TextInput
                          label="Amount"
                          // Keep the text as typed: storing parseFloat(text)
                          // ate a trailing '.' and made cents impossible.
                          value={item.amountText ?? String(item.amount)}
                          onChangeText={(text) =>
                            handleUpdateReconcileItem(
                              item.key,
                              "amountText",
                              toDecimalInput(text),
                            )
                          }
                          mode="outlined"
                          dense
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                          style={styles.reconcileInput}
                        />
                      </View>
                    </View>

                    {/* The statement's Description (QA AE-125): what the money
                        was for, saved as the transaction's description. */}
                    <TextInput
                      label="Description"
                      value={item.description || ""}
                      onChangeText={(text) =>
                        handleUpdateReconcileItem(item.key, "description", text)
                      }
                      mode="outlined"
                      dense
                      placeholder="What it was for"
                      style={[styles.reconcileInput, { marginTop: 8 }]}
                    />

                    <View style={styles.reconcileItemRow}>
                      <View style={{ flex: 1 }}>
                        <DateField
                          label="Date"
                          value={item.date?.split("T")[0] || ""}
                          onChange={(date) =>
                            handleUpdateReconcileItem(item.key, "date", date)
                          }
                          dense
                          style={styles.reconcileInput}
                        />
                      </View>
                      <View style={{ width: 110, marginLeft: 8 }}>
                        <Text
                          variant="labelSmall"
                          style={{
                            color: colors.onSurfaceVariant,
                            marginBottom: 4,
                          }}
                        >
                          Type
                        </Text>
                        <View style={styles.typeSelector}>
                          {["income", "expense"].map((type) => (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.typeSelectorBtn,
                                {
                                  backgroundColor:
                                    item.type === type
                                      ? type === "income"
                                        ? colors.tertiary
                                        : colors.error
                                      : colors.surfaceVariant,
                                },
                              ]}
                              onPress={() =>
                                handleUpdateReconcileItem(item.key, "type", type)
                              }
                            >
                              <Text
                                style={{
                                  color:
                                    item.type === type
                                      ? "#fff"
                                      : colors.onSurfaceVariant,
                                  fontSize: 10,
                                }}
                              >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>

                    {/* Category Selector — this card's own type list. */}
                    {item.type !== "transfer" && (
                      <View style={{ marginTop: 8 }}>
                        <Text
                          variant="labelSmall"
                          style={{
                            color:
                              item.rowError && !item.category_id
                                ? colors.error
                                : colors.onSurfaceVariant,
                            marginBottom: 4,
                          }}
                        >
                          Category *
                        </Text>
                        {typeCategories.length === 0 ? (
                          <Text
                            variant="bodySmall"
                            style={{ color: colors.onSurfaceVariant }}
                          >
                            {categoriesByType[item.type]
                              ? `No ${item.type} categories yet — add one under More → Categories.`
                              : "Loading categories…"}
                          </Text>
                        ) : (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                          >
                            <View style={{ flexDirection: "row", gap: 6 }}>
                              {orderedCategories.map((cat) => {
                                const selected =
                                  Number(item.category_id) === Number(cat.id);
                                return (
                                  <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                      styles.categoryChip,
                                      {
                                        backgroundColor: selected
                                          ? colors.primary
                                          : colors.surfaceVariant,
                                      },
                                    ]}
                                    onPress={() =>
                                      handleUpdateReconcileItem(
                                        item.key,
                                        "category_id",
                                        Number(cat.id),
                                      )
                                    }
                                  >
                                    <Text
                                      style={{
                                        color: selected
                                          ? "#fff"
                                          : colors.onSurfaceVariant,
                                        fontSize: 11,
                                      }}
                                    >
                                      {selected && selectedSubcategoryName
                                        ? `${cat.name} › ${selectedSubcategoryName}`
                                        : cat.name}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </ScrollView>
                        )}
                      </View>
                    )}

                    {/* Notes */}
                    <TextInput
                      label="Notes"
                      value={item.notes || ""}
                      onChangeText={(text) =>
                        handleUpdateReconcileItem(item.key, "notes", text)
                      }
                      mode="outlined"
                      dense
                      style={[styles.reconcileInput, { marginTop: 8 }]}
                    />

                    {/* Why Create was refused — on the card, where it can't be
                        missed (QA AE-120). */}
                    {!!item.rowError && (
                      <View style={styles.reconcileRowError}>
                        <MaterialCommunityIcons
                          name="alert-circle-outline"
                          size={16}
                          color={colors.error}
                        />
                        <Text
                          variant="bodySmall"
                          style={{ color: colors.error, marginLeft: 6, flex: 1 }}
                        >
                          {item.rowError}
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons. A matched line is already in the
                        ledger: Confirm Match only; creating it again asks
                        first (QA AE-55). */}
                    {item.isMatched ? (
                      <>
                        <View style={styles.reconcileItemActions}>
                          <Button
                            mode="contained"
                            icon="check"
                            onPress={() => handleSkipTransaction(item.key)}
                            disabled={isProcessing || savingAll}
                            style={{ flex: 1 }}
                            compact
                          >
                            Confirm Match
                          </Button>
                        </View>
                        <Button
                          mode="text"
                          onPress={() => {
                            Keyboard.dismiss();
                            setCreateAnywayKey(item.key);
                          }}
                          loading={isProcessing}
                          disabled={isProcessing || savingAll}
                          compact
                          style={{ marginTop: 4, alignSelf: "center" }}
                        >
                          Not the same? Create a new transaction
                        </Button>
                      </>
                    ) : (
                      <View style={styles.reconcileItemActions}>
                        <Button
                          mode="contained"
                          onPress={() => handleSaveSingle(item.key)}
                          loading={isProcessing}
                          disabled={isProcessing || savingAll}
                          style={{ flex: 1 }}
                          compact
                        >
                          Create
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={() => handleSkipTransaction(item.key)}
                          disabled={isProcessing || savingAll}
                          style={{ marginLeft: 8 }}
                          compact
                        >
                          Skip
                        </Button>
                      </View>
                    )}
                  </Surface>
                );
              }}
            />
          )}
        </View>
      )}

      {activeTab === "edit" && (
        <ScrollView
          contentContainerStyle={styles.tabContent}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Surface
            style={[styles.editCard, { backgroundColor: colors.surface }]}
            elevation={1}
          >
            <TextInput
              label="Account Name"
              value={formData.account_name}
              onChangeText={(text) =>
                setFormData({ ...formData, account_name: text })
              }
              mode="outlined"
              style={styles.input}
            />

            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}
            >
              Account Type
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ marginBottom: 16 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {accountTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor:
                        formData.account_type === option.value
                          ? colors.primary
                          : colors.surfaceVariant,
                    },
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, account_type: option.value })
                  }
                >
                  <Text
                    style={{
                      color:
                        formData.account_type === option.value
                          ? "#fff"
                          : colors.onSurfaceVariant,
                      fontSize: 12,
                      fontWeight: "500",
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              label="Current Balance"
              value={formData.balance}
              onChangeText={(text) =>
                setFormData({ ...formData, balance: text })
              }
              mode="outlined"
              keyboardType="decimal-pad"
              returnKeyType="done"
              style={styles.input}
            />

            <View style={styles.editButtons}>
              <Button
                mode="outlined"
                icon="delete-outline"
                onPress={handleDelete}
                textColor={colors.error}
                style={{ flex: 1, borderColor: colors.error }}
              >
                Delete
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={updateMutation.isPending}
                style={{ flex: 1 }}
              >
                Save changes
              </Button>
            </View>
          </Surface>
        </ScrollView>
      )}

      <TransactionDetailsSheet
        visible={!!detailTransaction}
        transaction={detailTransaction}
        onClose={() => setDetailTransaction(null)}
        onEdit={handleEditTransaction}
        onDelete={handleArchiveTransaction}
        deleteLabel="Archive"
      />

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete account?"
        message={`"${account?.account_name ?? "This account"}" will be permanently removed. This action cannot be undone.`}
        icon={TriangleAlert}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
      />

      <ConfirmDialog
        visible={!!archiveTarget}
        title="Archive transaction?"
        message={`"${archiveTarget?.merchant_name || archiveTarget?.description || "This transaction"}" will move to Archived. You can restore it from Transactions → Archived.`}
        icon={Archive}
        confirmLabel="Archive"
        onCancel={() => setArchiveTarget(null)}
        onConfirm={handleConfirmArchive}
      />

      <ConfirmDialog
        visible={showClearReconcile}
        title="Clear reconciliation?"
        message="All imported statement rows and match results will be cleared. Saved transactions are not affected."
        icon={Eraser}
        confirmLabel="Clear all"
        onCancel={() => setShowClearReconcile(false)}
        onConfirm={handleConfirmClearReconcile}
      />

      {/* A matched line is already in the ledger; creating it again would
          count the money twice unless it really is a second transaction. */}
      <ConfirmDialog
        visible={!!createAnywayKey}
        title="Create a second transaction?"
        message={(() => {
          const row = reconcileData.find((r) => r.key === createAnywayKey);
          const match = row?.matchedData;
          return match
            ? `This line matches ${match.merchant_name || "a transaction"} (${formatAmount(Number(match.amount) || 0)}) already in this account. Creating it adds another transaction and changes the balance again. Only do this if it's a different payment.`
            : "This line matches a transaction already in this account. Creating it adds another one and changes the balance again.";
        })()}
        icon={TriangleAlert}
        confirmLabel="Create anyway"
        onCancel={() => setCreateAnywayKey(null)}
        onConfirm={handleConfirmCreateAnyway}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteButton: {
    padding: 4,
  },
  title: {
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  balanceCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  balanceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  balanceIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceTopText: {
    flexShrink: 1,
    minWidth: 0,
    alignItems: "flex-end",
    gap: 2,
  },
  balanceLabelHero: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  balanceValueHero: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  openingLabelHero: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11.5,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  tabContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 12,
    // Square on purpose: the swipe container below does the rounding and
    // clips both the row and the actions (Transactions tab parity). A rounded
    // row left see-through notches beside Edit while swiped.
    borderRadius: 0,
  },
  // Same corner radius as the Transactions tab's row card (Card radiusSize
  // "xl"), so the Edit/Archive swipe actions look identical on both screens.
  txSwipeContainer: {
    marginBottom: 8,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  txActions: {
    width: TX_ACTION_WIDTH,
    flexDirection: "row",
  },
  txAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  txActionLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "center",
    includeFontPadding: false,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txAmount: {
    alignItems: "flex-end",
  },
  reconcileCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
  },
  reconcileIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  reconcileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  reconcileBalancePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
  },
  reconcileRequirements: {
    marginTop: 20,
    width: "100%",
  },
  reconcileBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  reconcileBullet: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 1,
  },
  editCard: {
    padding: 20,
    borderRadius: 16,
  },
  input: {
    marginBottom: 16,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  summaryCards: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Reconcile styles
  reconcileSummary: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  reconcileSummaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  reconcileActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  reconcileItem: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  reconcileStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  reconcileItemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  reconcileItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  reconcileInput: {
    backgroundColor: "transparent",
  },
  typeSelector: {
    flexDirection: "row",
    gap: 4,
  },
  typeSelectorBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reconcileItemActions: {
    flexDirection: "row",
    marginTop: 12,
  },
  matchedInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  reconcileRowError: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
});
